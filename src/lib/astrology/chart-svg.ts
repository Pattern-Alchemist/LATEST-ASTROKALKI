/**
 * SVG chart renderer — AstroKalki M10-a.
 *
 * Renders a ChartData object as a North Indian style birth chart:
 *   - Square boundary with two diagonals (corner to corner)
 *   - Inner diamond connecting the midpoints of the four sides
 *   - 12 fixed compartments (houses), each labeled with its house
 *     number, zodiac sign glyph, and the abbreviations of any planets
 *     occupying it
 *
 * House 1 (Lagna / Ascendant) is always at the top center. Houses
 * proceed counter-clockwise around the chart (matching Vedic
 * convention): house 2 upper-left, house 3 left-upper, house 4 left
 * center, ..., house 12 upper-right.
 *
 * Visual style: black background (#050505), gold lines (#c9a96e),
 * white text for house numbers, gold for sign glyphs, off-white for
 * planet abbreviations. Cinzel-style font stack for sign glyphs.
 */

import {
  ZODIAC_SIGNS,
  PLANETS,
  type PlanetName,
} from './zodiac';
import type { ChartData } from './chart-calculator';

/* -------------------------------------------------------------------------- */
/*  Chart geometry                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The chart is drawn on a 400×400 viewBox. The outer square spans
 * (20, 20) to (380, 380) — a 360-pixel side with a 20-pixel margin
 * for labels.
 */
const SIZE = 400;
const MARGIN = 20;
const TOP = MARGIN;
const BOTTOM = SIZE - MARGIN;
const LEFT = MARGIN;
const RIGHT = SIZE - MARGIN;
const CENTER = SIZE / 2;

// Midpoints of the four sides — the diamond's vertices.
const TOP_MID = { x: CENTER, y: TOP };
const RIGHT_MID = { x: RIGHT, y: CENTER };
const BOTTOM_MID = { x: CENTER, y: BOTTOM };
const LEFT_MID = { x: LEFT, y: CENTER };

// Outer corners.
const TL = { x: LEFT, y: TOP };
const TR = { x: RIGHT, y: TOP };
const BR = { x: RIGHT, y: BOTTOM };
const BL = { x: LEFT, y: BOTTOM };

// Diamond-edge × diagonal intersection points. The diagonals cross
// the diamond's edges at the quarter-points of the diamond, creating
// the four "diamond quarter" compartments (kites) and the eight
// "corner sub-triangle" compartments. Computed by hand: each
// intersection is at 1/4 and 3/4 of the chart's span.
const SPAN = BOTTOM - TOP; // 360
const Q1 = TOP + SPAN / 4; // 110
const Q3 = TOP + (3 * SPAN) / 4; // 290

// Color palette (matches the AstroKalki design system).
const COLORS = {
  bg: '#050505',
  line: '#c9a96e',
  lineDim: '#c9a96e44',
  houseNumber: '#7a7a7a',
  signGlyph: '#c9a96e',
  planet: '#f0eee9',
  planetRetro: '#a58a54',
  ascendant: '#c9a96e',
  label: '#9a9a9a',
};

/* -------------------------------------------------------------------------- */
/*  House compartment definitions                                              */
/* -------------------------------------------------------------------------- */

interface Compartment {
  /** House number, 1..12. */
  house: number;
  /** Polygon vertices (in SVG coordinates). */
  points: { x: number; y: number }[];
  /** Centroid — used for text placement. */
  centroid: { x: number; y: number };
  /**
   * Offset for the house number (small, in a corner of the cell).
   * Determined per-cell so the number doesn't overlap planets.
   */
  numberOffset: { x: number; y: number };
}

/**
 * The 12 fixed compartments of a North Indian chart, going
 * counter-clockwise from house 1 at the top center.
 *
 * Cell layout:
 *   House 1  — top diamond quarter (kite)
 *   House 2  — top-left corner sub-triangle (top edge)
 *   House 3  — top-left corner sub-triangle (left edge)
 *   House 4  — left diamond quarter (kite)
 *   House 5  — bottom-left corner sub-triangle (left edge)
 *   House 6  — bottom-left corner sub-triangle (bottom edge)
 *   House 7  — bottom diamond quarter (kite)
 *   House 8  — bottom-right corner sub-triangle (bottom edge)
 *   House 9  — bottom-right corner sub-triangle (right edge)
 *   House 10 — right diamond quarter (kite)
 *   House 11 — top-right corner sub-triangle (right edge)
 *   House 12 — top-right corner sub-triangle (top edge)
 */
const COMPARTMENTS: Compartment[] = [
  // House 1 — top diamond quarter (kite)
  {
    house: 1,
    points: [TOP_MID, { x: Q3, y: Q1 }, { x: CENTER, y: CENTER }, { x: Q1, y: Q1 }],
    centroid: { x: CENTER, y: Q1 },
    numberOffset: { x: 0, y: -8 },
  },
  // House 2 — top-left corner sub-triangle on top edge
  {
    house: 2,
    points: [TL, TOP_MID, { x: Q1, y: Q1 }],
    centroid: { x: Q1, y: TOP + (Q1 - TOP) / 3 },
    numberOffset: { x: -8, y: -8 },
  },
  // House 3 — top-left corner sub-triangle on left edge
  {
    house: 3,
    points: [TL, { x: Q1, y: Q1 }, LEFT_MID],
    centroid: { x: LEFT + (Q1 - LEFT) / 3, y: Q1 },
    numberOffset: { x: -8, y: -8 },
  },
  // House 4 — left diamond quarter (kite)
  {
    house: 4,
    points: [LEFT_MID, { x: Q1, y: Q1 }, { x: CENTER, y: CENTER }, { x: Q1, y: Q3 }],
    centroid: { x: Q1, y: CENTER },
    numberOffset: { x: -8, y: 0 },
  },
  // House 5 — bottom-left corner sub-triangle on left edge
  {
    house: 5,
    points: [LEFT_MID, { x: Q1, y: Q3 }, BL],
    centroid: { x: LEFT + (Q1 - LEFT) / 3, y: Q3 },
    numberOffset: { x: -8, y: 8 },
  },
  // House 6 — bottom-left corner sub-triangle on bottom edge
  {
    house: 6,
    points: [BL, { x: Q1, y: Q3 }, BOTTOM_MID],
    centroid: { x: Q1, y: BOTTOM - (Q1 - LEFT) / 3 },
    numberOffset: { x: -8, y: 8 },
  },
  // House 7 — bottom diamond quarter (kite)
  {
    house: 7,
    points: [BOTTOM_MID, { x: Q1, y: Q3 }, { x: CENTER, y: CENTER }, { x: Q3, y: Q3 }],
    centroid: { x: CENTER, y: Q3 },
    numberOffset: { x: 0, y: 8 },
  },
  // House 8 — bottom-right corner sub-triangle on bottom edge
  {
    house: 8,
    points: [BOTTOM_MID, { x: Q3, y: Q3 }, BR],
    centroid: { x: Q3, y: BOTTOM - (Q1 - LEFT) / 3 },
    numberOffset: { x: 8, y: 8 },
  },
  // House 9 — bottom-right corner sub-triangle on right edge
  {
    house: 9,
    points: [BR, { x: Q3, y: Q3 }, RIGHT_MID],
    centroid: { x: RIGHT - (Q1 - LEFT) / 3, y: Q3 },
    numberOffset: { x: 8, y: 8 },
  },
  // House 10 — right diamond quarter (kite)
  {
    house: 10,
    points: [RIGHT_MID, { x: Q3, y: Q3 }, { x: CENTER, y: CENTER }, { x: Q3, y: Q1 }],
    centroid: { x: Q3, y: CENTER },
    numberOffset: { x: 8, y: 0 },
  },
  // House 11 — top-right corner sub-triangle on right edge
  {
    house: 11,
    points: [RIGHT_MID, { x: Q3, y: Q1 }, TR],
    centroid: { x: RIGHT - (Q1 - LEFT) / 3, y: Q1 },
    numberOffset: { x: 8, y: -8 },
  },
  // House 12 — top-right corner sub-triangle on top edge
  {
    house: 12,
    points: [TR, { x: Q3, y: Q1 }, TOP_MID],
    centroid: { x: Q3, y: TOP + (Q1 - TOP) / 3 },
    numberOffset: { x: 8, y: -8 },
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function pointsToAttr(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * XML-escape a string for safe embedding in SVG text content.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap a long planet list across multiple lines for cells with many
 * occupants (e.g. Stelliums). Returns an array of lines, each a
 * space-separated list of abbreviations.
 */
function chunkPlanets(
  abbrs: string[],
  maxPerLine: number,
): string[] {
  if (abbrs.length === 0) return [];
  if (abbrs.length <= maxPerLine) return [abbrs.join(' ')];
  const lines: string[] = [];
  for (let i = 0; i < abbrs.length; i += maxPerLine) {
    lines.push(abbrs.slice(i, i + maxPerLine).join(' '));
  }
  return lines;
}

/* -------------------------------------------------------------------------- */
/*  Main renderer                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Render a ChartData object as a North Indian style SVG chart.
 *
 * Returns the SVG as a string (no XML declaration — ready to drop
 * into an HTML document or persist as text in the database).
 */
export function renderChartSVG(chart: ChartData): string {
  const ascSignIndex = chart.ascendant.signIndex;

  // Group planets by house for cell rendering.
  const planetsByHouse = new Map<number, { name: PlanetName; retro: boolean }[]>();
  for (const planet of chart.planets) {
    if (planet.name === 'Ascendant') continue;
    const list = planetsByHouse.get(planet.house) ?? [];
    list.push({ name: planet.name, retro: planet.retrograde });
    planetsByHouse.set(planet.house, list);
  }

  // ─── Build SVG body ──────────────────────────────────────────────────
  const lines: string[] = [];

  // Outer square (with thick gold stroke).
  lines.push(
    `<rect x="${LEFT}" y="${TOP}" width="${SPAN}" height="${SPAN}" fill="${COLORS.bg}" stroke="${COLORS.line}" stroke-width="1.5"/>`
  );

  // Diagonals (corner to corner).
  lines.push(
    `<line x1="${TL.x}" y1="${TL.y}" x2="${BR.x}" y2="${BR.y}" stroke="${COLORS.line}" stroke-width="1"/>`
  );
  lines.push(
    `<line x1="${TR.x}" y1="${TR.y}" x2="${BL.x}" y2="${BL.y}" stroke="${COLORS.line}" stroke-width="1"/>`
  );

  // Inner diamond (4 edges connecting side midpoints).
  lines.push(
    `<polygon points="${pointsToAttr([TOP_MID, RIGHT_MID, BOTTOM_MID, LEFT_MID])}" fill="none" stroke="${COLORS.line}" stroke-width="1"/>`
  );

  // ─── House compartments ──────────────────────────────────────────────
  for (const cell of COMPARTMENTS) {
    const houseNumber = cell.house;
    // Sign of this house = ascendant's sign + (house - 1), mod 12.
    const signIndex = (ascSignIndex + houseNumber - 1 + 12) % 12;
    const sign = ZODIAC_SIGNS[signIndex];
    const planetsInHouse = planetsByHouse.get(houseNumber) ?? [];

    // House number — small, in the cell corner. The numberOffset is
    // applied to the centroid to nudge the label toward the appropriate
    // corner of the cell.
    const numX = cell.centroid.x + cell.numberOffset.x;
    const numY = cell.centroid.y + cell.numberOffset.y;
    lines.push(
      `<text x="${numX}" y="${numY}" fill="${COLORS.houseNumber}" font-size="10" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" text-anchor="middle" dominant-baseline="middle">${houseNumber}</text>`
    );

    // Sign glyph — placed near the centroid, offset to leave room for planets.
    // For diamond-quarter cells (houses 1, 4, 7, 10), the sign goes at the
    // top of the cell. For corner cells, it goes near the outer corner.
    const isDiamondQuarter = [1, 4, 7, 10].includes(houseNumber);
    const signOffsetY = isDiamondQuarter
      ? -16 // diamond quarters: sign above the centroid (toward the outer vertex)
      : 16; // corner cell: sign below the centroid (toward the inside)
    const signX = cell.centroid.x;
    const signY = cell.centroid.y + signOffsetY;
    lines.push(
      `<text x="${signX}" y="${signY}" fill="${COLORS.signGlyph}" font-size="18" font-family="'Cinzel', 'Georgia', serif" text-anchor="middle" dominant-baseline="middle">${escapeXml(sign.symbol)}</text>`
    );

    // Planet abbreviations — placed near the centroid. For diamond-quarter
    // cells, planets go below the sign glyph (toward the center). For corner
    // cells, planets go above the sign (toward the outer corner).
    if (planetsInHouse.length > 0) {
      const planetY = isDiamondQuarter
        ? cell.centroid.y + 14
        : cell.centroid.y - 14;
      const abbrLines = chunkPlanets(
        planetsInHouse.map((p) => {
          const meta = PLANETS.find((m) => m.name === p.name);
          if (!meta) return p.name.slice(0, 2);
          return p.retro ? `${meta.abbr}ᴿ` : meta.abbr;
        }),
        3,
      );
      abbrLines.forEach((line, idx) => {
        const y = planetY + idx * 13;
        lines.push(
          `<text x="${cell.centroid.x}" y="${y}" fill="${COLORS.planet}" font-size="11" font-family="'Cinzel', 'Georgia', serif" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`
        );
      });
    }
  }

  // ─── Ascendant marker ────────────────────────────────────────────────
  // A small "Asc" label inside House 1, marking it as the Lagna.
  const ascDeg = chart.ascendant.degreeInSign;
  const ascSign = ZODIAC_SIGNS[ascSignIndex];
  lines.push(
    `<text x="${CENTER}" y="${Q1 + 36}" fill="${COLORS.ascendant}" font-size="9" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">Asc ${ascSign.symbol} ${Math.floor(ascDeg)}°${String(Math.round((ascDeg % 1) * 60)).padStart(2, '0')}′</text>`
  );

  // ─── Assemble SVG ────────────────────────────────────────────────────
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="Vedic birth chart — North Indian style">${lines.join('')}</svg>`;

  return svg;
}

/* -------------------------------------------------------------------------- */
/*  Single-planet glyph export (for the planet positions table)               */
/* -------------------------------------------------------------------------- */

/**
 * Return the unicode glyph for a planet, for use in HTML table cells.
 */
export function planetGlyph(name: PlanetName): string {
  const meta = PLANETS.find((m) => m.name === name);
  return meta?.symbol ?? '?';
}

/**
 * Return the unicode glyph for a sign by index, for use in HTML.
 */
export function signGlyph(index: number): string {
  const i = ((Math.floor(index) % 12) + 12) % 12;
  return ZODIAC_SIGNS[i].symbol;
}
