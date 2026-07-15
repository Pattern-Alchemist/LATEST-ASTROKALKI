"use client";

/**
 * ChartDisplay — renders the SVG chart + a planet positions table.
 *
 * Pure presentational component — no state, no fetches. Receives the
 * chartData (already computed by the API) and the SVG string (already
 * rendered by the API), and lays them out side-by-side on desktop,
 * stacked on mobile.
 *
 * The SVG is injected via `dangerouslySetInnerHTML` because it's
 * generated server-side from a trusted source (our own chart-svg.ts).
 * No user input is interpolated into the SVG — the only user-touched
 * values are birth date / time / place, which are reflected through
 * pre-validated numeric chart data.
 */

import Link from "next/link";
import { useMemo } from "react";
import type { ChartData, ChartPlanet } from "@/lib/astrology/chart-calculator";
import {
  ZODIAC_SIGNS,
  PLANETS,
  formatDegree,
  type PlanetName,
} from "@/lib/astrology/zodiac";

interface ChartDisplayProps {
  chartData: ChartData;
  svgChart: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function planetMeta(name: PlanetName) {
  return PLANETS.find((p) => p.name === name);
}

function signByIndex(index: number) {
  const i = ((Math.floor(index) % 12) + 12) % 12;
  return ZODIAC_SIGNS[i];
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ChartDisplay({
  chartData,
  svgChart,
}: ChartDisplayProps) {
  // Sort planets in the traditional Vedic order: Sun, Moon, Mars,
  // Mercury, Jupiter, Venus, Saturn, Rahu, Ketu. (Ascendant shown last
  // as a separate row in the table.)
  const VEDIC_ORDER: PlanetName[] = [
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
    "Ketu",
  ];

  const sortedPlanets = useMemo(() => {
    const byName = new Map<PlanetName, ChartPlanet>();
    for (const p of chartData.planets) byName.set(p.name, p);
    return VEDIC_ORDER.map((name) => byName.get(name)).filter(
      (p): p is ChartPlanet => Boolean(p)
    );
  }, [chartData.planets]);

  const ascSign = signByIndex(chartData.ascendant.signIndex);

  // Birth time / place summary for the caption.
  const caption = useMemo(() => {
    const dt = new Date(chartData.isoTime);
    const local = new Date(
      dt.getTime() + chartData.tzOffset * 60 * 60 * 1000
    );
    const dateStr = local.toISOString().slice(0, 10);
    const timeStr = local
      .toISOString()
      .slice(11, 16);
    const tzSign = chartData.tzOffset >= 0 ? "+" : "";
    const tzStr = `${tzSign}${chartData.tzOffset}`;
    return {
      local: `${dateStr} ${timeStr}`,
      utc: chartData.isoTime.replace("T", " ").slice(0, 19) + " UTC",
      tz: `UTC${tzStr}`,
      coords: `${chartData.coordinates.lat.toFixed(4)}°, ${chartData.coordinates.lng.toFixed(4)}°`,
      ayanamsa: chartData.ayanamsa.toFixed(4) + "°",
    };
  }, [chartData]);

  return (
    <div className="w-full">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
        Your birth chart
      </p>

      {/* ─── Chart + summary ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* SVG chart — centered, max 400px wide */}
        <div className="flex justify-center">
          <div
            className="w-full max-w-[400px] aspect-square"
            // SVG is generated server-side from validated numeric data.
            // No user input is interpolated into the markup.
            dangerouslySetInnerHTML={{ __html: svgChart }}
            aria-label="North Indian style Vedic birth chart"
            role="img"
          />
        </div>

        {/* Summary + Ascendant highlight */}
        <div className="space-y-8">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              Ascendant (Lagna)
            </p>
            <p
              className="text-3xl sm:text-4xl font-serif text-[#c9a96e] font-light tracking-[-0.01em]"
              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
            >
              {ascSign.symbol} {ascSign.name}
            </p>
            <p className="mt-2 text-sm text-[#cfcabf] font-light font-mono">
              {formatDegree(chartData.ascendant.degreeInSign)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 font-light">
                Local time
              </p>
              <p className="text-sm text-[#cfcabf] font-light font-mono">
                {caption.local} {caption.tz}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 font-light">
                UTC
              </p>
              <p className="text-sm text-[#cfcabf] font-light font-mono">
                {caption.utc}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 font-light">
                Coordinates
              </p>
              <p className="text-sm text-[#cfcabf] font-light font-mono">
                {caption.coords}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 font-light">
                Ayanamsa
              </p>
              <p className="text-sm text-[#cfcabf] font-light font-mono">
                Lahiri · {caption.ayanamsa}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06]">
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.8]">
              This is a Vedic (sidereal) chart cast with the Lahiri
              ayanamsa, using the JPL planetary ephemeris. Houses are
              whole-sign: the Ascendant&apos;s sign is the 1st house,
              and each subsequent sign maps to the next house
              counter-clockwise.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Planet positions table ──────────────────────────────────── */}
      <div className="mt-16">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
          Planetary positions
        </p>
        <div className="border-t border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-3 pr-4 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    Planet
                  </th>
                  <th className="py-3 pr-4 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    Sign
                  </th>
                  <th className="py-3 pr-4 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    Degree
                  </th>
                  <th className="py-3 pr-4 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    House
                  </th>
                  <th className="py-3 pr-4 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    State
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Ascendant row — shown first, distinct from planets */}
                <tr className="border-b border-white/[0.04] bg-[#c9a96e]/[0.02]">
                  <td className="py-3 pr-4">
                    <span
                      className="text-base text-[#c9a96e] font-light"
                      style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                    >
                      Asc
                    </span>
                    <span className="ml-2 text-[11px] text-[#5a5a5a] font-light">
                      Lagna
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-base text-[#c9a96e]">
                    {ascSign.symbol}{" "}
                    <span className="text-[#cfcabf] text-sm font-light">
                      {ascSign.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#cfcabf] font-mono">
                    {formatDegree(chartData.ascendant.degreeInSign)}
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#cfcabf] font-mono">
                    1
                  </td>
                  <td className="py-3 pr-4 text-[11px] text-[#5a5a5a] font-light italic">
                    —
                  </td>
                </tr>

                {/* Planet rows */}
                {sortedPlanets.map((p) => {
                  const meta = planetMeta(p.name);
                  const sign = signByIndex(p.signIndex);
                  return (
                    <tr
                      key={p.name}
                      className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <span
                          className="text-base text-[#c9a96e] mr-2"
                          aria-hidden
                        >
                          {meta?.symbol}
                        </span>
                        <span
                          className="text-sm text-[#f0eee9] font-light"
                          style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                        >
                          {p.name}
                        </span>
                        <span className="ml-2 text-[11px] text-[#5a5a5a] font-light">
                          {meta?.vedicName}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-base text-[#c9a96e]">
                        {sign.symbol}{" "}
                        <span className="text-[#cfcabf] text-sm font-light">
                          {sign.name}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-[#cfcabf] font-mono">
                        {formatDegree(p.degreeInSign)}
                      </td>
                      <td className="py-3 pr-4 text-sm text-[#cfcabf] font-mono">
                        {p.house}
                      </td>
                      <td className="py-3 pr-4 text-[11px] tracking-[0.15em] uppercase font-light">
                        {p.retrograde ? (
                          <span className="text-[#a58a54]">Retrograde</span>
                        ) : (
                          <span className="text-[#5a5a5a]">Direct</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Houses summary ──────────────────────────────────────────── */}
      <div className="mt-16">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
          Houses — whole sign
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {chartData.houses.map((h) => {
            const sign = signByIndex(h.signIndex);
            return (
              <div
                key={h.number}
                className="border border-white/[0.06] p-3 hover:border-[#c9a96e]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-mono">
                    H{h.number}
                  </span>
                  <span className="text-base text-[#c9a96e]">
                    {sign.symbol}
                  </span>
                </div>
                <p className="text-[11px] text-[#cfcabf] font-light mb-1">
                  {sign.name}
                </p>
                <p className="text-[11px] text-[#7a7a7a] font-light leading-relaxed">
                  {h.planets.length > 0
                    ? h.planets
                        .map((p) => planetMeta(p)?.abbr ?? p.slice(0, 2))
                        .join(" · ")
                    : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <div className="mt-16 pt-10 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-2 font-light">
            Want the full decode?
          </p>
          <p className="text-sm text-[#cfcabf] font-light leading-[1.8] max-w-md">
            The chart shows the architecture. A live session reads it
            with you — line by line, pattern by pattern — until the
            shape of your tendencies comes clear.
          </p>
        </div>
        <Link
          href="/#booking"
          className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
        >
          Book a session
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
