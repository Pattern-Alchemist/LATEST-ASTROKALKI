"use client";

/**
 * AvailabilityIndicator — a small, elegant live indicator that shows
 * AstroKalki's current availability (Available / In session / Away) plus,
 * when relevant, the next booking opening.
 *
 * Visual language (per M3-d v2 spec):
 *   • 6px dot — gold (#c9a96e) for available, amber (#d4a574) for
 *     in-session, gray (#5a5a5a) for away.
 *   • Pulse animation — 2s ease-in-out infinite (available), 3s
 *     (in-session), none (away).
 *   • Cinzel uppercase label, text-[9px], tracking-[0.2em], #7a7a7a.
 *   • When the socket is disconnected, render nothing (no broken UI).
 *
 * Two variants:
 *   • `badge` (default): tight inline-flex for nav bars / hero CTA row
 *   • `line`: looser spacing for a section header
 *
 * ARIA: role="status" + aria-live="polite" + descriptive aria-label so
 * screen readers announce the current state and next opening.
 */

import { useAvailability, type AvailabilityStatus } from "@/hooks/useAvailability";

const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  available: "#c9a96e",
  "in-session": "#d4a574",
  away: "#5a5a5a",
};

const STATUS_PULSE_DURATION: Record<AvailabilityStatus, string> = {
  available: "2s",
  "in-session": "3s",
  away: "0s", // no pulse
};

const DEFAULT_LABEL: Record<AvailabilityStatus, string> = {
  available: "Available now",
  "in-session": "In session",
  away: "Away",
};

/**
 * Format an ISO time string for the next-opening line in IST:
 *   today      → "today, 10:00 AM"
 *   tomorrow   → "tomorrow, 10:00 AM"
 *   ≤ 6 days   → "Wed, 10:00 AM"
 *   else       → "12 Jun, 10:00 AM"
 */
function formatNextOpening(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const istOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  };
  const time = date.toLocaleTimeString("en-US", istOptions);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (startOfDate.getTime() - startOfToday.getTime()) / 86_400_000
  );

  if (dayDiff === 0) return `today, ${time}`;
  if (dayDiff === 1) return `tomorrow, ${time}`;
  if (dayDiff > 1 && dayDiff <= 6) {
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "Asia/Kolkata",
    });
    return `${weekday}, ${time}`;
  }
  const monDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return `${monDay}, ${time}`;
}

interface AvailabilityIndicatorProps {
  /**
   * `badge` (default): single inline-flex row — dot + label + optional
   *   next opening. Fits in nav bars and tight headers.
   * `line`: same content, slightly looser spacing for a section header.
   */
  variant?: "badge" | "line";
  className?: string;
}

export function AvailabilityIndicator({
  variant = "badge",
  className = "",
}: AvailabilityIndicatorProps) {
  const { status, message, nextOpening, connected } = useAvailability();

  // Disconnected state — render nothing (no broken indicator).
  if (!connected || !status) return null;

  const color = STATUS_COLOR[status];
  const pulseDuration = STATUS_PULSE_DURATION[status];
  const label = message?.trim() ? message.trim() : DEFAULT_LABEL[status];
  const showNextOpening =
    nextOpening && (status === "in-session" || status === "away");

  const gap = variant === "line" ? "gap-3" : "gap-2";
  const labelSize =
    variant === "line" ? "text-[10px]" : "text-[9px]";

  // Inline <style> per instance for the pulse keyframes — unique animation
  // name so multiple indicators on the page don't collide.
  const animName = `ak-avail-pulse-${status.replace(/[^a-z]/g, "")}`;
  const shouldPulse = pulseDuration !== "0s";

  return (
    <div
      className={`inline-flex items-center ${gap} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`AstroKalki is ${label.toLowerCase()}${
        showNextOpening && nextOpening
          ? `, next opening ${formatNextOpening(nextOpening)}`
          : ""
      }`}
    >
      {shouldPulse && (
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes ${animName} { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.7); } }`,
          }}
        />
      )}

      {/* Pulsing dot — 6px circle.
          When pulsing: an outer halo ring that animates opacity + scale,
          plus a solid inner dot. When not pulsing (away): just the dot. */}
      <span className="relative inline-flex h-[6px] w-[6px] items-center justify-center">
        {shouldPulse && (
          <span
            className="absolute inline-flex h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: color,
              animation: `${animName} ${pulseDuration} ease-in-out infinite`,
            }}
            aria-hidden="true"
          />
        )}
        <span
          className="relative inline-flex h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      </span>

      <span
        className={`${labelSize} tracking-[0.2em] uppercase text-[#7a7a7a] font-light`}
        style={{ fontFamily: "Cinzel, serif" }}
      >
        {label}
      </span>

      {showNextOpening && nextOpening && (
        <span className="inline-flex items-center gap-2">
          <span className="text-[#3a3a3a]" aria-hidden="true">·</span>
          <span
            className="text-[9px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light"
            style={{ fontFamily: "Cinzel, serif" }}
          >
            Next opening
          </span>
          <span
            className="font-mono text-[9px] tracking-normal text-[#c9a96e]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatNextOpening(nextOpening)}
          </span>
        </span>
      )}
    </div>
  );
}

export default AvailabilityIndicator;
