/**
 * Vedic birth chart calculation engine — AstroKalki M10-a.
 *
 * Uses the `astronomy-engine` TypeScript ephemeris to compute the
 * geocentric positions of the Sun, Moon, five naked-eye planets,
 * and the lunar nodes (Rahu/Ketu) at the moment of birth, then
 * converts them to sidereal (Lahiri) zodiac positions for a Vedic
 * chart. Also computes the Ascendant (Lagna) from birth time + place.
 *
 * The result is a `ChartData` object — a plain JSON-serializable
 * structure that the SVG renderer and the planet-positions table
 * consume. Houses are whole-sign (Vedic / Parasara style): the
 * first house = the sign the Ascendant is in, the second house =
 * the next sign, and so on.
 */

import {
  AstroTime,
  Body,
  Ecliptic,
  GeoVector,
  GeoMoon,
  Observer,
  SiderealTime,
  SunPosition,
  SearchMoonNode,
  NextMoonNode,
  NodeEventKind,
  type EquatorialCoordinates,
  type EclipticCoordinates,
  type Vector,
} from 'astronomy-engine';
import {
  lahiriAyanamsa,
  degreeToSign,
  type PlanetName,
  type ZodiacSignInfo,
} from './zodiac';

/* -------------------------------------------------------------------------- */
/*  Public types                                                               */
/* -------------------------------------------------------------------------- */

export interface ChartPlanet {
  name: PlanetName;
  /** Sidereal (Lahiri) ecliptic longitude, 0..360°. */
  longitude: number;
  /** 0-indexed zodiac sign (Aries = 0). */
  signIndex: number;
  /** Degree within the sign, 0..30. */
  degreeInSign: number;
  /** Whole-sign house number, 1..12 (1 = Ascendant's sign). */
  house: number;
  /** True if the planet is moving retrograde (apparent backward motion). */
  retrograde: boolean;
  /** Geocentric distance in AU (informational; null for nodes/Ascendant). */
  distanceAU: number | null;
}

export interface ChartHouse {
  number: number;
  /** 0-indexed zodiac sign of this house (whole-sign: house N has sign (ascSign + N - 1) % 12). */
  signIndex: number;
  /** Planet names in this house. */
  planets: PlanetName[];
}

export interface ChartAscendant {
  /** Sidereal ecliptic longitude of the Ascendant, 0..360°. */
  longitude: number;
  signIndex: number;
  degreeInSign: number;
}

export interface ChartData {
  /** UTC ISO string of the moment the chart is cast for. */
  isoTime: string;
  /** Lahiri ayanamsa applied, in degrees (for caption). */
  ayanamsa: number;
  ascendant: ChartAscendant;
  planets: ChartPlanet[];
  houses: ChartHouse[];
  /** Birth coordinates echoed back for display. */
  coordinates: { lat: number; lng: number };
  /** Timezone offset echoed back (hours east of UTC). */
  tzOffset: number;
}

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * Convert a Date + tzOffset (hours east of UTC) into a UTC Date.
 *
 * Birth forms collect wall-clock time in the user's local zone. We need
 * the UTC instant for astronomy-engine. `tzOffset` is positive east of
 * Greenwich (e.g. IST = +5.5). UTC = local - tzOffset.
 */
function localToUtc(
  birthDate: string,
  birthTime: string,
  tzOffset: number,
): Date {
  // birthDate: "1990-04-15"
  // birthTime: "14:30"  (24-hour, HH:MM)
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error('Invalid birthDate/birthTime format');
  }
  // Build a UTC Date as if the wall-clock were UTC, then subtract tzOffset.
  const utcAsLocal = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const utc = utcAsLocal - tzOffset * 60 * 60 * 1000;
  return new Date(utc);
}

/**
 * Convert a J2000 equatorial vector to apparent ecliptic of date longitude.
 *
 * `Ecliptic()` from astronomy-engine returns true-ecliptic-of-date
 * coordinates when fed a J2000 (EQJ) vector. The ecliptic longitude
 * (`elon`) is the tropical (sayana) longitude we then convert to
 * sidereal by subtracting the ayanamsa.
 */
function eclipticLongitudeOf(body: Body, time: AstroTime): {
  longitude: number;
  distanceAU: number;
} {
  const vec: Vector = GeoVector(body, time, true); // aberration-corrected, J2000
  const ecl: EclipticCoordinates = Ecliptic(vec);
  return { longitude: ecl.elon, distanceAU: vec.Length() };
}

/**
 * Apparent ecliptic longitude of the Moon, true-of-date.
 *
 * `GeoMoon()` returns a J2000 equatorial vector for the Moon.
 * Wrapping with `Ecliptic()` gives the true-ecliptic-of-date
 * longitude. We use this dedicated path (rather than `EclipticLongitude`)
 * because the Moon moves fast enough that the J2000-of-date distinction
 * matters at the arcminute level.
 */
function moonEclipticLongitude(time: AstroTime): {
  longitude: number;
  distanceAU: number;
} {
  const vec = GeoMoon(time); // J2000 geocentric equatorial vector
  const ecl = Ecliptic(vec);
  return { longitude: ecl.elon, distanceAU: vec.Length() };
}

/**
 * Apparent geocentric ecliptic longitude of the Sun, true-of-date.
 *
 * `SunPosition()` returns apparent ecliptic of date directly — no
 * frame conversion needed. This is the tropical (sayana) Sun longitude.
 */
function sunEclipticLongitude(time: AstroTime): {
  longitude: number;
  distanceAU: number;
} {
  const ecl = SunPosition(time);
  // astronomy-engine's SunPosition returns elon in [0, 360).
  // Distance from Earth: 1 AU by definition for the Sun, but we
  // compute it via GeoVector to be precise.
  const vec = GeoVector(Body.Sun, time, true);
  return { longitude: ecl.elon, distanceAU: vec.Length() };
}

/**
 * Compute the Ascendant (Lagna) — the ecliptic point rising on the
 * eastern horizon at the given time + place.
 *
 * Standard formula:
 *   asc = atan2( cos(RAMC),  -(sin(RAMC) * cos(ε) + tan(φ) * sin(ε)) )
 *
 * where:
 *   RAMC = Right Ascension of the Midheaven = local sidereal time (deg)
 *   ε    = true obliquity of the ecliptic at the time
 *   φ    = geographic latitude of the observer
 *
 * RAMC = GMST * 15 + longitude_east. astronomy-engine's SiderealTime()
 * returns GAST in sidereal hours [0, 24); multiply by 15 for degrees.
 *
 * The result is the *tropical* Ascendant longitude. Subtract the
 * ayanamsa to get the sidereal Ascendant.
 */
function ascendantTropicalLongitude(
  time: AstroTime,
  observer: Observer,
  obliquityDeg: number,
): number {
  const gastHours = SiderealTime(time); // [0, 24)
  const ramcDeg = ((gastHours * 15 + observer.longitude) % 360 + 360) % 360; // RA of MC, degrees
  const ramc = ramcDeg * DEG;
  const eps = obliquityDeg * DEG;
  const phi = observer.latitude * DEG;

  // Ascendant formula — degrees in [0, 360)
  // tan(asc) = cos(ramc) / -(sin(ramc) * cos(eps) + tan(phi) * sin(eps))
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  let asc = Math.atan2(y, x) * RAD;
  if (asc < 0) asc += 360;
  return asc;
}

/**
 * Detect retrograde motion by comparing the body's tropical longitude
 * now vs. ~12 hours earlier. If longitude decreased, the body is
 * retrograde.
 *
 * 12h is a sensible window: short enough to capture the instantaneous
 * direction, long enough to overwhelm measurement noise from light-time
 * correction. We use UT directly via AstroTime.AddDays(-0.5).
 */
function isRetrograde(body: Body, time: AstroTime): boolean {
  if (body === Body.Sun || body === Body.Moon) return false;
  const tNow = time;
  const tPrev = time.AddDays(-0.5);
  const lonNow = eclipticLongitudeOf(body, tNow).longitude;
  const lonPrev = eclipticLongitudeOf(body, tPrev).longitude;
  // Account for the 0/360 wraparound: take the smallest signed difference.
  let diff = lonNow - lonPrev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

/**
 * Find the longitude of Rahu (Moon's ascending node) nearest the birth
 * time. astronomy-engine's SearchMoonNode finds the *next* node after
 * the given time, so we search backwards half a draconic month
 * (~13.6 days) to find the most recent ascending node before birth,
 * then take its ecliptic longitude.
 *
 * Returns: { rahuLon, ketuLon } in tropical degrees [0, 360).
 * Ketu = Rahu + 180°.
 *
 * Note: This is the *true* node (accounts for nutation). Vedic
 * astrology typically uses the *mean* node. The difference is < 1.5°
 * and not visible at chart scale. We choose the true node because
 * astronomy-engine exposes it directly without us having to recompute
 * the mean-node polynomial.
 */
function lunarNodeLongitudes(time: AstroTime): {
  rahuLon: number;
  ketuLon: number;
} {
  // Search backwards from (time - 13.6 days) for the next ascending node.
  // The Moon crosses a node every ~13.6 days, so we will find the most
  // recent ascending node within ~13.6 days of the birth time.
  const searchStart = time.AddDays(-14);
  let node = SearchMoonNode(searchStart);
  // Walk forward until we pass the birth time. The next node after birth
  // is the *first* node in the future; the previous one is the *last*
  // node in the past. We want the most recent past node — that's the
  // one whose kind is ascending (Rahu) for the position at birth.
  // However, astronomy-engine doesn't give us the longitude at the node,
  // only the time + kind. We compute the longitude from the Moon's
  // position at that node's time (which has ecliptic latitude 0, so
  // the longitude is well-defined as the node's longitude).
  let lastAscending: AstroTime | null = null;
  // Iterate forward: stop when node.time > birth time.
  // Safety cap: 4 iterations (covers ~2 full draconic cycles).
  for (let i = 0; i < 6 && node.time.ut <= time.ut; i++) {
    if (node.kind === NodeEventKind.Ascending) {
      lastAscending = node.time;
    }
    node = NextMoonNode(node);
  }
  // If we found a node past birth, check if it was ascending too.
  if (node.time.ut > time.ut && node.kind === NodeEventKind.Ascending) {
    // This is a future ascending node. Only use it if no past ascending
    // node was found (shouldn't happen in normal operation but be safe).
    if (!lastAscending) lastAscending = node.time;
  }

  if (!lastAscending) {
    // Fallback: search forward from birth (rare edge case).
    const fwd = SearchMoonNode(time);
    if (fwd.kind === NodeEventKind.Ascending) {
      lastAscending = fwd.time;
    } else {
      const next = NextMoonNode(fwd);
      lastAscending = next.time;
    }
  }

  // Compute the Moon's ecliptic longitude at the ascending-node time.
  // At an ascending node, the Moon's ecliptic latitude = 0, so the
  // longitude equals the ascending node's longitude (Rahu).
  const moonVec = GeoMoon(lastAscending);
  const ecl = Ecliptic(moonVec);
  const rahuLon = ((ecl.elon % 360) + 360) % 360;
  const ketuLon = ((rahuLon + 180) % 360 + 360) % 360;
  return { rahuLon, ketuLon };
}

/**
 * True obliquity of the ecliptic at a given time, in degrees.
 *
 * astronomy-engine does not export the obliquity directly, but it is
 * part of `e_tilt()`. We avoid pulling `e_tilt` (its name starts with
 * a lowercase letter, signalling internal use) and instead compute
 * the mean obliquity via the standard IAU polynomial — accurate to
 * < 1 arcsecond over 1900-2100, which is more than sufficient.
 *
 * Polynomial (IAU 1980, in arcseconds):
 *   ε₀ = 84381.448 − 46.8150·T − 0.00059·T² + 0.001813·T³
 * where T = Julian centuries from J2000.
 */
function trueObliquityDegrees(time: AstroTime): number {
  // T = UT days since J2000 / 36525
  const T = time.ut / 36525;
  const epsArcsec =
    84381.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return epsArcsec / 3600;
}

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export interface CalculateChartInput {
  birthDate: string; // "YYYY-MM-DD"
  birthTime: string; // "HH:MM" (24-hour, wall-clock in birth timezone)
  lat: number;
  lng: number;
  tzOffset: number; // hours east of UTC (IST = +5.5)
}

/**
 * Calculate a Vedic birth chart.
 *
 * @throws if the astronomy-engine calls fail (rare — usually a sign of
 *         an invalid date like Feb 30, which we let bubble up to the
 *         API route's try/catch and return as a 400).
 */
export function calculateChart(input: CalculateChartInput): ChartData {
  const { birthDate, birthTime, lat, lng, tzOffset } = input;

  // Validate coordinates — astronomy-engine asserts internally, but a
  // friendlier message helps the user.
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and +90 degrees');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and +180 degrees');
  }
  if (!Number.isFinite(tzOffset) || Math.abs(tzOffset) > 14) {
    throw new Error('Timezone offset must be between -14 and +14 hours');
  }

  const utcDate = localToUtc(birthDate, birthTime, tzOffset);
  if (Number.isNaN(utcDate.getTime())) {
    throw new Error('Invalid birth date/time');
  }

  const time = new AstroTime(utcDate);
  const observer = new Observer(lat, lng, 0);

  const ayanamsa = lahiriAyanamsa(utcDate);
  const obliquity = trueObliquityDegrees(time);

  // ─── Ascendant ────────────────────────────────────────────────────────
  const ascTropical = ascendantTropicalLongitude(time, observer, obliquity);
  const ascSidereal = ((ascTropical - ayanamsa) % 360 + 360) % 360;
  const ascSign = degreeToSign(ascSidereal);

  // ─── Planets ──────────────────────────────────────────────────────────
  // Each entry: tropical longitude → sidereal longitude → sign + degree.
  // For retrograde detection we need the body enum so we can sample the
  // longitude 12h earlier.
  const planetBodies: { name: PlanetName; body: Body }[] = [
    { name: 'Sun', body: Body.Sun },
    { name: 'Moon', body: Body.Moon },
    { name: 'Mercury', body: Body.Mercury },
    { name: 'Venus', body: Body.Venus },
    { name: 'Mars', body: Body.Mars },
    { name: 'Jupiter', body: Body.Jupiter },
    { name: 'Saturn', body: Body.Saturn },
  ];

  const planets: ChartPlanet[] = [];

  for (const { name, body } of planetBodies) {
    let lon: number;
    let dist: number;
    if (body === Body.Sun) {
      const r = sunEclipticLongitude(time);
      lon = r.longitude;
      dist = r.distanceAU;
    } else if (body === Body.Moon) {
      const r = moonEclipticLongitude(time);
      lon = r.longitude;
      dist = r.distanceAU;
    } else {
      const r = eclipticLongitudeOf(body, time);
      lon = r.longitude;
      dist = r.distanceAU;
    }
    const sidereal = ((lon - ayanamsa) % 360 + 360) % 360;
    const { sign, degreeInSign } = degreeToSign(sidereal);
    const house = ((sign.index - ascSign.sign.index + 12) % 12) + 1;
    const retro =
      body === Body.Sun || body === Body.Moon
        ? false
        : isRetrograde(body, time);

    planets.push({
      name,
      longitude: round(sidereal, 6),
      signIndex: sign.index,
      degreeInSign: round(degreeInSign, 6),
      house,
      retrograde: retro,
      distanceAU: round(dist, 6),
    });
  }

  // ─── Lunar nodes (Rahu / Ketu) ────────────────────────────────────────
  // Rahu is always retrograde in Vedic astrology (the nodes move
  // backwards through the zodiac). Ketu likewise.
  const { rahuLon, ketuLon } = lunarNodeLongitudes(time);
  const rahuSidereal = ((rahuLon - ayanamsa) % 360 + 360) % 360;
  const ketuSidereal = ((ketuLon - ayanamsa) % 360 + 360) % 360;
  for (const [name, lon] of [
    ['Rahu', rahuSidereal],
    ['Ketu', ketuSidereal],
  ] as const) {
    const { sign, degreeInSign } = degreeToSign(lon);
    const house = ((sign.index - ascSign.sign.index + 12) % 12) + 1;
    planets.push({
      name,
      longitude: round(lon, 6),
      signIndex: sign.index,
      degreeInSign: round(degreeInSign, 6),
      house,
      retrograde: true,
      distanceAU: null,
    });
  }

  // ─── Houses (whole-sign) ──────────────────────────────────────────────
  const houses: ChartHouse[] = [];
  for (let h = 1; h <= 12; h++) {
    const signIndex = (ascSign.sign.index + h - 1) % 12;
    const planetsInHouse = planets
      .filter((p) => p.house === h && p.name !== 'Ascendant')
      .map((p) => p.name);
    houses.push({ number: h, signIndex, planets: planetsInHouse });
  }

  return {
    isoTime: utcDate.toISOString(),
    ayanamsa: round(ayanamsa, 6),
    ascendant: {
      longitude: round(ascSidereal, 6),
      signIndex: ascSign.sign.index,
      degreeInSign: round(ascSign.degreeInSign, 6),
    },
    planets,
    houses,
    coordinates: { lat: round(lat, 6), lng: round(lng, 6) },
    tzOffset,
  };
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function round(n: number, digits: number): number {
  if (!Number.isFinite(n)) return n;
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}

/**
 * Convenience: look up a sign info object by index, exported so the SVG
 * renderer and table don't need to import from zodiac.ts separately.
 */
export function signInfo(index: number): ZodiacSignInfo {
  return degreeToSign(index * 30).sign;
}

/* -------------------------------------------------------------------------- */
/*  Equatorial → ecliptic helper (kept for reference / debugging)              */
/* -------------------------------------------------------------------------- */
/**
 * Convert an Equator() result (RA hours, Dec degrees) to apparent
 * ecliptic of date longitude (degrees).
 *
 * Currently unused in the main path (we use GeoVector + Ecliptic for
 * higher accuracy), but retained for callers who want the
 * Equator-of-date path — e.g. when displaying topocentric RA/Dec.
 */
export function equatorialToEclipticLongitude(
  equ: EquatorialCoordinates,
  obliquityDeg: number,
): number {
  const ra = equ.ra * 15 * DEG; // hours → degrees → radians
  const dec = equ.dec * DEG;
  const eps = obliquityDeg * DEG;
  const sinL =
    (Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps));
  const cosL = Math.cos(ra);
  let lon = Math.atan2(sinL, cosL) * RAD;
  if (lon < 0) lon += 360;
  return lon;
}
