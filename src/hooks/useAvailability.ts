"use client";

/**
 * useAvailability — React hook that connects to the AstroKalki availability
 * mini-service (socket.io on port 3003, routed via the gateway) and exposes
 * the live availability state to any client component.
 *
 * Connection pattern (CRITICAL — must use XTransformPort, never a direct URL):
 *     io("/?XTransformPort=3003", { transports: ["websocket"], ... })
 *
 * Returns:
 *   - status:         'available' | 'in-session' | 'away' | null
 *   - message:        string | null  (admin-set, free-form one-liner)
 *   - nextOpening:    ISO string | null
 *   - updatedAt:      number | null (ms epoch)
 *   - connected:      boolean (live connection state)
 *
 * Legacy fields (`nextSlot`, `currentSessionEnds`) are still surfaced for
 * any older consumer code, but new code should prefer `message` +
 * `nextOpening`.
 *
 * The hook is SSR-safe: it only opens a socket inside useEffect, so the
 * server-rendered HTML doesn't try to touch `io`. On unmount it disconnects
 * and removes every listener.
 */

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type AvailabilityStatus = "available" | "in-session" | "away";

export interface AvailabilityState {
  status: AvailabilityStatus;
  message: string;
  nextOpening: string | null;
  updatedAt: number;
  // Legacy aliases (kept for older consumers).
  nextSlot: string | null;
  currentSessionEnds: string | null;
}

export interface UseAvailabilityResult {
  status: AvailabilityStatus | null;
  message: string | null;
  nextOpening: string | null;
  updatedAt: number | null;
  // Legacy aliases.
  nextSlot: string | null;
  currentSessionEnds: string | null;
  connected: boolean;
}

function normalizeState(input: unknown): AvailabilityState | null {
  if (!input || typeof input !== "object") return null;
  const s = input as Partial<AvailabilityState>;
  if (s.status !== "available" && s.status !== "in-session" && s.status !== "away") {
    return null;
  }
  const nextOpening =
    typeof s.nextOpening === "string"
      ? s.nextOpening
      : typeof s.nextSlot === "string"
        ? s.nextSlot
        : null;
  return {
    status: s.status,
    message: typeof s.message === "string" ? s.message : "",
    nextOpening,
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : Date.now(),
    nextSlot: nextOpening,
    currentSessionEnds: typeof s.currentSessionEnds === "string" ? s.currentSessionEnds : null,
  };
}

export function useAvailability(): UseAvailabilityResult {
  const [state, setState] = useState<AvailabilityState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the availability mini-service via the gateway.
    // NEVER use a direct URL — the XTransformPort query is what Caddy uses
    // to forward the request to port 3003.
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onState = (next: unknown) => {
      const normalized = normalizeState(next);
      if (normalized) setState(normalized);
    };
    const onConnectError = (err: unknown) => {
      // Silent — reconnection is automatic.
      setConnected(false);
      void err;
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state:sync", onState);
    socket.on("state-change", onState); // legacy alias
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state:sync", onState);
      socket.off("state-change", onState);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    status: state?.status ?? null,
    message: state?.message ?? null,
    nextOpening: state?.nextOpening ?? null,
    updatedAt: state?.updatedAt ?? null,
    nextSlot: state?.nextSlot ?? null,
    currentSessionEnds: state?.currentSessionEnds ?? null,
    connected,
  };
}

export default useAvailability;
