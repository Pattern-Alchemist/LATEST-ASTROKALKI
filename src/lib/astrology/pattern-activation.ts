/**
 * Pattern Activation engine — AstroKalki M10-b/c/d.
 *
 * Maps transit-to-natal aspects (and sign-based transit placements)
 * onto the 10 Atlas psychological patterns. This is the layer that
 * translates astronomy into AstroKalki's psychological vocabulary:
 *   "Saturn transiting your natal Moon (conjunction, 1.5° orb)"
 *      → "the-abandonment pattern is being activated (intensity 0.92)"
 *
 * The mapping is a curated rule set derived from the psychological-
 * astrological correspondences in the Atlas pattern `chartSignature`
 * field. Each rule maps a (transit planet → natal planet, aspect)
 * combination to one Atlas pattern slug, with a reason template that
 * explains the activation in plain English.
 *
 * When no birth chart is on file, only sign-based and retrograde-based
 * activations are produced — these are general activations that apply
 * to anyone.
 *
 * Intensity scale (0.3 – 1.0):
 *   - Conjunction  = 1.00 base
 *   - Opposition   = 0.90 base
 *   - Square       = 0.85 base
 *   - Trine        = 0.55 base
 *   - Sextile      = 0.35 base
 *   - Sign-based   = 0.40 base
 *   - Retrograde   = 0.50 base
 * Modifiers:
 *   - Applying aspect  +0.05 (peak is approaching)
 *   - Separating       −0.05
 *   - Per 0.5° of orb  −0.05
 *   - Clamped to [0.30, 1.00]
 */

import type { ChartData } from './chart-calculator';
import {
  calculateTransits,
  computeTransitAspects,
  TRANSIT_PLANET_ORDER,
  type AspectType,
  type TransitAspect,
  type TransitData,
  type TransitPlanet,
  type TransitPlanetName,
} from './transits';
import type { PlanetName } from './zodiac';
import { degreeToSign } from './zodiac';
import { getAtlasPattern } from '@/lib/content/patterns/atlas';

/* -------------------------------------------------------------------------- */
/*  Public types                                                               */
/* -------------------------------------------------------------------------- */

export interface PatternActivation {
  /** Atlas pattern slug (e.g. "the-abandonment"). Used as React key + URL. */
  pattern: string;
  /** Human-readable Atlas pattern name (e.g. "The Abandonment Pattern"). */
  patternName: string;
  /** Activation intensity, 0.3 – 1.0. */
  intensity: number;
  /** Plain-English explanation of WHY this pattern is activated. */
  reason: string;
}

/* -------------------------------------------------------------------------- */
/*  Natal-chart guard                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Type guard: returns true if the given object looks like a valid
 * ChartData (has the fields we rely on). Used by the check-in route
 * to bail out of malformed DB rows.
 */
export function hasNatalChart(chart: unknown): chart is ChartData {
  if (!chart || typeof chart !== 'object') return false;
  const c = chart as Partial<ChartData>;
  return (
    Array.isArray(c.planets) &&
    c.planets.length > 0 &&
    typeof c.ascendant === 'object' &&
    c.ascendant !== null &&
    typeof c.isoTime === 'string'
  );
}

/* -------------------------------------------------------------------------- */
/*  Aspect → intensity base                                                    */
/* -------------------------------------------------------------------------- */

const ASPECT_BASE_INTENSITY: Record<AspectType, number> = {
  conjunction: 1.0,
  opposition: 0.9,
  square: 0.85,
  trine: 0.55,
  sextile: 0.35,
};

const SIGN_BASE_INTENSITY = 0.4;
const RETROGRADE_BASE_INTENSITY = 0.5;

function aspectIntensity(
  aspect: AspectType,
  orb: number,
  applying: boolean,
): number {
  const base = ASPECT_BASE_INTENSITY[aspect] ?? 0.5;
  const orbPenalty = (orb / 0.5) * 0.05;
  const applyMod = applying ? 0.05 : -0.05;
  const intensity = base - orbPenalty + applyMod;
  return clamp(intensity, 0.3, 1.0);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/*  Rule tables — transit-planet → natal-planet → pattern                     */
/* -------------------------------------------------------------------------- */

interface NatalAspectRule {
  transit: TransitPlanetName;
  natal: PlanetName | 'Ascendant';
  aspects: ReadonlySet<AspectType>;
  pattern: string;
  reason: (
    orb: number,
    applying: boolean,
    aspect: AspectType,
  ) => string;
}

const HARD_ASPECTS = new Set<AspectType>([
  'conjunction',
  'opposition',
  'square',
]);
const ALL_ASPECTS = new Set<AspectType>([
  'conjunction',
  'opposition',
  'square',
  'trine',
  'sextile',
]);

const NATAL_ASPECT_RULES: readonly NatalAspectRule[] = [
  // ─── the-abandonment ───────────────────────────────────────────────────
  {
    transit: 'Saturn',
    natal: 'Moon',
    aspects: HARD_ASPECTS,
    pattern: 'the-abandonment',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the mother line is under weight. The abandonment pattern often surfaces when Saturn contacts the Moon.`,
  },
  {
    transit: 'Moon',
    natal: 'Saturn',
    aspects: HARD_ASPECTS,
    pattern: 'the-abandonment',
    reason: (orb, applying, aspect) =>
      `The Moon ${aspect} your natal Saturn (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — for a few hours the old grief is closer to the surface.`,
  },
  // ─── the-rescuer ─────────────────────────────────────────────────────
  {
    transit: 'Venus',
    natal: 'Moon',
    aspects: ALL_ASPECTS,
    pattern: 'the-rescuer',
    reason: (orb, applying, aspect) =>
      `Venus ${aspect} your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — love and care are entangled. Watch the impulse to rescue.`,
  },
  {
    transit: 'Venus',
    natal: 'Ascendant',
    aspects: ALL_ASPECTS,
    pattern: 'the-rescuer',
    reason: (orb, applying, aspect) =>
      `Venus ${aspect} your Ascendant (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the impulse to be needed is closer to the surface.`,
  },
  // ─── the-emotional-caretaker ──────────────────────────────────────────
  {
    transit: 'Moon',
    natal: 'Venus',
    aspects: ALL_ASPECTS,
    pattern: 'the-emotional-caretaker',
    reason: (orb, applying, aspect) =>
      `The Moon ${aspect} your natal Venus (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the caretaker is closer to the surface. Notice whose feelings you start managing.`,
  },
  {
    transit: 'Jupiter',
    natal: 'Moon',
    aspects: ALL_ASPECTS,
    pattern: 'the-emotional-caretaker',
    reason: (orb, applying, aspect) =>
      `Jupiter ${aspect} your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the urge to hold space for others expands. Watch where you overextend.`,
  },
  // ─── the-performer ───────────────────────────────────────────────────
  {
    transit: 'Sun',
    natal: 'Sun',
    aspects: new Set<AspectType>(['conjunction']),
    pattern: 'the-performer',
    reason: (orb, applying) =>
      `The transiting Sun returns to its natal position (${orb.toFixed(
        1,
      )}° orb, ${
        applying ? 'approaching exact' : 'just past'
      }) — your solar return. The performer in you wants recognition.`,
  },
  {
    transit: 'Jupiter',
    natal: 'Sun',
    aspects: ALL_ASPECTS,
    pattern: 'the-performer',
    reason: (orb, applying, aspect) =>
      `Jupiter ${aspect} your natal Sun (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the drive to be seen expands. The performer pattern is closer to the surface.`,
  },
  // ─── the-invisible-child ─────────────────────────────────────────────
  {
    transit: 'Sun',
    natal: 'Moon',
    aspects: HARD_ASPECTS,
    pattern: 'the-invisible-child',
    reason: (orb, applying, aspect) =>
      `The Sun ${aspect} your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the part of you that learned to be unseen stirs.`,
  },
  // ─── the-self-sabotage ───────────────────────────────────────────────
  {
    transit: 'Mars',
    natal: 'Saturn',
    aspects: HARD_ASPECTS,
    pattern: 'the-self-sabotage',
    reason: (orb, applying, aspect) =>
      `Mars ${aspect} your natal Saturn (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the impulse to push against the wall you built is sharp.`,
  },
  {
    transit: 'Saturn',
    natal: 'Mars',
    aspects: HARD_ASPECTS,
    pattern: 'the-self-sabotage',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your natal Mars (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — old frustration with authority turns inward. Watch the self-sabotage reflex.`,
  },
  {
    transit: 'Sun',
    natal: 'Saturn',
    aspects: HARD_ASPECTS,
    pattern: 'the-self-sabotage',
    reason: (orb, applying, aspect) =>
      `The Sun ${aspect} your natal Saturn (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the father line presses. The self-critic sharpens.`,
  },
  {
    transit: 'Mars',
    natal: 'Moon',
    aspects: HARD_ASPECTS,
    pattern: 'the-self-sabotage',
    reason: (orb, applying, aspect) =>
      `Mars ${aspect} your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — heat moves into the emotional body. Watch the reflex to lash out or shut down.`,
  },
  // ─── the-chaser ──────────────────────────────────────────────────────
  {
    transit: 'Rahu',
    natal: 'Venus',
    aspects: new Set<AspectType>(['conjunction']),
    pattern: 'the-chaser',
    reason: (orb, applying) =>
      `Rahu conjoins your natal Venus (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the hunger for connection sharpens. The chaser pattern is activated.`,
  },
  {
    transit: 'Mars',
    natal: 'Venus',
    aspects: HARD_ASPECTS,
    pattern: 'the-chaser',
    reason: (orb, applying, aspect) =>
      `Mars ${aspect} your natal Venus (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — pursuit and desire are entangled. Watch the chase.`,
  },
  {
    transit: 'Rahu',
    natal: 'Moon',
    aspects: new Set<AspectType>(['conjunction']),
    pattern: 'the-chaser',
    reason: (orb, applying) =>
      `Rahu conjoins your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — emotional hunger sharpens. Notice the impulse to chase connection.`,
  },
  // ─── the-avoider ─────────────────────────────────────────────────────
  {
    transit: 'Saturn',
    natal: 'Venus',
    aspects: HARD_ASPECTS,
    pattern: 'the-avoider',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your natal Venus (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — love feels heavy. The avoider pattern is closer to the surface.`,
  },
  {
    transit: 'Ketu',
    natal: 'Venus',
    aspects: new Set<AspectType>(['conjunction']),
    pattern: 'the-avoider',
    reason: (orb, applying) =>
      `Ketu conjoins your natal Venus (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — disconnection is closer. Watch the impulse to withdraw.`,
  },
  {
    transit: 'Ketu',
    natal: 'Moon',
    aspects: new Set<AspectType>(['conjunction']),
    pattern: 'the-avoider',
    reason: (orb, applying) =>
      `Ketu conjoins your natal Moon (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the impulse to detach from feeling is sharp.`,
  },
  // ─── the-outsider ────────────────────────────────────────────────────
  {
    transit: 'Saturn',
    natal: 'Ascendant',
    aspects: HARD_ASPECTS,
    pattern: 'the-outsider',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your Ascendant (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the sense of being on the outside sharpens. The outsider pattern is activated.`,
  },
  {
    transit: 'Saturn',
    natal: 'Jupiter',
    aspects: HARD_ASPECTS,
    pattern: 'the-outsider',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your natal Jupiter (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the part of you that learned you don't quite belong stirs.`,
  },
  // ─── the-hyper-independent ────────────────────────────────────────────
  {
    transit: 'Saturn',
    natal: 'Sun',
    aspects: HARD_ASPECTS,
    pattern: 'the-hyper-independent',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your natal Sun (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the impulse to handle it alone sharpens. The hyper-independent pattern is closer to the surface.`,
  },
  // ─── the-overthinker ─────────────────────────────────────────────────
  {
    transit: 'Mercury',
    natal: 'Mercury',
    aspects: ALL_ASPECTS,
    pattern: 'the-overthinker',
    reason: (orb, applying, aspect) =>
      `Mercury ${aspect} your natal Mercury (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the mental loop tightens. Watch the rehearsal.`,
  },
  {
    transit: 'Mercury',
    natal: 'Saturn',
    aspects: HARD_ASPECTS,
    pattern: 'the-overthinker',
    reason: (orb, applying, aspect) =>
      `Mercury ${aspect} your natal Saturn (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — the inner critic gets analytical. The overthinker pattern is activated.`,
  },
  {
    transit: 'Saturn',
    natal: 'Mercury',
    aspects: HARD_ASPECTS,
    pattern: 'the-overthinker',
    reason: (orb, applying, aspect) =>
      `Saturn ${aspect} your natal Mercury (${orb.toFixed(1)}° orb, ${
        applying ? 'applying' : 'separating'
      }) — thought turns heavy. Watch the rumination.`,
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Sign-based rules (no natal chart required)                                */
/* -------------------------------------------------------------------------- */

interface SignRule {
  transit: TransitPlanetName;
  /** 0-indexed signs where this rule fires (empty/absent = fires in every sign). */
  signs?: ReadonlySet<number>;
  pattern: string;
  /** Extra condition: only fire when the planet is retrograde. */
  retrogradeOnly?: boolean;
  reason: (pos: TransitPlanet) => string;
}

const SIGN_RULES: readonly SignRule[] = [
  // Mercury retrograde → the-overthinker (general).
  {
    transit: 'Mercury',
    retrogradeOnly: true,
    pattern: 'the-overthinker',
    reason: () =>
      `Mercury is retrograde — the mental loop tightens for everyone. Watch the rehearsal, the rehashing, the second-guessing.`,
  },
  // Saturn transit (general) → the-hyper-independent.
  {
    transit: 'Saturn',
    pattern: 'the-hyper-independent',
    reason: (pos) => {
      const { sign } = degreeToSign(pos.longitude);
      return `Saturn is transiting ${sign.name} — the slow weight of "I have to handle this alone" is in the air.`;
    },
  },
  // Rahu transit (general) → the-chaser.
  {
    transit: 'Rahu',
    pattern: 'the-chaser',
    reason: (pos) => {
      const { sign } = degreeToSign(pos.longitude);
      return `Rahu is transiting ${sign.name} — the hunger for what's missing sharpens. The chaser pattern is closer to the surface for everyone.`;
    },
  },
  // Ketu transit (general) → the-avoider.
  {
    transit: 'Ketu',
    pattern: 'the-avoider',
    reason: (pos) => {
      const { sign } = degreeToSign(pos.longitude);
      return `Ketu is transiting ${sign.name} — the impulse to detach and withdraw is in the air for everyone.`;
    },
  },
  // Mars transiting Cancer (fall) — self-sabotage.
  {
    transit: 'Mars',
    signs: new Set<number>([3]), // Cancer
    pattern: 'the-self-sabotage',
    reason: () =>
      `Mars is transiting Cancer (its fall) — emotional heat and frustration are entangled. The self-sabotage reflex is closer to the surface.`,
  },
  // Mars transiting Scorpio (own sign, intense) — self-sabotage.
  {
    transit: 'Mars',
    signs: new Set<number>([7]), // Scorpio
    pattern: 'the-self-sabotage',
    reason: () =>
      `Mars is transiting Scorpio — intensity is high. Watch the impulse to turn conflict inward.`,
  },
  // Jupiter transiting Leo (Sun's own sign) — performer.
  {
    transit: 'Jupiter',
    signs: new Set<number>([4]), // Leo
    pattern: 'the-performer',
    reason: () =>
      `Jupiter is transiting Leo — the drive to be seen expands for everyone. The performer pattern is in the air.`,
  },
  // Venus retrograde (general) → the-avoider.
  {
    transit: 'Venus',
    retrogradeOnly: true,
    pattern: 'the-avoider',
    reason: () =>
      `Venus is retrograde — old relationship material surfaces. The avoider pattern is closer to the surface; watch the impulse to withdraw.`,
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Compute pattern activations for a given set of transits (and
 * optionally a natal chart).
 *
 * Combines:
 *   1. Natal-aspect activations (transit planet → natal planet)
 *   2. Sign-based activations (transit planet in a given sign)
 *   3. Retrograde-based activations (e.g. Mercury retrograde)
 *
 * Multiple rules may fire for the same pattern — in that case, the
 * highest-intensity activation wins (we keep only one activation per
 * pattern per day), and the reasons are concatenated.
 *
 * @param transits   The TransitData from `calculateTransits()` / `getTodaysTransits()`.
 * @param natal      Optional natal ChartData — enables aspect activations.
 * @returns          A list of pattern activations, sorted by intensity descending.
 */
export function getPatternActivation(
  transits: TransitData,
  natal?: ChartData,
): PatternActivation[] {
  const byPattern = new Map<string, PatternActivation>();

  // 1. Natal-aspect activations.
  if (natal) {
    const aspects = computeTransitAspects(transits, natal);
    for (const aspect of aspects) {
      for (const rule of NATAL_ASPECT_RULES) {
        if (rule.transit !== aspect.transitPlanet) continue;
        if (rule.natal !== aspect.natalPlanet) continue;
        if (!rule.aspects.has(aspect.aspect)) continue;
        const intensity = aspectIntensity(
          aspect.aspect,
          aspect.orb,
          aspect.applying,
        );
        const reason = rule.reason(aspect.orb, aspect.applying, aspect.aspect);
        upsertActivation(byPattern, makeActivation(rule.pattern, round2(intensity), reason));
      }
    }
  }

  // 2. Sign-based + retrograde activations.
  for (const name of TRANSIT_PLANET_ORDER) {
    const pos = transits.planets[name];
    if (!pos) continue;
    for (const rule of SIGN_RULES) {
      if (rule.transit !== name) continue;
      if (rule.signs && !rule.signs.has(pos.signIndex)) continue;
      if (rule.retrogradeOnly && !pos.retrograde) continue;
      const base = rule.retrogradeOnly
        ? RETROGRADE_BASE_INTENSITY
        : SIGN_BASE_INTENSITY;
      const reason = rule.reason(pos);
      upsertActivation(byPattern, makeActivation(rule.pattern, round2(base), reason));
    }
  }

  return [...byPattern.values()].sort(
    (a, b) => b.intensity - a.intensity,
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Build a PatternActivation from a slug + intensity + reason, looking
 * up the human-readable pattern name from the Atlas. Falls back to the
 * slug itself if the slug isn't in the Atlas (defensive — future
 * patterns not yet colored will still render).
 */
function makeActivation(
  slug: string,
  intensity: number,
  reason: string,
): PatternActivation {
  const atlas = getAtlasPattern(slug);
  return {
    pattern: slug,
    patternName: atlas?.name ?? slug,
    intensity,
    reason,
  };
}

function upsertActivation(
  map: Map<string, PatternActivation>,
  incoming: PatternActivation,
): void {
  const existing = map.get(incoming.pattern);
  if (!existing) {
    map.set(incoming.pattern, incoming);
    return;
  }
  if (incoming.intensity > existing.intensity) {
    map.set(incoming.pattern, {
      pattern: incoming.pattern,
      patternName: incoming.patternName,
      intensity: incoming.intensity,
      reason: `${incoming.reason} ${existing.reason}`,
    });
  } else {
    map.set(incoming.pattern, {
      pattern: existing.pattern,
      patternName: existing.patternName,
      intensity: existing.intensity,
      reason: `${existing.reason} ${incoming.reason}`,
    });
  }
}

/**
 * Convenience: compute activations directly from a ChartData + date.
 * Skips the intermediate TransitData step for callers that don't need
 * the raw transit positions.
 */
export function getPatternActivationForChart(
  natal: ChartData | undefined,
  date: Date = new Date(),
): PatternActivation[] {
  const transits = calculateTransits({ date });
  return getPatternActivation(transits, natal);
}

/* -------------------------------------------------------------------------- */
/*  Re-exports for callers that want the types                                 */
/* -------------------------------------------------------------------------- */

export type {
  ChartData,
  TransitData,
  TransitPlanet,
  TransitPlanetName,
  TransitAspect,
  AspectType,
  PlanetName,
};
