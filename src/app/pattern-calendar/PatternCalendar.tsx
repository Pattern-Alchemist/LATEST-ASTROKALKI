"use client";

/**
 * PatternCalendar — the interactive 30-day calendar grid.
 *
 * Renders the next 30 days as a 7-column calendar (current week + the
 * next 3 weeks + a few trailing days). Each cell is colored by the
 * dominant (peak) pattern's color, at opacity proportional to the
 * activation intensity. Clicking a cell opens the DayDetail panel.
 *
 * The grid:
 *   - 7 columns (Sun → Sat), with weekday headers in Cinzel.
 *   - Each cell min-h-20, rounded, with the day-of-month number in
 *     the top-left and the peak pattern's short name in the bottom.
 *   - Today is highlighted with a gold ring.
 *   - The selected day has a gold border.
 *   - Days with no activations are dim (the "quiet" days).
 *
 * All the heavy lifting (forecast computation) happens server-side
 * via /api/transits/calendar. This component is purely presentational
 * + interaction state (which day is selected).
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getPatternColor, hexToRgba } from "@/lib/astrology/pattern-colors";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";
import type { ForecastDay } from "./types";

/* -------------------------------------------------------------------------- */
/*  Props + constants                                                          */
/* -------------------------------------------------------------------------- */

interface PatternCalendarProps {
  forecast: ForecastDay[];
  /** ISO date string of the currently-selected day (or null). */
  selectedDate: string | null;
  /** Called when the user clicks a day cell. */
  onSelectDate: (iso: string) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDay(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate(),
  )}`;
}

/**
 * Strip the " Pattern" suffix from an Atlas pattern name and title-case
 * the rest. e.g. "The Abandonment Pattern" → "Abandonment".
 * Used for the compact label inside each calendar cell.
 */
function shortPatternName(slug: string): string {
  const atlas = getAtlasPattern(slug);
  if (!atlas) return slug.replace(/^the-/, "").replace(/-/g, " ");
  const name = atlas.name.replace(/^The\s+/, "").replace(/\s+Pattern$/, "");
  return name;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function PatternCalendar({
  forecast,
  selectedDate,
  onSelectDate,
}: PatternCalendarProps) {
  const todayIso = useMemo(() => isoDay(new Date()), []);

  // Build a lookup: iso-day-string → ForecastDay.
  const byDay = useMemo(() => {
    const m = new Map<string, ForecastDay>();
    for (const day of forecast) {
      const d = new Date(day.date);
      m.set(isoDay(d), day);
    }
    return m;
  }, [forecast]);

  // Build the calendar grid: 5 weeks (35 cells) starting from the
  // Sunday of the current week. The forecast starts today, so the
  // first row may have a few leading cells in the past (dim, not
  // clickable for forecast). We render them as faded context.
  const cells = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = today.getUTCDay(); // 0 = Sun
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - dayOfWeek);

    const out: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      out.push(d);
    }
    return out;
  }, []);

  return (
    <div>
      {/* ─── Weekday header ──────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center text-[9px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light"
            style={{ fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ─── Day grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((day) => {
          const iso = isoDay(day);
          const forecastDay = byDay.get(iso);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          const isInPast = day.getTime() < new Date(todayIso).getTime();
          const peak = forecastDay?.peakPattern ?? null;
          const peakActivation = forecastDay?.activations.find(
            (a) => a.pattern === peak,
          );
          const intensity = peakActivation?.intensity ?? 0;
          const color = peak ? getPatternColor(peak) : null;
          // Opacity scale: 0.3 (low) → 1.0 (peak). Days with no
          // activations render at 0.0 (just the empty cell tint).
          const opacity = intensity > 0 ? Math.max(0.3, intensity) : 0;

          return (
            <motion.button
              key={iso}
              type="button"
              disabled={!forecastDay}
              onClick={() => forecastDay && onSelectDate(iso)}
              whileHover={forecastDay ? { scale: 1.03 } : undefined}
              whileTap={forecastDay ? { scale: 0.97 } : undefined}
              title={
                forecastDay
                  ? titleForDay(day, forecastDay)
                  : formatLongDay(day)
              }
              aria-label={
                forecastDay
                  ? ariaForDay(day, forecastDay)
                  : `${formatLongDay(day)} — no forecast available`
              }
              className={`relative min-h-20 rounded border transition-colors text-left ${
                forecastDay
                  ? "cursor-pointer hover:border-[#c9a96e]/40"
                  : "cursor-not-allowed"
              } ${isInPast ? "opacity-50" : ""}`}
              style={{
                background: color
                  ? hexToRgba(color, opacity * 0.35)
                  : "rgba(255, 255, 255, 0.015)",
                borderColor: isSelected
                  ? "rgba(201, 169, 110, 0.9)"
                  : color
                    ? `rgba(201, 169, 110, ${0.1 + opacity * 0.15})`
                    : "rgba(255, 255, 255, 0.04)",
                // Colored left border = pattern tint
                borderLeft: color
                  ? `3px solid ${hexToRgba(color, opacity)}`
                  : undefined,
              }}
            >
              {/* Day-of-month number */}
              <span
                className="absolute top-1.5 left-2 text-[10px] font-mono text-[#7a7a7a]"
                aria-hidden
              >
                {day.getUTCDate()}
              </span>

              {/* Today ring */}
              {isToday && (
                <span
                  className="absolute inset-0 rounded pointer-events-none"
                  style={{
                    boxShadow: "inset 0 0 0 1px rgba(201, 169, 110, 0.7)",
                  }}
                />
              )}

              {/* Peak pattern short name (only if there's an activation) */}
              {peak && (
                <span
                  className="absolute bottom-1.5 left-2 right-2 text-[9px] tracking-[0.1em] uppercase font-light truncate"
                  style={{
                    color: hexToRgba(color ?? "#c9a96e", Math.max(0.6, opacity)),
                    fontFamily:
                      "var(--font-cinzel), Cinzel, Georgia, serif",
                  }}
                >
                  {shortPatternName(peak)}
                </span>
              )}

              {/* Intensity dot — top right */}
              {peak && intensity > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: hexToRgba(color ?? "#c9a96e", opacity),
                  }}
                  aria-hidden
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Title / ARIA helpers                                                       */
/* -------------------------------------------------------------------------- */

function formatLongDay(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function titleForDay(d: Date, day: ForecastDay): string {
  const dateStr = formatLongDay(d);
  if (day.activations.length === 0) {
    return `${dateStr} — quiet day, no strong pattern activations`;
  }
  const peak = day.activations[0];
  const atlas = getAtlasPattern(peak.pattern);
  const name = atlas?.name ?? peak.pattern;
  return `${dateStr} — ${name} activated at ${Math.round(
    peak.intensity * 100,
  )}% intensity`;
}

function ariaForDay(d: Date, day: ForecastDay): string {
  const dateStr = formatLongDay(d);
  if (day.activations.length === 0) {
    return `${dateStr}. Quiet day, no strong pattern activations.`;
  }
  const peak = day.activations[0];
  const atlas = getAtlasPattern(peak.pattern);
  const name = atlas?.name ?? peak.pattern;
  const list = day.activations
    .slice(0, 3)
    .map((a) => {
      const aName = getAtlasPattern(a.pattern)?.name ?? a.pattern;
      return `${aName} at ${Math.round(a.intensity * 100)} percent`;
    })
    .join(", ");
  return `${dateStr}. ${day.activations.length} pattern${
    day.activations.length === 1 ? "" : "s"
  } activated. Peak: ${name}. Activations: ${list}. Click for details.`;
}
