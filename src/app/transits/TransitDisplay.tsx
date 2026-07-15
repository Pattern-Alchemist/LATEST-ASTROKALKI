"use client";

/**
 * TransitDisplay — client component for the /transits page.
 *
 * Receives today's transit data + the server-rendered wheel SVG and
 * lays them out: the wheel on the left, the planet table on the right
 * (stacks on mobile). The table is the canonical reference; the wheel
 * is the visual.
 *
 * Pure presentational — no state, no fetches. All the heavy lifting
 * (ephemeris calculation, SVG rendering) happened server-side.
 */

import { useMemo } from "react";
import type { TransitData, TransitPlanetName } from "@/lib/astrology/transits";
import {
  TRANSIT_PLANET_ORDER,
  formatTransitDegree,
  transitPlanetGlyph,
  transitPlanetVedicName,
} from "@/lib/astrology/transits";
import { ZODIAC_SIGNS } from "@/lib/astrology/zodiac";

interface TransitDisplayProps {
  transits: TransitData;
  /** The pre-rendered wheel SVG markup. */
  wheelSvg: string;
  /** How many planets are currently retrograde (for the badge). */
  retrogradeCount: number;
}

const VEDIC_NAMES: Record<TransitPlanetName, string> = {
  Sun: "Surya",
  Moon: "Chandra",
  Mars: "Mangala",
  Mercury: "Budha",
  Jupiter: "Guru",
  Venus: "Shukra",
  Saturn: "Shani",
  Rahu: "Rahu",
  Ketu: "Ketu",
};

export default function TransitDisplay({
  transits,
  wheelSvg,
  retrogradeCount,
}: TransitDisplayProps) {
  // Build the table rows in canonical Vedic order.
  const rows = useMemo(
    () =>
      TRANSIT_PLANET_ORDER.map((name) => {
        const p = transits.planets[name];
        const sign = ZODIAC_SIGNS[p.signIndex];
        return {
          name,
          glyph: transitPlanetGlyph(name),
          vedicName: transitPlanetVedicName(name),
          sign,
          degree: p.degree,
          longitude: p.longitude,
          retrograde: p.retrograde,
        };
      }),
    [transits],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
      {/* ─── Wheel ───────────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <div
          className="w-full max-w-[360px] aspect-square"
          // SVG generated server-side from validated ephemeris output.
          dangerouslySetInnerHTML={{ __html: wheelSvg }}
          aria-label="Transit wheel — sidereal planetary positions"
          role="img"
        />
      </div>

      {/* ─── Planet table ────────────────────────────────────────────── */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light">
            Planetary positions · sidereal
          </p>
          {retrogradeCount > 0 && (
            <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#a58a54] font-mono">
              <span className="text-[#a58a54]">℞</span>
              {retrogradeCount} retrograde
            </span>
          )}
        </div>

        <div className="border-t border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-3 pr-3 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    Planet
                  </th>
                  <th className="py-3 pr-3 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    Sign
                  </th>
                  <th className="py-3 pr-3 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                    Degree
                  </th>
                  <th className="py-3 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light text-right">
                    State
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.name}
                    className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-lg text-[#c9a96e] w-5 text-center"
                          aria-hidden
                        >
                          {r.glyph}
                        </span>
                        <div className="flex flex-col">
                          <span
                            className="text-sm text-[#f0eee9] font-light"
                            style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                          >
                            {r.name}
                          </span>
                          <span className="text-[10px] tracking-[0.1em] text-[#5a5a5a] font-light">
                            {VEDIC_NAMES[r.name]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base text-[#c9a96e]" aria-hidden>
                          {r.sign.symbol}
                        </span>
                        <span
                          className="text-sm text-[#cfcabf] font-light"
                          style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                        >
                          {r.sign.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-sm text-[#cfcabf] font-mono">
                        {formatTransitDegree(r.degree)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {r.retrograde ? (
                        <span className="inline-flex items-center gap-1 text-[11px] tracking-[0.15em] uppercase text-[#a58a54] font-light">
                          <span className="text-[#a58a54]">℞</span>
                          Retro
                        </span>
                      ) : (
                        <span className="text-[11px] tracking-[0.15em] uppercase text-[#5a5a5a] font-light">
                          Direct
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Caption — the ephemeris provenance */}
        <p className="mt-6 text-[11px] text-[#5a5a5a] font-light leading-[1.7] max-w-md">
          Computed at noon UTC via the JPL planetary ephemeris, with the
          Lahiri (Chitrapaksha) ayanamsa applied. Sidereal longitudes —
          the Vedic convention. Rahu and Ketu are always retrograde by
          definition (the lunar nodes move backwards through the zodiac).
        </p>
      </div>
    </div>
  );
}
