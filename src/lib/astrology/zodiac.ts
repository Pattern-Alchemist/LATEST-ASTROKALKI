/**
 * Zodiac utilities for AstroKalki's Vedic birth chart calculator.
 *
 * Two coordinate systems are at play in any sidereal chart:
 *   - Tropical (sayana) longitude — the position astronomy-engine returns
 *     directly: 0° at the vernal equinox, increasing prograde.
 *   - Sidereal (nirayana) longitude — tropical minus the ayanamsa. This is
 *     what Vedic astrology uses; 0° Aries is fixed to a star (Spica, in the
 *     Lahiri system), not to the equinox.
 *
 * The Lahiri (Chitrapaksha) ayanamsa is the Indian government standard.
 * It drifts ~50.3 arcseconds per year. For 2025 the value is ~24.2°.
 * We compute it dynamically from the J2000 epoch so charts for any date
 * in the 20th/21st century are accurate to within a few arcseconds.
 */

export type ZodiacSignName =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type ElementName = 'fire' | 'earth' | 'air' | 'water';
export type QualityName = 'cardinal' | 'fixed' | 'mutable';

/**
 * The J2000 epoch: 12:00 UTC on 1 January 2000.
 * Used as the reference instant for the Lahiri ayanamsa formula.
 */
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/**
 * Lahiri ayanamsa at the J2000 epoch, in degrees.
 *
 * Reference: Indian Calendar Reform Committee (1955) + Saha & Lahiri.
 * The value 23.85° is the canonical Lahiri ayanamsa at J2000.
 */
export const LAHIRI_J2000_DEG = 23.85;

/**
 * Annual precession rate used to extrapolate the Lahiri ayanamsa.
 *
 * General precession is ~50.29" per year. We use 50.2564" to match the
 * Lahiri system's slightly different closed-form expression. The
 * resulting error is < 10 arcseconds across the 20th-21st century,
 * well below the resolution of an SVG chart.
 */
export const LAHIRI_PRECESSION_ARCSEC_PER_YEAR = 50.2564;

/**
 * Convenience constant: Lahiri ayanamsa for ~2025 (rounded).
 * Exported for display purposes (chart caption).
 */
export const LAHIRI_AYANAMSA_2025 = 24.2;

/**
 * Compute the Lahiri ayanamsa for any JavaScript Date.
 *
 * Linear extrapolation from J2000 using the precession rate. This is the
 * standard simplification used by most consumer-grade Vedic chart tools;
 * for the level of precision a 400×400 SVG can display, it is more than
 * sufficient.
 */
export function lahiriAyanamsa(date: Date | number): number {
  const ms = typeof date === 'number' ? date : date.getTime();
  const yearsSinceJ2000 =
    (ms - J2000_EPOCH_MS) / (365.25 * 24 * 60 * 60 * 1000);
  return (
    LAHIRI_J2000_DEG +
    (LAHIRI_PRECESSION_ARCSEC_PER_YEAR * yearsSinceJ2000) / 3600
  );
}

/* -------------------------------------------------------------------------- */
/*  Sign metadata                                                              */
/* -------------------------------------------------------------------------- */

export interface ZodiacSignInfo {
  /** 0-indexed sign number: Aries = 0, Pisces = 11. */
  index: number;
  /** Human-readable name. */
  name: ZodiacSignName;
  /** Unicode astrological glyph. */
  symbol: string;
  /** Classical element. */
  element: ElementName;
  /** Modality / quality. */
  quality: QualityName;
  /** Ruling planet (Vedic tradition). */
  ruler: PlanetName;
  /** Vedic glyph used in compact chart cells. */
  abbr: string;
}

export const ZODIAC_SIGNS: readonly ZodiacSignInfo[] = [
  { index: 0, name: 'Aries', symbol: '♈', element: 'fire', quality: 'cardinal', ruler: 'Mars', abbr: 'Ar' },
  { index: 1, name: 'Taurus', symbol: '♉', element: 'earth', quality: 'fixed', ruler: 'Venus', abbr: 'Ta' },
  { index: 2, name: 'Gemini', symbol: '♊', element: 'air', quality: 'mutable', ruler: 'Mercury', abbr: 'Ge' },
  { index: 3, name: 'Cancer', symbol: '♋', element: 'water', quality: 'cardinal', ruler: 'Moon', abbr: 'Ca' },
  { index: 4, name: 'Leo', symbol: '♌', element: 'fire', quality: 'fixed', ruler: 'Sun', abbr: 'Le' },
  { index: 5, name: 'Virgo', symbol: '♍', element: 'earth', quality: 'mutable', ruler: 'Mercury', abbr: 'Vi' },
  { index: 6, name: 'Libra', symbol: '♎', element: 'air', quality: 'cardinal', ruler: 'Venus', abbr: 'Li' },
  { index: 7, name: 'Scorpio', symbol: '♏', element: 'water', quality: 'fixed', ruler: 'Mars', abbr: 'Sc' },
  { index: 8, name: 'Sagittarius', symbol: '♐', element: 'fire', quality: 'mutable', ruler: 'Jupiter', abbr: 'Sa' },
  { index: 9, name: 'Capricorn', symbol: '♑', element: 'earth', quality: 'cardinal', ruler: 'Saturn', abbr: 'Cp' },
  { index: 10, name: 'Aquarius', symbol: '♒', element: 'air', quality: 'fixed', ruler: 'Saturn', abbr: 'Aq' },
  { index: 11, name: 'Pisces', symbol: '♓', element: 'water', quality: 'mutable', ruler: 'Jupiter', abbr: 'Pi' },
];

export function getSignByIndex(index: number): ZodiacSignInfo {
  const i = ((Math.floor(index) % 12) + 12) % 12;
  return ZODIAC_SIGNS[i];
}

export function getSignByName(name: ZodiacSignName): ZodiacSignInfo {
  const found = ZODIAC_SIGNS.find((s) => s.name === name);
  if (!found) throw new Error(`Unknown zodiac sign: ${name}`);
  return found;
}

/**
 * Convert a sidereal ecliptic longitude (0..360°) to a sign + degree-in-sign.
 *
 * `longitude` is expected to already have the Lahiri ayanamsa subtracted.
 * Returns a 0-indexed sign and the degree within that sign (0..30).
 */
export function degreeToSign(longitude: number): {
  sign: ZodiacSignInfo;
  degreeInSign: number;
} {
  // Normalize to [0, 360)
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  return { sign: getSignByIndex(signIndex), degreeInSign };
}

/**
 * Pretty-print a degree as "12°34′" (rounded to arcminutes).
 */
export function formatDegree(degree: number): string {
  const d = Math.floor(degree);
  const mFloat = (degree - d) * 60;
  const m = Math.round(mFloat);
  if (m === 60) {
    return `${d + 1}°00′`;
  }
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Pretty-print a degree with sign glyph: "♈ 12°34′"
 */
export function formatSignedDegree(longitude: number): string {
  const { sign, degreeInSign } = degreeToSign(longitude);
  return `${sign.symbol} ${formatDegree(degreeInSign)}`;
}

/* -------------------------------------------------------------------------- */
/*  Planet metadata                                                            */
/* -------------------------------------------------------------------------- */

export type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu'
  | 'Ascendant';

export interface PlanetMeta {
  name: PlanetName;
  /** Compact 2-letter glyph used in chart cells. */
  abbr: string;
  /** Unicode astrological symbol. */
  symbol: string;
  /** Short Vedic name (Sanskrit). */
  vedicName: string;
}

export const PLANETS: readonly PlanetMeta[] = [
  { name: 'Sun', abbr: 'Su', symbol: '☉', vedicName: 'Surya' },
  { name: 'Moon', abbr: 'Mo', symbol: '☽', vedicName: 'Chandra' },
  { name: 'Mercury', abbr: 'Me', symbol: '☿', vedicName: 'Budha' },
  { name: 'Venus', abbr: 'Ve', symbol: '♀', vedicName: 'Shukra' },
  { name: 'Mars', abbr: 'Ma', symbol: '♂', vedicName: 'Mangala' },
  { name: 'Jupiter', abbr: 'Ju', symbol: '♃', vedicName: 'Guru' },
  { name: 'Saturn', abbr: 'Sa', symbol: '♄', vedicName: 'Shani' },
  { name: 'Rahu', abbr: 'Ra', symbol: '☊', vedicName: 'Rahu' },
  { name: 'Ketu', abbr: 'Ke', symbol: '☋', vedicName: 'Ketu' },
  { name: 'Ascendant', abbr: 'As', symbol: 'Asc', vedicName: 'Lagna' },
];

export function getPlanetMeta(name: PlanetName): PlanetMeta {
  const found = PLANETS.find((p) => p.name === name);
  if (!found) throw new Error(`Unknown planet: ${name}`);
  return found;
}

/**
 * Planets that always travel with the Sun (never appear retrograde
 * in the sidereal sense). The luminaries and the lunar nodes are
 * excluded from retrograde detection.
 */
export const NON_RETROGRADE_BODIES: ReadonlySet<PlanetName> = new Set([
  'Sun',
  'Moon',
  'Rahu',
  'Ketu',
  'Ascendant',
]);
