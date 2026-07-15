/**
 * AstroKalki — Real-time availability mini-service.
 *
 * A standalone socket.io service that broadcasts AstroKalki's live
 * availability state to every connected client. Admin can toggle the state
 * via:
 *   • HTTP POST /admin/state  (Bearer <ADMIN_SECRET> / CRON_SECRET)
 *   • socket.io `state:update` event (payload includes the secret token)
 *
 * Frontend clients connect via the gateway using:
 *     io("/?XTransformPort=3003")
 *
 * The socket.io path is `/` (required for Caddy XTransformPort routing).
 * Because `path: "/"` makes socket.io's request listener intercept every
 * URL, we wrap it with a dispatcher that defers to socket.io ONLY for
 * genuine Engine.IO handshakes and routes everything else to our HTTP
 * handler (health, GET /state, POST /admin/state).
 *
 * State shape (canonical, M3-d v2):
 *   {
 *     status: 'available' | 'in-session' | 'away',
 *     message: string,                 // free-form admin message
 *     nextOpening: string | null,      // ISO datetime of next opening
 *     updatedAt: number,               // ms epoch
 *     // Backward-compat aliases (kept so older clients keep working):
 *     nextSlot: string | null,         // alias of nextOpening
 *     currentSessionEnds: string | null,
 *   }
 *
 * Events:
 *   • state:sync    — server → client (current state, on connect + on change)
 *   • state-change  — server → client (alias of state:sync; legacy)
 *   • state:request — client → server (request current state; server replies state:sync)
 *   • state:update  — client → server (admin-only, payload { token, status?, message?, nextOpening? })
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server, Socket } from "socket.io";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Load .env from the project root ────────────────────────────────
// The mini-service runs from mini-services/availability/, but the env
// vars (CRON_SECRET, etc.) live in /home/z/my-project/.env. Bun only
// auto-loads .env files from the current working directory, so we read
// the project-root .env manually here. Already-set process.env values
// win (so explicit env on the command line takes precedence).
try {
  const here = typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, "..", "..", ".env");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
  console.log(`[availability] loaded env from ${envPath}`);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[availability] could not load .env: ${msg}`);
}

// ─── Port ───────────────────────────────────────────────────────────
// Default 3003 (per spec). Allow AVAILABILITY_PORT to override so the
// gateway can pick a different port if 3003 is taken in some envs.
const PORT = (() => {
  const envPort = parseInt(process.env.AVAILABILITY_PORT || "", 10);
  if (Number.isFinite(envPort) && envPort > 0 && envPort < 65536) {
    return envPort;
  }
  return 3003;
})();

// Admin secret — accepts either ADMIN_SECRET (preferred) or CRON_SECRET
// (legacy/compat). Used to authenticate /admin/state POST and the
// socket.io `state:update` event.
const ADMIN_SECRET =
  process.env.ADMIN_SECRET || process.env.CRON_SECRET || "";

// ─── Allowed origins ────────────────────────────────────────────────
// ALLOWED_ORIGINS env = comma-separated list of allowed origins. Defaults
// to localhost:3000 (dev) + astrokalki.com (prod). Preview branches on
// space-z.ai are always allowed via regex.
const STATIC_ORIGINS = new Set<string>([
  "http://localhost:3000",
  "https://astrokalki.com",
  "https://www.astrokalki.com",
]);
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
for (const o of EXTRA_ORIGINS) STATIC_ORIGINS.add(o);

const PREVIEW_ORIGIN_RE = /^https:\/\/preview-[^/]+\.space-z\.ai$/;

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / server-to-server (no Origin header)
  if (STATIC_ORIGINS.has(origin)) return true;
  if (PREVIEW_ORIGIN_RE.test(origin)) return true;
  return false;
}

// ─── Types ──────────────────────────────────────────────────────────

export type AvailabilityStatus = "available" | "in-session" | "away";

export interface AvailabilityState {
  status: AvailabilityStatus;
  message: string;
  nextOpening: string | null; // ISO string
  updatedAt: number; // ms epoch
  // Backward-compat aliases (always mirrored from the canonical fields).
  nextSlot: string | null;
  currentSessionEnds: string | null;
}

// ─── Default state ──────────────────────────────────────────────────

function defaultNextOpening(): string {
  // Tomorrow at 10:00 IST = 04:30 UTC.
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  tomorrow.setUTCHours(4, 30, 0, 0);
  return tomorrow.toISOString();
}

let state: AvailabilityState = {
  status: "available",
  message: "Currently accepting new sessions",
  nextOpening: defaultNextOpening(),
  updatedAt: Date.now(),
  nextSlot: null, // will be set below
  currentSessionEnds: null,
};
state.nextSlot = state.nextOpening;

// ─── HTTP helpers ───────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
  });
  res.end(payload);
}

function setCORSHeaders(res: ServerResponse, origin?: string) {
  if (isOriginAllowed(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    else res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveP, rejectP) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 16 * 1024) {
        // Hard 16KB cap to prevent OOM.
        req.destroy();
        rejectP(new Error("body too large"));
      }
    });
    req.on("end", () => resolveP(data));
    req.on("error", rejectP);
  });
}

function isValidStatus(v: unknown): v is AvailabilityStatus {
  return v === "available" || v === "in-session" || v === "away";
}

// ─── State management + broadcasting ────────────────────────────────

function broadcast() {
  // Emit on BOTH the new and legacy event names so any client version
  // receives the update.
  io.emit("state:sync", state);
  io.emit("state-change", state);
}

function applyStateUpdate(update: Partial<AvailabilityState>) {
  state = { ...state, ...update, updatedAt: Date.now() };
  // Keep backward-compat aliases in sync.
  if (update.nextOpening !== undefined) state.nextSlot = state.nextOpening;
  if (update.nextSlot !== undefined && update.nextOpening === undefined) {
    state.nextOpening = state.nextSlot;
  }
  broadcast();
}

// ─── HTTP request handler (health + /state + /admin/state) ──────────

async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const origin = req.headers.origin;
  setCORSHeaders(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "";
  // Strip ?XTransformPort=… (appended by the gateway) before route matching.
  const path = url.split("?", 2)[0];

  // ─── Health / root / state ──────────────────────────────────────
  if (
    (path === "/" || path === "/health" || path === "/state") &&
    req.method === "GET"
  ) {
    sendJson(res, 200, {
      ok: true,
      service: "astrokalki-availability",
      state,
      clients: io.engine.clientsCount,
    });
    return;
  }

  // ─── Admin state update ─────────────────────────────────────────
  if (
    (path === "/admin/state" || path === "/admin/status") &&
    req.method === "POST"
  ) {
    if (!ADMIN_SECRET) {
      console.warn(
        "[availability] /admin/state called but ADMIN_SECRET/CRON_SECRET is unset — refusing"
      );
      sendJson(res, 503, { error: "Admin secret not configured" });
      return;
    }
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token || token !== ADMIN_SECRET) {
      console.warn(
        `[availability] /admin/state unauthorized attempt from ${req.socket.remoteAddress}`
      );
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      const raw = await readBody(req);
      parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const update: Partial<AvailabilityState> = {};

    if (parsed.status !== undefined) {
      if (!isValidStatus(parsed.status)) {
        sendJson(res, 400, {
          error: "status must be 'available' | 'in-session' | 'away'",
        });
        return;
      }
      update.status = parsed.status;
    }

    if (parsed.message !== undefined) {
      if (typeof parsed.message !== "string") {
        sendJson(res, 400, { error: "message must be a string" });
        return;
      }
      // Cap message length — keep it short, this is a one-liner indicator.
      update.message = parsed.message.slice(0, 280);
    }

    if (parsed.nextOpening !== undefined) {
      if (parsed.nextOpening === null || parsed.nextOpening === "") {
        update.nextOpening = null;
      } else if (typeof parsed.nextOpening === "string") {
        const d = new Date(parsed.nextOpening);
        if (isNaN(d.getTime())) {
          sendJson(res, 400, {
            error: "nextOpening must be a valid ISO date",
          });
          return;
        }
        update.nextOpening = d.toISOString();
      } else {
        sendJson(res, 400, { error: "nextOpening must be string | null" });
        return;
      }
    }

    // Legacy aliases still accepted on the wire.
    if (parsed.nextSlot !== undefined && update.nextOpening === undefined) {
      if (parsed.nextSlot === null || parsed.nextSlot === "") {
        update.nextSlot = null;
      } else if (typeof parsed.nextSlot === "string") {
        const d = new Date(parsed.nextSlot);
        if (isNaN(d.getTime())) {
          sendJson(res, 400, { error: "nextSlot must be a valid ISO date" });
          return;
        }
        update.nextSlot = d.toISOString();
      }
    }

    if (parsed.currentSessionEnds !== undefined) {
      if (parsed.currentSessionEnds === null || parsed.currentSessionEnds === "") {
        update.currentSessionEnds = null;
      } else if (typeof parsed.currentSessionEnds === "string") {
        const d = new Date(parsed.currentSessionEnds);
        if (isNaN(d.getTime())) {
          sendJson(res, 400, {
            error: "currentSessionEnds must be a valid ISO date",
          });
          return;
        }
        update.currentSessionEnds = d.toISOString();
      } else {
        sendJson(res, 400, {
          error: "currentSessionEnds must be string | null",
        });
        return;
      }
    }

    if (Object.keys(update).length === 0) {
      sendJson(res, 400, {
        error:
          "No valid fields. Send at least one of: status, message, nextOpening",
      });
      return;
    }

    applyStateUpdate(update);
    console.log("[availability] admin update applied:", update);
    sendJson(res, 200, { ok: true, state });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

// Create the http server with no handler — socket.io will attach its own.
const httpServer = createServer();

// ─── Socket.io server ───────────────────────────────────────────────

const io = new Server(httpServer, {
  // CRITICAL: path MUST be `/` so Caddy can forward via XTransformPort query.
  path: "/",
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, ok?: boolean) => void
    ) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: false,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
});

/**
 * socket.io intercepts every URL when `path: "/"`. We need our HTTP routes
 * (/admin/state, /health, /state, /) to be reachable too, so we wrap
 * socket.io's request listener with a dispatcher that defers to socket.io
 * ONLY for genuine Engine.IO handshakes.
 */
const sioRequestListener = httpServer.listeners("request")[0];
httpServer.removeAllListeners("request");
httpServer.on("request", (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || "";
  const isEngineIo =
    url.includes("EIO=") ||
    url.includes("transport=") ||
    (req.headers.upgrade || "").toLowerCase().includes("websocket");

  if (isEngineIo && sioRequestListener) {
    return (sioRequestListener as (req: IncomingMessage, res: ServerResponse) => void).call(
      httpServer,
      req,
      res
    );
  }
  return handleHttpRequest(req, res);
});

// ─── socket.io event handlers ───────────────────────────────────────

function handleStateUpdateFromSocket(socket: Socket, payload: unknown) {
  // Admin-only: the payload must include the shared secret token.
  if (!ADMIN_SECRET) {
    socket.emit("error", { message: "Admin secret not configured" });
    return;
  }
  if (!payload || typeof payload !== "object") {
    socket.emit("error", { message: "Invalid payload" });
    return;
  }
  const p = payload as Record<string, unknown>;
  const token = typeof p.token === "string" ? p.token : "";

  if (!token || token !== ADMIN_SECRET) {
    console.warn(
      `[availability] socket ${socket.id} attempted state:update with bad token`
    );
    socket.emit("error", { message: "Unauthorized" });
    return;
  }

  const update: Partial<AvailabilityState> = {};
  if (p.status !== undefined && isValidStatus(p.status)) update.status = p.status;
  if (typeof p.message === "string") update.message = p.message.slice(0, 280);
  if (p.nextOpening === null || p.nextOpening === "") {
    update.nextOpening = null;
  } else if (typeof p.nextOpening === "string") {
    const d = new Date(p.nextOpening);
    if (!isNaN(d.getTime())) update.nextOpening = d.toISOString();
  }
  if (p.currentSessionEnds === null || p.currentSessionEnds === "") {
    update.currentSessionEnds = null;
  } else if (typeof p.currentSessionEnds === "string") {
    const d = new Date(p.currentSessionEnds);
    if (!isNaN(d.getTime())) update.currentSessionEnds = d.toISOString();
  }

  if (Object.keys(update).length === 0) {
    socket.emit("error", { message: "No valid fields in update" });
    return;
  }

  applyStateUpdate(update);
  console.log(`[availability] socket admin update from ${socket.id}:`, update);
}

io.on("connection", (socket: Socket) => {
  const total = io.engine.clientsCount;
  console.log(
    `[availability] client connected: ${socket.id} (total: ${total})`
  );

  // Send the current state immediately on connect (both event names for
  // backward compat).
  socket.emit("state:sync", state);
  socket.emit("state-change", state);

  // Client may explicitly request the current state at any time.
  socket.on("state:request", () => {
    socket.emit("state:sync", state);
  });

  // Admin-only update event (token in payload).
  socket.on("state:update", (payload: unknown) => {
    handleStateUpdateFromSocket(socket, payload);
  });

  // Legacy event name (kept so older admin UIs keep working).
  socket.on("state-change", (payload: unknown) => {
    handleStateUpdateFromSocket(socket, payload);
  });

  socket.on("disconnect", (reason) => {
    const remaining = io.engine.clientsCount;
    console.log(
      `[availability] client disconnected: ${socket.id} reason=${reason} (total: ${remaining})`
    );
  });

  socket.on("error", (err: unknown) => {
    console.error(`[availability] socket error (${socket.id}):`, err);
  });
});

// ─── Background next-opening sync (every 5 min) ─────────────────────
// Fetches /api/slots from the main Next.js app (server-to-server, no
// XTransformPort needed) and uses slots[0].start as nextOpening.

async function refreshNextOpening() {
  try {
    const url = "http://localhost:3000/api/slots?duration=60";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout
        ? AbortSignal.timeout(5000)
        : undefined,
    } as RequestInit);

    if (!res.ok) {
      console.warn(
        `[availability] /api/slots returned ${res.status} — keeping current nextOpening`
      );
      return;
    }
    const data: unknown = await res.json();
    const slots = (data as { slots?: Array<{ start?: string }> })?.slots ?? [];
    const nextOpening =
      slots.length > 0 && slots[0]?.start ? slots[0].start : null;

    if (nextOpening !== state.nextOpening) {
      applyStateUpdate({ nextOpening });
      console.log(`[availability] nextOpening refreshed → ${nextOpening}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[availability] next-opening refresh failed: ${msg}`);
  }
}

setTimeout(refreshNextOpening, 5000);
setInterval(refreshNextOpening, 5 * 60 * 1000);

// ─── Boot ───────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Availability service on :${PORT}`);
  console.log(
    `[availability] initial state: status=${state.status} message="${state.message}" nextOpening=${state.nextOpening}`
  );
});

// ─── Graceful shutdown ──────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`[availability] ${signal} received, shutting down…`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[availability] closed");
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
