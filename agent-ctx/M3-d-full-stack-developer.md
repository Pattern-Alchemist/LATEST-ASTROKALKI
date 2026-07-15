# M3-d — Real-time availability WebSocket mini-service

**Agent:** full-stack-developer  
**Task ID:** M3-d  
**Date:** 2026-06-18

## Task restated

Build a socket.io mini-service in `mini-services/availability/` that broadcasts AstroKalki's "in session / available / away" state plus the next available booking slot. Frontend connects via the gateway (`io("/?XTransformPort=3003")`) and shows a small live indicator. The booking.tsx section header gets a thin live-availability line above all steps.

## Files

### Created

1. **`mini-services/availability/package.json`** — exactly per spec: `bun --hot index.ts` dev script, `socket.io ^4.8.3` dep.
2. **`mini-services/availability/index.ts`** — socket.io server on hardcoded port 3003.
3. **`src/hooks/useAvailability.ts`** — React hook returning `{ status, nextSlot, currentSessionEnds, connected }`.
4. **`src/components/astrokalki/availability-indicator.tsx`** — pulsing-dot indicator with Cinzel label + mono time.

### Modified

5. **`src/components/astrokalki/booking.tsx`** — added 1 import + a 5-line header line at the top of the `<section id="booking">` inner container, above step 0. No other restructuring.

## Mini-service architecture

- **Port**: 3003 (hardcoded, never from env).
- **socket.io path**: `/` (required for Caddy XTransformPort routing).
- **State shape**: `{ status: 'available' | 'in-session' | 'away', nextSlot: ISO | null, currentSessionEnds: ISO | null }`.
- **Default state**: `available` + `nextSlot = tomorrow 10:00 IST` (= tomorrow 04:30 UTC).
- **On connect**: emits current state immediately as `state-change`.
- **On state change**: broadcasts `state-change` to all connected clients.
- **Admin HTTP API**: `POST /admin/status` with `Authorization: Bearer <CRON_SECRET>`. Body: `{ status?, nextSlot?, currentSessionEnds? }`. Validates enum + ISO dates. 401 unauthorized, 400 bad input, 503 if CRON_SECRET unset.
- **Health check**: `GET /health` (alias `GET /`) → `{ ok, service, state, clients }`.
- **Background sync**: every 5 min, fetches `http://localhost:3000/api/slots?duration=60` (server-to-server, no XTransformPort) and updates `nextSlot` to `slots[0].start`. Silent fail if the main app is unreachable.
- **CORS**: `http://localhost:3000`, `https://astrokalki.com`, `https://preview-*.space-z.ai` (regex).
- **.env loading**: at boot, reads `../../.env` (relative to script) so `CRON_SECRET` is available without needing `--env-file` flag (the dev script in package.json stays exactly as the task spec requires). Already-set `process.env` values win.

## Critical engineering decision: socket.io path "/" + HTTP routes

With `path: "/"`, socket.io's request listener intercepts EVERY URL — including `/admin/status` and `/health` — returning `{"code":0,"message":"Transport unknown"}` for any non-Engine.IO request. Solved by capturing socket.io's listener after attach and re-adding a dispatcher that defers to socket.io ONLY for genuine Engine.IO handshakes:

```ts
const sioRequestListener = httpServer.listeners("request")[0];
httpServer.removeAllListeners("request");
httpServer.on("request", (req, res) => {
  const url = req.url || "";
  const isEngineIo =
    url.includes("EIO=") ||
    url.includes("transport=") ||
    (req.headers.upgrade || "").toLowerCase().includes("websocket");
  if (isEngineIo && sioRequestListener) {
    return sioRequestListener.call(httpServer, req, res);
  }
  return handleHttpRequest(req, res);
});
```

Also: the gateway appends `?XTransformPort=3003` to every forwarded request, so the HTTP handler strips the query string before matching `/health` and `/admin/status`.

## Frontend wiring

- `useAvailability` hook: connects via `io("/?XTransformPort=3003", { transports:["websocket"], reconnection:true, reconnectionDelay:1000, reconnectionAttempts:5 })`. Subscribes to `connect`/`disconnect`/`state-change`/`connect_error`. Cleans up on unmount.
- `AvailabilityIndicator`: returns `null` when disconnected (no broken UI). Shows pulsing dot (green/gold/muted), Cinzel-uppercase label, optional "Next opening <relative time>" in mono. Two variants: `badge` (nav) and `line` (section header). ARIA `role="status"` + `aria-live="polite"`.
- Booking.tsx: thin live-availability line at the very top of the booking section, above all steps. Visible on every step (0–5). Renders nothing when socket disconnected — booking flow unaffected.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (filtered to my files) | 0 errors |
| `bun run lint` (filtered to my files) | 0 errors |
| Mini-service boots, logs "Availability service on :3003" | ✓ |
| `GET /health` direct (port 3003) | 200 + JSON |
| `GET /health` via gateway (`?XTransformPort=3003`) | 200 + JSON |
| `POST /admin/status` no auth | 401 |
| `POST /admin/status` bogus token | 401 |
| `POST /admin/status` valid CRON_SECRET + in-session | 200 + updated state |
| `POST /admin/status` bad status enum | 400 |
| `POST /admin/status` bad nextSlot | 400 |
| socket.io client → direct localhost:3003 | ✓ connected, received `state-change` |
| socket.io client → gateway `localhost:81/?XTransformPort=3003` | ✓ connected via Caddy, received `state-change` |
| Connection / disconnection logged to console | ✓ |
| Main app still healthy on port 3000 | ✓ (200, 44KB HTML, no errors) |

Pre-existing TS error in `.next/types/validator.ts` (stale reference to ../../src/app/unsubscribe/route.js) is NOT from my changes. Pre-existing lint errors in footer.tsx, insights.tsx, page.tsx, and workspace-analysis/extracted/ are NOT from my changes.

## How to start the mini-service

```bash
cd mini-services/availability
bun install           # one-time
bun run dev           # runs `bun --hot index.ts` on port 3003
```

## Sandbox note

The cloud sandbox kills background `bun` processes between bash calls, so the mini-service may need to be manually restarted before viewing the live indicator. The frontend gracefully renders nothing when the socket is disconnected, so the site is fully functional without the service running — the indicator simply appears once the service is up.

## Forbidden files — confirmed untouched

- `prisma/schema.prisma`, `src/middleware.ts`, `next.config.ts`, `tsconfig.json`, `.env`
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx`
- `src/app/sitemap.ts`
- `src/app/admin/page.tsx`
- Any other agent's files (M3-a's booking.tsx changes preserved exactly — only added 1 import + 5-line header line at the top of the section)
