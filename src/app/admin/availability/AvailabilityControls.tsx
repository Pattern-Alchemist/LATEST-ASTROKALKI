"use client";

/**
 * AvailabilityControls — client component for /admin/availability.
 *
 * Responsibilities:
 *   • Fetch the current state from /api/admin/availability (REST proxy →
 *     the socket.io mini-service on port 3003).
 *   • Render a "current state" card (status dot, message, next opening,
 *     updatedAt, # of connected clients).
 *   • Render a form to update: status (available/in-session/away),
 *     message (free-form one-liner), nextOpening (datetime-local).
 *   • On submit → POST /api/admin/availability → mini-service broadcasts
 *     the change to every connected site visitor in real time.
 *   • Live-sync: also opens a socket.io connection so the panel reflects
 *     updates from other admins / sessions without a manual refresh.
 *
 * Design system: #050505 bg, gold #c9a96e accent, amber #d4a574 for
 * in-session, gray #5a5a5a for away, Cinzel/editorial labels. Matches
 * /admin/leads + /admin/testimonials.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Check,
  AlertCircle,
  Radio,
  Clock,
  Users,
  Save,
  Eye,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type AvailabilityStatus = "available" | "in-session" | "away";

interface AvailabilityState {
  status: AvailabilityStatus;
  message: string;
  nextOpening: string | null;
  updatedAt: number;
  nextSlot: string | null;
  currentSessionEnds: string | null;
}

interface GetResponse {
  ok: boolean;
  state: AvailabilityState | null;
  clients: number | null;
  service?: string;
}

interface PostResponse {
  ok: boolean;
  state: AvailabilityState | null;
  error?: string;
  detail?: unknown;
}

const STATUS_DOT: Record<AvailabilityStatus, string> = {
  available: "bg-[#c9a96e]",
  "in-session": "bg-[#d4a574]",
  away: "bg-[#5a5a5a]",
};

const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: "Available",
  "in-session": "In session",
  away: "Away",
};

const STATUS_TEXT: Record<AvailabilityStatus, string> = {
  available: "text-[#c9a96e]",
  "in-session": "text-[#d4a574]",
  away: "text-[#7a7a7a]",
};

const DEFAULT_MESSAGES: Record<AvailabilityStatus, string> = {
  available: "Currently accepting new sessions",
  "in-session": "In session — accepting waitlist for the next opening",
  away: "Away — booking paused",
};

function formatTimestamp(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatNextOpening(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Convert an ISO datetime into the value expected by <input
 * type="datetime-local">: "YYYY-MM-DDTHH:MM" in the browser's local
 * timezone.
 */
function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function datetimeLocalToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AvailabilityControls() {
  const [state, setState] = useState<AvailabilityState | null>(null);
  const [clients, setClients] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [status, setStatus] = useState<AvailabilityStatus>("available");
  const [message, setMessage] = useState(DEFAULT_MESSAGES.available);
  const [nextOpeningLocal, setNextOpeningLocal] = useState("");
  const [clearNextOpening, setClearNextOpening] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<
    { kind: "ok"; text: string } | { kind: "err"; text: string } | null
  >(null);

  const socketRef = useRef<Socket | null>(null);

  // ─── Fetch current state from the REST proxy ─────────────────────
  const fetchState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/availability", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as GetResponse;
      if (data.state) {
        setState(data.state);
        setStatus(data.state.status);
        setMessage(
          data.state.message?.trim()
            ? data.state.message
            : DEFAULT_MESSAGES[data.state.status]
        );
        setNextOpeningLocal(isoToDatetimeLocal(data.state.nextOpening));
        setClearNextOpening(!data.state.nextOpening);
      }
      setClients(data.clients ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Real-time sync via socket.io ────────────────────────────────
  // Listen for state:sync so changes from other admin sessions are
  // reflected in the panel without a manual refresh.
  useEffect(() => {
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    const onSync = (next: unknown) => {
      if (!next || typeof next !== "object") return;
      const s = next as Partial<AvailabilityState>;
      if (
        s.status !== "available" &&
        s.status !== "in-session" &&
        s.status !== "away"
      ) {
        return;
      }
      const normalized: AvailabilityState = {
        status: s.status,
        message: typeof s.message === "string" ? s.message : "",
        nextOpening:
          typeof s.nextOpening === "string"
            ? s.nextOpening
            : typeof s.nextSlot === "string"
              ? s.nextSlot
              : null,
        updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : Date.now(),
        nextSlot: null,
        currentSessionEnds:
          typeof s.currentSessionEnds === "string" ? s.currentSessionEnds : null,
      };
      normalized.nextSlot = normalized.nextOpening;
      setState(normalized);
      // Don't clobber the form the admin is actively editing — only
      // refresh the "current state" card.
    };
    socket.on("state:sync", onSync);
    socket.on("state-change", onSync);

    return () => {
      socket.off("state:sync", onSync);
      socket.off("state-change", onSync);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  // ─── Submit handler ──────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    const payload: Record<string, unknown> = {
      status,
      message: message.trim() || DEFAULT_MESSAGES[status],
    };
    if (clearNextOpening) {
      payload.nextOpening = null;
    } else {
      const iso = datetimeLocalToIso(nextOpeningLocal);
      if (nextOpeningLocal && !iso) {
        setSubmitResult({
          kind: "err",
          text: "Next opening date is invalid.",
        });
        setSubmitting(false);
        return;
      }
      if (iso) payload.nextOpening = iso;
    }

    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as PostResponse;
      if (!res.ok || !data.ok) {
        const msg =
          (data as { error?: string }).error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      if (data.state) {
        setState(data.state);
        setStatus(data.state.status);
        setMessage(
          data.state.message?.trim()
            ? data.state.message
            : DEFAULT_MESSAGES[data.state.status]
        );
        setNextOpeningLocal(isoToDatetimeLocal(data.state.nextOpening));
        setClearNextOpening(!data.state.nextOpening);
      }
      setSubmitResult({
        kind: "ok",
        text: "Status updated — every connected visitor sees this live now.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitResult({ kind: "err", text: msg });
    } finally {
      setSubmitting(false);
      // Auto-clear the result after a few seconds.
      setTimeout(() => setSubmitResult(null), 6000);
    }
  };

  // ─── Preset handlers ─────────────────────────────────────────────
  const applyPreset = (preset: AvailabilityStatus) => {
    setStatus(preset);
    setMessage(DEFAULT_MESSAGES[preset]);
    if (preset === "available") {
      // Available + clear next opening — visitor can book now.
      // (Don't override the field if the admin wants to keep it; just
      // surface a sensible default.)
      // Leave nextOpeningLocal alone — admin can clear via checkbox.
    }
  };

  const previewLabel = useMemo(() => {
    const msg = message?.trim() || DEFAULT_MESSAGES[status];
    if (status === "in-session" || status === "away") {
      const opening = clearNextOpening ? "" : nextOpeningLocal;
      const openingIso = datetimeLocalToIso(opening);
      if (openingIso) {
        return `${msg} · Next opening ${formatNextOpening(openingIso)}`;
      }
      return msg;
    }
    return msg;
  }, [message, status, nextOpeningLocal, clearNextOpening]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-10">
      {/* ═══════════════════════════════════════════════════════════
          LEFT: Current state + preview
          ═══════════════════════════════════════════════════════════ */}
      <section className="lg:col-span-2 space-y-6">
        {/* Current state card */}
        <div className="border border-white/[0.04] bg-[#0a0a0a]/40 p-6 sm:p-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-6 font-light">
            Current state
          </p>

          {loading && !state ? (
            <div className="flex items-center gap-3 text-[#5a5a5a]">
              <RefreshCw className="size-4 animate-spin" />
              <span className="text-sm font-light">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 text-red-300/80">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <div className="text-sm font-light">
                <p className="mb-1">Cannot reach the availability service.</p>
                <p className="text-xs text-[#5a5a5a]">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchState()}
                  className="mt-3 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#f0eee9]"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : state ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              {/* Status row */}
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
                  <span
                    className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${STATUS_DOT[state.status]} animate-pulse`}
                    style={{ opacity: 0.4 }}
                    aria-hidden="true"
                  />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${STATUS_DOT[state.status]}`}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className={`text-[11px] tracking-[0.3em] uppercase font-light ${STATUS_TEXT[state.status]}`}
                  style={{ fontFamily: "Cinzel, serif" }}
                >
                  {STATUS_LABEL[state.status]}
                </span>
              </div>

              {/* Message */}
              <p className="text-[#f0eee9] text-base sm:text-lg font-light leading-relaxed">
                {state.message?.trim()
                  ? state.message
                  : DEFAULT_MESSAGES[state.status]}
              </p>

              {/* Meta grid */}
              <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                <div>
                  <dt className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 flex items-center gap-1.5 font-light">
                    <Clock className="size-3" /> Next opening
                  </dt>
                  <dd className="text-sm text-[#9a9a9a] font-light">
                    {formatNextOpening(state.nextOpening)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 flex items-center gap-1.5 font-light">
                    <Users className="size-3" /> Live clients
                  </dt>
                  <dd className="text-sm text-[#9a9a9a] font-light font-mono">
                    {clients ?? "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 flex items-center gap-1.5 font-light">
                    <RefreshCw className="size-3" /> Updated
                  </dt>
                  <dd className="text-sm text-[#9a9a9a] font-light font-mono">
                    {formatTimestamp(state.updatedAt)}
                  </dd>
                </div>
              </dl>
            </motion.div>
          ) : null}
        </div>

        {/* Live preview card */}
        <div className="border border-white/[0.04] bg-[#0a0a0a]/40 p-6 sm:p-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-4 flex items-center gap-2 font-light">
            <Eye className="size-3" /> Preview · what visitors see
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative inline-flex h-[6px] w-[6px] items-center justify-center">
              <span
                className={`absolute inline-flex h-[6px] w-[6px] rounded-full ${STATUS_DOT[status]} animate-pulse`}
                style={{ opacity: 0.4 }}
                aria-hidden="true"
              />
              <span
                className={`relative inline-flex h-[6px] w-[6px] rounded-full ${STATUS_DOT[status]}`}
                aria-hidden="true"
              />
            </span>
            <span
              className="text-[9px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light"
              style={{ fontFamily: "Cinzel, serif" }}
            >
              {previewLabel}
            </span>
          </div>
          <p className="text-xs text-[#5a5a5a] font-light leading-relaxed">
            This indicator appears in the homepage hero CTA row and at the top
            of the booking section. Updates broadcast to every connected
            visitor in real time.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT: Update form
          ═══════════════════════════════════════════════════════════ */}
      <section className="lg:col-span-3">
        <form
          onSubmit={onSubmit}
          className="border border-white/[0.04] bg-[#0a0a0a]/40 p-6 sm:p-8 space-y-8"
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 flex items-center gap-2 font-light">
                <Radio className="size-3" /> Update status
              </p>
              <h2 className="text-editorial text-xl text-[#f0eee9] tracking-[-0.01em]">
                Set the live indicator
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void fetchState()}
              className="text-[#5a5a5a] hover:text-[#c9a96e] transition-colors"
              title="Refresh from server"
              aria-label="Refresh from server"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Preset buttons */}
          <div>
            <Label className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-3 block font-light">
              Quick presets
            </Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  {
                    id: "available",
                    label: "Available",
                    color: "#c9a96e",
                  },
                  {
                    id: "in-session",
                    label: "In session",
                    color: "#d4a574",
                  },
                  { id: "away", label: "Away", color: "#5a5a5a" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-4 py-2 text-[10px] tracking-[0.25em] uppercase font-light border transition-colors flex items-center gap-2 ${
                    status === p.id
                      ? "border-[#c9a96e]/40 bg-[#c9a96e]/10 text-[#f0eee9]"
                      : "border-white/[0.06] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.12]"
                  }`}
                >
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  />
                  {p.label}
                  {status === p.id && (
                    <Check className="size-3 text-[#c9a96e]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Status selector */}
          <div>
            <Label
              htmlFor="availability-status"
              className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-3 block font-light"
            >
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as AvailabilityStatus)}
            >
              <SelectTrigger
                id="availability-status"
                className="h-10 text-sm bg-[#050505] border-white/[0.06] text-[#f0eee9] focus:border-[#c9a96e]/40 focus:ring-[#c9a96e]/20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                <SelectItem
                  value="available"
                  className="text-sm text-[#c9a96e] focus:bg-[#c9a96e]/10 focus:text-[#c9a96e]"
                >
                  Available
                </SelectItem>
                <SelectItem
                  value="in-session"
                  className="text-sm text-[#d4a574] focus:bg-[#d4a574]/10 focus:text-[#d4a574]"
                >
                  In session
                </SelectItem>
                <SelectItem
                  value="away"
                  className="text-sm text-[#9a9a9a] focus:bg-white/5 focus:text-[#f0eee9]"
                >
                  Away
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[#5a5a5a] font-light mt-2 leading-relaxed">
              {status === "available" &&
                "Visitor sees a steady gold pulse — &ldquo;Available now&rdquo;. Most welcoming state."}
              {status === "in-session" &&
                "Visitor sees a slow amber pulse — signals urgency + authenticity (&ldquo;real practitioner, currently booked&rdquo;)."}
              {status === "away" &&
                "Visitor sees a static gray dot — booking paused, surfaces next opening for scarcity."}
            </p>
          </div>

          {/* Message input */}
          <div>
            <Label
              htmlFor="availability-message"
              className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-3 block font-light"
            >
              Message
              <span className="ml-2 text-[#3a3a3a] normal-case tracking-normal">
                ({message.length}/280)
              </span>
            </Label>
            <Textarea
              id="availability-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="e.g. In session until 6:30 PM IST"
              className="bg-[#050505] border-white/[0.06] text-[#f0eee9] text-sm font-light focus:border-[#c9a96e]/40 focus:ring-[#c9a96e]/20 resize-none"
            />
            <p className="text-[11px] text-[#5a5a5a] font-light mt-2 leading-relaxed">
              Shown next to the dot in Cinzel uppercase. Keep it short and
              emotionally precise. Empty falls back to a sensible default.
            </p>
          </div>

          {/* Next opening input */}
          <div>
            <Label
              htmlFor="availability-next-opening"
              className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-3 block font-light"
            >
              Next opening
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="availability-next-opening"
                type="datetime-local"
                value={clearNextOpening ? "" : nextOpeningLocal}
                disabled={clearNextOpening}
                onChange={(e) => setNextOpeningLocal(e.target.value)}
                className="bg-[#050505] border-white/[0.06] text-[#f0eee9] text-sm font-light focus:border-[#c9a96e]/40 focus:ring-[#c9a96e]/20 sm:flex-1 [color-scheme:dark]"
              />
              <label className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={clearNextOpening}
                  onChange={(e) => setClearNextOpening(e.target.checked)}
                  className="size-3.5 accent-[#c9a96e] bg-[#050505] border-white/[0.1]"
                />
                Clear
              </label>
            </div>
            <p className="text-[11px] text-[#5a5a5a] font-light mt-2 leading-relaxed">
              Surfaced on the indicator when status is <span className="text-[#d4a574]">in-session</span> or <span className="text-[#7a7a7a]">away</span>. Displayed in IST.
              The mini-service also auto-refreshes this from /api/slots every 5 minutes.
            </p>
          </div>

          {/* Submit + status row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/[0.04]">
            <div className="min-h-[24px] flex items-center gap-2">
              {submitResult?.kind === "ok" && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-emerald-400/80 font-light"
                >
                  <Check className="size-3.5" />
                  {submitResult.text}
                </motion.span>
              )}
              {submitResult?.kind === "err" && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-red-400/80 font-light"
                >
                  <AlertCircle className="size-3.5" />
                  {submitResult.text}
                </motion.span>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b87e] px-5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {submitting ? "Broadcasting…" : "Broadcast update"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
