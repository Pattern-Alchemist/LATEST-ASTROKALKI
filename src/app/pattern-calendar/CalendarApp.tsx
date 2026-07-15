"use client";

/**
 * CalendarApp — the interactive shell for /pattern-calendar.
 *
 * Receives the server-fetched forecast as `initialForecast` and owns
 * the interaction state: which day is selected, the day-detail panel,
 * and the legend visibility. Re-fetches from /api/transits/calendar
 * only when the user explicitly clicks "Refresh" (the cache is 1
 * hour server-side, so most re-fetches are free anyway).
 *
 * Layout:
 *   ┌─ Header (server-rendered above this component)
 *   ├─ "This week's pattern weather" summary
 *   ├─ Calendar grid (PatternCalendar)
 *   ├─ Day detail (DayDetail, inline expanded section)
 *   └─ Legend (all 10 patterns with their colors)
 */

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PatternCalendar from "./PatternCalendar";
import DayDetail from "./DayDetail";
import { getPatternColor, hexToRgba } from "@/lib/astrology/pattern-colors";
import { ATLAS_PATTERNS, getAtlasPattern } from "@/lib/content/patterns/atlas";
import type { ForecastDay } from "./types";

/* -------------------------------------------------------------------------- */
/*  Props                                                                       */
/* -------------------------------------------------------------------------- */

interface CalendarAppProps {
  initialForecast: ForecastDay[];
  initialHasNatalChart: boolean;
  initialGeneratedAt: string;
  /** Display name for the greeting. */
  name?: string | null;
}

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

function shortPatternName(slug: string): string {
  const atlas = getAtlasPattern(slug);
  if (!atlas) return slug.replace(/^the-/, "").replace(/-/g, " ");
  return atlas.name.replace(/^The\s+/, "").replace(/\s+Pattern$/, "");
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function CalendarApp({
  initialForecast,
  initialHasNatalChart,
  initialGeneratedAt,
  name,
}: CalendarAppProps) {
  const [forecast] = useState<ForecastDay[]>(initialForecast);
  const [hasNatalChart] = useState<boolean>(initialHasNatalChart);
  const [generatedAt] = useState<string>(initialGeneratedAt);

  // Default selection: today.
  const todayIso = useMemo(() => isoDay(new Date()), []);
  const [selectedIso, setSelectedIso] = useState<string | null>(todayIso);

  const selectedDay = useMemo(() => {
    if (!selectedIso) return null;
    return (
      forecast.find((d) => {
        const dayIso = isoDay(new Date(d.date));
        return dayIso === selectedIso;
      }) ?? null
    );
  }, [forecast, selectedIso]);

  const handleSelectDate = useCallback((iso: string) => {
    setSelectedIso(iso);
    // Scroll the day detail into view (below the grid).
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const el = document.getElementById("day-detail-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedIso(null);
  }, []);

  // ─── Week-weather summary (next 7 days) ──────────────────────────────
  const weekWeather = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const sevenDays: ForecastDay[] = [];
    for (let i = 0; i < 7; i++) {
      const target = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const targetIso = isoDay(target);
      const day = forecast.find((d) => isoDay(new Date(d.date)) === targetIso);
      if (day) sevenDays.push(day);
    }
    return sevenDays;
  }, [forecast]);

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24 space-y-16 sm:space-y-24">
        {/* ─── I. This week's pattern weather ─────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">I.</span>
            This week&apos;s pattern weather
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            What&apos;s approaching.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            The next seven days at a glance. Each day shows the dominant
            pattern — the one the transits are amplifying most. Click any
            day in the calendar below for the full picture and a
            preparation prompt.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekWeather.map((day) => {
              const peak = day.peakPattern;
              const peakActivation = day.activations.find(
                (a) => a.pattern === peak,
              );
              const intensity = peakActivation?.intensity ?? 0;
              const color = peak ? getPatternColor(peak) : null;
              const opacity = intensity > 0 ? Math.max(0.3, intensity) : 0;
              const date = new Date(day.date);
              const dayOfWeek = date.toLocaleDateString("en-IN", {
                weekday: "short",
                timeZone: "UTC",
              });
              const dayNum = date.getUTCDate();
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleSelectDate(isoDay(date))}
                  className="text-left p-3 border border-white/[0.06] hover:border-[#c9a96e]/40 transition-colors relative overflow-hidden"
                  style={{
                    background: color
                      ? hexToRgba(color, opacity * 0.18)
                      : "rgba(255, 255, 255, 0.015)",
                    borderTop: color
                      ? `2px solid ${hexToRgba(color, opacity)}`
                      : "2px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[#5a5a5a] font-mono mb-1">
                    {dayOfWeek} {dayNum}
                  </p>
                  {peak ? (
                    <>
                      <p
                        className="text-[12px] font-light leading-tight mb-1 truncate"
                        style={{
                          color: hexToRgba(
                            color ?? "#c9a96e",
                            Math.max(0.7, opacity),
                          ),
                          fontFamily:
                            "var(--font-cinzel), Cinzel, Georgia, serif",
                        }}
                      >
                        {shortPatternName(peak)}
                      </p>
                      <p className="text-[10px] text-[#5a5a5a] font-mono">
                        {Math.round(intensity * 100)}%
                      </p>
                    </>
                  ) : (
                    <p className="text-[12px] text-[#5a5a5a] font-light italic">
                      quiet
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Provenance + natal-chart banner */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light">
              Forecast generated {formatRelative(generatedAt)} · Cached
              for 1 hour
            </p>
            {!hasNatalChart && (
              <Link
                href="/birth-chart"
                className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Cast your birth chart for personalised activations →
              </Link>
            )}
          </div>
        </section>

        {/* ─── II. Calendar grid ──────────────────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">II.</span>
            The next 30 days
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            The 30-day pattern calendar.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Each square is one day. The color shows which pattern is
            being amplified; the opacity shows how strongly. Click a day
            for the full picture — which patterns are activated, why, and
            what to do with it.
          </p>

          <div className="bg-white/[0.015] border border-white/[0.04] p-4 sm:p-6 lg:p-8">
            <PatternCalendar
              forecast={forecast}
              selectedDate={selectedIso}
              onSelectDate={handleSelectDate}
            />
          </div>

          {/* ─── Legend ──────────────────────────────────────────────── */}
          <div className="mt-8">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-4 font-light">
              The 10 patterns
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2.5">
              {ATLAS_PATTERNS.map((p) => {
                const color = getPatternColor(p.slug);
                return (
                  <Link
                    key={p.slug}
                    href={`/patterns/atlas/${p.slug}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0 ring-1 ring-white/[0.06]"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <span
                      className="text-[11px] tracking-[0.1em] uppercase text-[#7a7a7a] group-hover:text-[#c9a96e] transition-colors truncate font-light"
                      style={{
                        fontFamily:
                          "var(--font-cinzel), Cinzel, Georgia, serif",
                      }}
                    >
                      {p.name.replace(/^The\s+/, "").replace(/\s+Pattern$/, "")}
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-5 text-[10px] tracking-[0.2em] uppercase text-[#3a3a3a] font-light">
              Click any pattern to read its full Atlas entry.
            </p>
          </div>
        </section>

        {/* ─── III. Day detail ────────────────────────────────────────── */}
        <section id="day-detail-section">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">III.</span>
            Day detail
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            {selectedDay
              ? "What this day is doing."
              : "Select a day."}
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            {selectedDay
              ? "Which patterns are activated, why (the transit reason), the intensity, and a preparation prompt to take into the day."
              : "Click any day in the calendar above to see which patterns are activated, the transit reason, and a preparation prompt."}
          </p>

          <DayDetail day={selectedDay} onClose={handleCloseDetail} />
        </section>

        {/* ─── Footer links ──────────────────────────────────────────── */}
        <div className="pt-10 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              {name ? `Signed in as ${name}` : "Signed in"}
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md">
              The calendar is a planning tool — not a prediction. Patterns
              are not destiny; they are weather. You decide what to do
              with the forecast.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/journal"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
            >
              Open journal
              <span>→</span>
            </Link>
            <Link
              href="/transits"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.08] pb-2 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-colors whitespace-nowrap"
            >
              Today&apos;s transits
              <span>→</span>
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.08] pb-2 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-colors whitespace-nowrap"
            >
              Back to account
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
