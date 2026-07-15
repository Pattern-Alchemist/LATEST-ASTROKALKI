"use client";

/**
 * UpcomingActivations — small widget for the Pattern Journal sidebar.
 *
 * Surfaces the next 3 days of pattern activations as compact chips,
 * linking to /pattern-calendar for the full 30-day forecast. Lives
 * at the top of the journal (between the daily check-in and the
 * entry form) so the member sees what's approaching before they log
 * what's already here.
 *
 * Fetches /api/transits/calendar on mount. Renders nothing if the
 * fetch fails (silent — the journal is still fully usable without
 * this widget).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getPatternColor, hexToRgba } from "@/lib/astrology/pattern-colors";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";

/* -------------------------------------------------------------------------- */
/*  Types (mirror /pattern-calendar/types.ts without the import cycle)        */
/* -------------------------------------------------------------------------- */

interface ForecastActivation {
  pattern: string;
  patternName: string;
  intensity: number;
  reason: string;
}

interface ForecastDay {
  date: string;
  activations: ForecastActivation[];
  peakPattern: string | null;
}

interface CalendarApiResponse {
  forecast: ForecastDay[];
  hasNatalChart: boolean;
  generatedAt: string;
  cached?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function UpcomingActivations() {
  const [days, setDays] = useState<ForecastDay[] | null>(null);
  const [hasNatalChart, setHasNatalChart] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/transits/calendar", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CalendarApiResponse | null) => {
        if (cancelled || !data?.forecast) return;
        // Take the next 3 days starting tomorrow (today's weather is
        // already covered by the Daily check-in section above).
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const upcoming = data.forecast.filter((d) => {
          const dd = new Date(d.date);
          return dd.getTime() >= tomorrow.getTime();
        });
        setDays(upcoming.slice(0, 3));
        setHasNatalChart(data.hasNatalChart);
      })
      .catch(() => {
        // Silent — the journal is still fully usable without this widget.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render anything until we have data — keeps the journal layout
  // stable (no flash of empty space).
  if (!days) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white/[0.015] border border-white/[0.04] p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p
          className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 font-light"
          style={{ fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif" }}
        >
          Upcoming activations
        </p>
        <Link
          href="/pattern-calendar"
          className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors whitespace-nowrap"
        >
          30-day calendar →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {days.map((day) => {
          const peak = day.peakPattern;
          const peakActivation = day.activations.find(
            (a) => a.pattern === peak,
          );
          const intensity = peakActivation?.intensity ?? 0;
          const color = peak ? getPatternColor(peak) : null;
          const opacity = intensity > 0 ? Math.max(0.3, intensity) : 0;
          const date = new Date(day.date);
          const dayLabel = formatDayLabel(date);
          const atlas = peak ? getAtlasPattern(peak) : null;
          const shortName = atlas
            ? atlas.name.replace(/^The\s+/, "").replace(/\s+Pattern$/, "")
            : peak
              ? peak.replace(/^the-/, "").replace(/-/g, " ")
              : "quiet";

          return (
            <Link
              key={day.date}
              href="/pattern-calendar"
              className="block p-3 border border-white/[0.06] hover:border-[#c9a96e]/40 transition-colors relative overflow-hidden"
              style={{
                background: color
                  ? hexToRgba(color, opacity * 0.18)
                  : "rgba(255, 255, 255, 0.01)",
                borderLeft: color
                  ? `2px solid ${hexToRgba(color, opacity)}`
                  : "2px solid rgba(255, 255, 255, 0.04)",
              }}
              title={
                peakActivation
                  ? `${dayLabel}: ${atlas?.name ?? peak} at ${Math.round(
                      intensity * 100,
                    )}% — ${peakActivation.reason}`
                  : `${dayLabel}: quiet day, no strong pattern activations`
              }
            >
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#5a5a5a] font-mono mb-1">
                {dayLabel}
              </p>
              <p
                className="text-[12px] font-light leading-tight truncate"
                style={{
                  color: color
                    ? hexToRgba(color, Math.max(0.7, opacity))
                    : "#5a5a5a",
                  fontFamily: "var(--font-cinzel), Cinzel, Georgia, serif",
                }}
              >
                {shortName}
              </p>
              {peak && intensity > 0 ? (
                <p className="text-[10px] text-[#5a5a5a] font-mono mt-1">
                  {Math.round(intensity * 100)}%
                </p>
              ) : (
                <p className="text-[10px] text-[#3a3a3a] font-light italic mt-1">
                  quiet
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {!hasNatalChart && (
        <p className="mt-4 text-[10px] tracking-wide text-[#5a5a5a] font-light leading-relaxed">
          Showing general transits.{" "}
          <Link
            href="/birth-chart"
            className="text-[#c9a96e]/80 hover:text-[#c9a96e] transition-colors underline-offset-2 hover:underline"
          >
            Cast your birth chart
          </Link>{" "}
          for personalised activations.
        </p>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatDayLabel(date: Date): string {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) {
    return `In ${diffDays} days`;
  }
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
