/**
 * Transit calculator — AstroKalki M10-b/c/d.
 *
 * Computes the **current** sidereal positions of the Sun, Moon, five
 * naked-eye planets, and the lunar nodes (Rahu/Ketu) at any given
 * moment, using the same astronomy-engine ephemeris approach as
 * `chart-calculator.ts` (M10-a):
 *
 *   - astronomy-engine's `Body.GeoVector` for geocentric J2000 vectors
 *   - `Ecliptic()` for true-ecliptic-of-date longitudes
 *   - `SunPosition` for the apparent Sun
 *   - `GeoMoon` for the Moon
 *   - `SearchMoonNode` + `NextMoonNode` for Rahu/Ketu
 *   - Subtract the Lahiri ayanamsa (dynamic, accurate to <10 arcsec)
 *   - Retrograde detection via 12h longitude delta
 *
 * Performance: each `calculateTransits()` call makes ~30 astronomy-engine
 * calls (9 bodies × ~3 queries each including retrograde detection).
 * On a modern CPU this is <2ms. A 30-day forecast is therefore ~60ms
 * of pure compute — fast enough to compute lazily with a 1-hour cache.
 *
 * This module is read-only with respect to the chart calculator: it
 * re-derives sidereal positions rather than importing private helpers
 * from `chart-calculator.ts` (which is read-only per the M10-d spec).
 */

import {
  AstroTime,
  Body,
  Ecliptic,
  GeoVector,
  GeoMoon,
  SunPosition,
  SearchMoonNode,
  NextMoonNode,
  NodeEventKind,
  type Vector,
  type EclipticCoordinates,
} from 'astronomy-engine';
import {
  lahiriAyanamsa,
  degreeToSign,
  formatDegree,
  ZODIAC_SIGNS,
  type PlanetName,
} from './zodiac';

/* -------------------------------------------------------------------------- */
/*  Public types                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The 9 bodies for which we compute transits. Excludes `Ascendant`
 * (the Ascendant is a natal-only concept — it doesn't transit because
 * it changes every 4 minutes and depends on the observer's location).
 *
 * Sibling modules (M10-b/c's transit-prompt.ts, TransitDisplay.tsx)
 * use this type as the index for the `planets` record, so the set
 * must exactly match the keys present in `TransitData.planets`.
 */
export type TransitPlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu';

/**
 * Vedic ordering of planets (Sun → Moon → Mars → Mercury → Jupiter →
 * Venus → Saturn → Rahu → Ketu). Used by the transit wheel SVG and
 * the LLM prompt builder.
 */
export const TRANSIT_PLANET_ORDER: readonly TransitPlanetName[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
] as const;

export interface TransitPlanet {
  name: TransitPlanetName;
  /** Sidereal (Lahiri) ecliptic longitude, 0..360°. */
  longitude: number;
  /** 0-indexed zodiac sign (Aries = 0). */
  signIndex: number;
  /** Human-readable zodiac sign name (e.g. "Cancer"). */
  signName: string;
  /** Degree within the sign, 0..30. */
  degree: number;
  /** True if the planet is moving retrograde. */
  retrograde: boolean;
}

export interface TransitData {
  /** ISO timestamp the transits are cast for. */
  date: string;
  /** Lahiri ayanamsa applied, in degrees. */
  ayanamsa: number;
  /** Sidereal positions of all 9 bodies, keyed by planet name. */
  planets: Record<TransitPlanetName, TransitPlanet>;
}

export interface CalculateTransitsInput {
  /** The moment to cast transits for. Defaults to now. */
  date?: Date;
}

/* -------------------------------------------------------------------------- */
/*  Internal helpers — planet positions                                       */
/* -------------------------------------------------------------------------- */

function eclipticLongitudeOf(body: Body, time: AstroTime): number {
  const vec: Vector = GeoVector(body, time, true);
  const ecl: EclipticCoordinates = Ecliptic(vec);
  return ecl.elon;
}

function moonEclipticLongitude(time: AstroTime): number {
  const vec = GeoMoon(time);
  const ecl = Ecliptic(vec);
  return ecl.elon;
}

function sunEclipticLongitude(time: AstroTime): number {
  return SunPosition(time).elon;
}

/**
 * Rahu (Moon's ascending node) longitude — true node. Walks back from
 * (time − 14 days) to find the most recent ascending node, then takes
 * the Moon's ecliptic longitude at that node (latitude = 0 by
 * definition, so longitude is well-defined as the node's longitude).
 *
 * Mirrors `lunarNodeLongitudes` in `chart-calculator.ts`. Re-implemented
 * here because the original is not exported.
 */
function lunarNodeLongitude(time: AstroTime): number {
  const searchStart = time.AddDays(-14);
  let node = SearchMoonNode(searchStart);
  let lastAscending: AstroTime | null = null;
  for (let i = 0; i < 6 && node.time.ut <= time.ut; i++) {
    if (node.kind === NodeEventKind.Ascending) {
      lastAscending = node.time;
    }
    node = NextMoonNode(node);
  }
  if (node.time.ut > time.ut && node.kind === NodeEventKind.Ascending) {
    if (!lastAscending) lastAscending = node.time;
  }
  if (!lastAscending) {
    const fwd = SearchMoonNode(time);
    if (fwd.kind === NodeEventKind.Ascending) {
      lastAscending = fwd.time;
    } else {
      const next = NextMoonNode(fwd);
      lastAscending = next.time;
    }
  }
  const moonVec = GeoMoon(lastAscending);
  const ecl = Ecliptic(moonVec);
  return ((ecl.elon % 360) + 360) % 360;
}

/**
 * Detect retrograde motion by comparing the body's tropical longitude
 * now vs. ~12 hours earlier. Sun/Moon never retrograde.
 */
function isRetrograde(body: Body, time: AstroTime): boolean {
  // Sun/Moon never retrograde — short-circuit before any work.
  if (body === Body.Sun || body === Body.Moon) return false;
  const tPrev = time.AddDays(-0.5);
  const lonNow = eclipticLongitudeOf(body, time);
  const lonPrev = eclipticLongitudeOf(body, tPrev);
  let diff = lonNow - lonPrev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Calculate the transits for a given date (default: now).
 *
 * @throws if astronomy-engine calls fail (rare).
 */
export function calculateTransits(
  input: CalculateTransitsInput = {},
): TransitData {
  const date = input.date ?? new Date();
  const time = new AstroTime(date);
  const ayanamsa = lahiriAyanamsa(date);

  const planetBodies: { name: TransitPlanetName; body: Body }[] = [
    { name: 'Sun', body: Body.Sun },
    { name: 'Moon', body: Body.Moon },
    { name: 'Mars', body: Body.Mars },
    { name: 'Mercury', body: Body.Mercury },
    { name: 'Jupiter', body: Body.Jupiter },
    { name: 'Venus', body: Body.Venus },
    { name: 'Saturn', body: Body.Saturn },
  ];

  const planets: Record<TransitPlanetName, TransitPlanet> =
    {} as Record<TransitPlanetName, TransitPlanet>;

  for (const { name, body } of planetBodies) {
    let lon: number;
    if (body === Body.Sun) {
      lon = sunEclipticLongitude(time);
    } else if (body === Body.Moon) {
      lon = moonEclipticLongitude(time);
    } else {
      lon = eclipticLongitudeOf(body, time);
    }
    const sidereal = ((lon - ayanamsa) % 360 + 360) % 360;
    const { sign, degreeInSign } = degreeToSign(sidereal);
    const retro = isRetrograde(body, time);
    planets[name] = {
      name,
      longitude: round(sidereal, 4),
      signIndex: sign.index,
      signName: sign.name,
      degree: round(degreeInSign, 4),
      retrograde: retro,
    };
  }

  // ─── Lunar nodes (Rahu / Ketu) ────────────────────────────────────────
  // Always retrograde in Vedic convention.
  const rahuTropical = lunarNodeLongitude(time);
  const ketuTropical = (rahuTropical + 180) % 360;
  for (const [name, lonT] of [
    ['Rahu', rahuTropical],
    ['Ketu', ketuTropical],
  ] as const) {
    const sidereal = ((lonT - ayanamsa) % 360 + 360) % 360;
    const { sign, degreeInSign } = degreeToSign(sidereal);
    planets[name] = {
      name,
      longitude: round(sidereal, 4),
      signIndex: sign.index,
      signName: sign.name,
      degree: round(degreeInSign, 4),
      retrograde: true,
    };
  }

  return {
    date: date.toISOString(),
    ayanamsa: round(ayanamsa, 4),
    planets,
  };
}

/**
 * Convenience: transits for the current moment. Async to match the
 * sibling API contract (M10-b/c's check-in route awaits this).
 */
export async function getTodaysTransits(): Promise<TransitData> {
  return calculateTransits({ date: new Date() });
}

/* -------------------------------------------------------------------------- */
/*  Public helpers used by sibling routes                                     */
/* -------------------------------------------------------------------------- */

/**
 * Format a within-sign degree as "12°34′" (rounded to arcminutes).
 * Wraps `formatDegree` from zodiac.ts under the name sibling code
 * expects.
 */
export function formatTransitDegree(degree: number): string {
  return formatDegree(degree);
}

/**
 * Unicode astrological glyph for each transit planet. Used by the
 * transit wheel SVG and the planet-position table.
 */
const TRANSIT_PLANET_GLYPH: Record<TransitPlanetName, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
};

export function transitPlanetGlyph(name: TransitPlanetName): string {
  return TRANSIT_PLANET_GLYPH[name] ?? '';
}

/**
 * Sanskrit (Vedic) name for each transit planet.
 */
const TRANSIT_PLANET_VEDIC_NAME: Record<TransitPlanetName, string> = {
  Sun: 'Surya',
  Moon: 'Chandra',
  Mars: 'Mangala',
  Mercury: 'Budha',
  Jupiter: 'Guru',
  Venus: 'Shukra',
  Saturn: 'Shani',
  Rahu: 'Rahu',
  Ketu: 'Ketu',
};

export function transitPlanetVedicName(name: TransitPlanetName): string {
  return TRANSIT_PLANET_VEDIC_NAME[name] ?? name;
}

/**
 * Count the number of retrograde planets in a transit set.
 * (Rahu/Ketu always count as retrograde by Vedic convention.)
 */
export function retrogradeCount(transits: TransitData): number {
  return TRANSIT_PLANET_ORDER.filter(
    (name) => transits.planets[name]?.retrograde,
  ).length;
}

/**
 * Human-readable retrograde summary, e.g.
 *   "Saturn and Mercury are retrograde"
 *   "Saturn is retrograde"
 *   "No planets are retrograde"
 */
export function retrogradeSummary(transits: TransitData): string {
  const retro = TRANSIT_PLANET_ORDER.filter(
    (name) => transits.planets[name]?.retrograde,
  );
  if (retro.length === 0) return 'No planets are retrograde';
  if (retro.length === 1) return `${retro[0]} is retrograde`;
  if (retro.length === 2) return `${retro[0]} and ${retro[1]} are retrograde`;
  const head = retro.slice(0, -1).join(', ');
  return `${head}, and ${retro[retro.length - 1]} are retrograde`;
}

/**
 * Render a compact transit-wheel SVG (200×200). The wheel shows the 12
 * zodiac sign divisions and the 9 planet glyphs placed at their
 * sidereal longitudes. Rahu/Ketu are drawn with their nodal glyphs.
 *
 * Used by `/api/transits/today` for the public transit page.
 */
export function renderTransitWheelSVG(transits: TransitData): string {
  const SIZE = 200;
  const R = 90;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const labelR = 100;
  const planetR = 70;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="Planetary transit wheel for ${transits.date}">`,
  );
  parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="#050505"/>`);

  // Outer ring
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#c9a96e" stroke-width="0.8" opacity="0.6"/>`,
  );

  // 12 sign dividers
  for (let i = 0; i < 12; i++) {
    const ang = (i * 30 - 90) * (Math.PI / 180);
    const x1 = cx + Math.cos(ang) * (R - 6);
    const y1 = cy + Math.sin(ang) * (R - 6);
    const x2 = cx + Math.cos(ang) * R;
    const y2 = cy + Math.sin(ang) * R;
    parts.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>`,
    );
    // Sign glyph on the outer ring
    const gx = cx + Math.cos(ang + 15 * (Math.PI / 180)) * labelR;
    const gy = cy + Math.sin(ang + 15 * (Math.PI / 180)) * labelR;
    parts.push(
      `<text x="${gx.toFixed(2)}" y="${gy.toFixed(2)}" fill="#7a7a7a" font-size="8" text-anchor="middle" dominant-baseline="middle" font-family="Cinzel, Georgia, serif">${ZODIAC_SIGNS[i].symbol}</text>`,
    );
  }

  // Planet glyphs at their sidereal longitudes
  for (const name of TRANSIT_PLANET_ORDER) {
    const p = transits.planets[name];
    if (!p) continue;
    // Convert sidereal longitude to SVG angle (0° Aries at the 9 o'clock
    // position, going counter-clockwise).
    const ang = (p.longitude - 90) * (Math.PI / 180);
    const px = cx + Math.cos(ang) * planetR;
    const py = cy + Math.sin(ang) * planetR;
    const color = p.retrograde ? '#c9a96e' : '#f0eee9';
    const glyph = transitPlanetGlyph(name);
    parts.push(
      `<text x="${px.toFixed(2)}" y="${py.toFixed(2)}" fill="${color}" font-size="11" text-anchor="middle" dominant-baseline="middle" font-family="Cinzel, Georgia, serif">${glyph}</text>`,
    );
    if (p.retrograde) {
      parts.push(
        `<text x="${(px + 7).toFixed(2)}" y="${(py - 7).toFixed(2)}" fill="#c9a96e" font-size="6" text-anchor="middle" dominant-baseline="middle" font-family="monospace">℞</text>`,
      );
    }
  }

  // Center caption — date + ayanamsa
  const dateStr = transits.date.slice(0, 10);
  parts.push(
    `<text x="${cx}" y="${cy - 5}" fill="#c9a96e" font-size="7" text-anchor="middle" font-family="monospace" opacity="0.8">${dateStr}</text>`,
  );
  parts.push(
    `<text x="${cx}" y="${cy + 7}" fill="#5a5a5a" font-size="6" text-anchor="middle" font-family="monospace">ayanamsa ${transits.ayanamsa.toFixed(2)}°</text>`,
  );

  parts.push('</svg>');
  return parts.join('');
}

/* -------------------------------------------------------------------------- */
/*  Internal — aspect computation (used by pattern-activation.ts)             */
/*  Exposed as a separate helper so the aspect layer can be reused without    */
/*  recomputing positions.                                                    */
/* -------------------------------------------------------------------------- */

export type AspectType =
  | 'conjunction'
  | 'opposition'
  | 'square'
  | 'trine'
  | 'sextile';

export interface TransitAspect {
  transitPlanet: TransitPlanetName;
  natalPlanet: PlanetName | 'Ascendant';
  aspect: AspectType;
  /** Exact aspect angle (0, 60, 90, 120, 180). */
  angle: number;
  /** |actual difference − angle|, in degrees. */
  orb: number;
  /** True if the transit planet is moving toward exact. */
  applying: boolean;
}

interface AspectDef {
  type: AspectType;
  angle: number;
  orb: number;
}

const ASPECT_DEFS: readonly AspectDef[] = [
  { type: 'conjunction', angle: 0, orb: 3 },
  { type: 'opposition', angle: 180, orb: 3 },
  { type: 'square', angle: 90, orb: 2.5 },
  { type: 'trine', angle: 120, orb: 3 },
  { type: 'sextile', angle: 60, orb: 2 },
] as const;

function signedAngleDiff(a: number, b: number): number {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

function findAspect(
  transitLon: number,
  natalLon: number,
  transitLonFuture: number,
): { def: AspectDef; orb: number; applying: boolean } | null {
  const diff = signedAngleDiff(transitLon, natalLon);
  const diffFuture = signedAngleDiff(transitLonFuture, natalLon);
  let best: { def: AspectDef; orb: number; applying: boolean } | null = null;
  for (const def of ASPECT_DEFS) {
    const orbNow = Math.min(
      Math.abs(diff - def.angle),
      Math.abs(diff + def.angle),
    );
    if (orbNow > def.orb) continue;
    if (best === null || orbNow < best.orb) {
      const orbFuture = Math.min(
        Math.abs(diffFuture - def.angle),
        Math.abs(diffFuture + def.angle),
      );
      const applying = orbFuture < orbNow;
      best = { def, orb: orbNow, applying };
    }
  }
  return best;
}

/**
 * Compute the aspects between a TransitData (transit positions) and a
 * natal ChartData (natal positions). Internal helper exposed for the
 * pattern-activation engine.
 *
 * Aspects include the Ascendant as a natal "body". Self-aspects
 * (transit Sun → natal Sun, etc.) ARE meaningful — a transit return
 * is a real event — so they are kept.
 */
export function computeTransitAspects(
  transits: TransitData,
  natal: import('./chart-calculator').ChartData,
): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  // Build natal-longitude lookup.
  const natalBy = new Map<PlanetName | 'Ascendant', number>();
  for (const p of natal.planets) {
    natalBy.set(p.name, p.longitude);
  }
  if (natal.ascendant) {
    natalBy.set('Ascendant', natal.ascendant.longitude);
  }

  // Pre-compute each transit planet's longitude 12h in the future for
  // applying/separating detection. We sample by recomputing positions.
  const futureDate = new Date(new Date(transits.date).getTime() + 12 * 60 * 60 * 1000);
  const futureTransits = calculateTransits({ date: futureDate });

  for (const name of TRANSIT_PLANET_ORDER) {
    const tPos = transits.planets[name];
    if (!tPos) continue;
    const tLon = tPos.longitude;
    const tLonFuture = futureTransits.planets[name]?.longitude ?? tLon;
    for (const [nName, nLon] of natalBy) {
      const hit = findAspect(tLon, nLon, tLonFuture);
      if (!hit) continue;
      aspects.push({
        transitPlanet: name,
        natalPlanet: nName,
        aspect: hit.def.type,
        angle: hit.def.angle,
        orb: round(hit.orb, 2),
        applying: hit.applying,
      });
    }
  }

  return aspects;
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function round(n: number, digits: number): number {
  if (!Number.isFinite(n)) return n;
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}
