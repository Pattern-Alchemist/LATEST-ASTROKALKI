/**
 * Pattern-activation forecast helper — AstroKalki M10-d.
 *
 * Shared by:
 *   - `/api/transits/calendar` (GET, auth-gated JSON endpoint)
 *   - `/pattern-calendar` (server component, auth-gated page)
 *
 * Loads the user's most recent BirthChart, computes a 30-day pattern-
 * activation forecast, and caches it in-memory for 1 hour. Both the
 * API route and the page component call this helper so they share the
 * same cache (no double-compute when a user hits the page then
 * immediately re-fetches via the API).
 */

import { db } from '@/lib/db';
import { calculateTransits } from './transits';
import {
  getPatternActivation,
  hasNatalChart,
  type PatternActivation,
} from './pattern-activation';
import type { ChartData } from './chart-calculator';

/* -------------------------------------------------------------------------- */
/*  Public types                                                                */
/* -------------------------------------------------------------------------- */

export interface ForecastActivation {
  pattern: string;
  patternName: string;
  intensity: number;
  reason: string;
}

export interface ForecastDay {
  date: string;
  activations: ForecastActivation[];
  peakPattern: string | null;
}

export interface ForecastResult {
  forecast: ForecastDay[];
  hasNatalChart: boolean;
  generatedAt: string;
  /** True if the result came from the in-memory cache. */
  cached: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                      */
/* -------------------------------------------------------------------------- */

const FORECAST_DAYS = 30;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 200;

/* -------------------------------------------------------------------------- */
/*  In-memory cache                                                            */
/* -------------------------------------------------------------------------- */

interface CacheEntry {
  expiresAt: number;
  result: Omit<ForecastResult, 'cached'>;
}

const cache = new Map<string, CacheEntry>();

function evictIfNeeded(): void {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const entries = [...cache.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt,
  );
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
  for (const [key] of toRemove) cache.delete(key);
}

/* -------------------------------------------------------------------------- */
/*  Public entry point                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Compute (or return cached) 30-day pattern-activation forecast for
 * the given user email.
 *
 * The cache key includes the user's most recent birth-chart ID so
 * casting a new chart automatically invalidates the cache.
 *
 * @param email  The signed-in user's email.
 * @returns      The forecast + provenance metadata.
 */
export async function getForecastForUser(
  email: string,
): Promise<ForecastResult> {
  // ─── Load the user's most recent BirthChart ──────────────────────────
  let birthChart: ChartData | undefined;
  let birthChartId: string | null = null;
  try {
    const chartRow = await db.birthChart.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: { id: true, chartData: true },
    });
    if (chartRow?.chartData) {
      const parsed = JSON.parse(chartRow.chartData) as ChartData;
      if (hasNatalChart(parsed)) {
        birthChart = parsed;
        birthChartId = chartRow.id;
      }
    }
  } catch {
    birthChart = undefined;
  }

  // ─── Cache lookup ────────────────────────────────────────────────────
  const cacheKey = `${email}::${birthChartId ?? 'no-chart'}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ...cached.result, cached: true };
  }

  // ─── Compute fresh forecast ──────────────────────────────────────────
  const forecast = computeForecast(birthChart);
  const generatedAt = new Date().toISOString();
  const result = {
    forecast,
    hasNatalChart: Boolean(birthChart),
    generatedAt,
  };

  cache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    result,
  });
  evictIfNeeded();

  return { ...result, cached: false };
}

/* -------------------------------------------------------------------------- */
/*  Forecast computation                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Compute the 30-day forecast. For each day, casts transits at noon
 * UTC and computes pattern activations against the natal chart (if
 * available).
 *
 * Performance: ~60ms per day × 30 days = ~1.8s uncached. astronomy-engine
 * is fast (<0.1ms per body), and we compute 9 bodies × 2 (current +
 * 12h-future for applying detection) = 18 ephemeris queries per day.
 * Acceptable for an hourly-cached endpoint.
 */
function computeForecast(natal: ChartData | undefined): ForecastDay[] {
  const out: ForecastDay[] = [];
  const now = new Date();
  // Start at noon UTC today — noon avoids day-boundary edge cases for
  // applying/separating detection (which samples ±12h).
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );

  for (let i = 0; i < FORECAST_DAYS; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const transits = calculateTransits({ date });
    const activations = getPatternActivation(transits, natal);

    const peak = activations[0] ?? null;

    out.push({
      date: date.toISOString(),
      activations: activations.map(serializeActivation),
      peakPattern: peak?.pattern ?? null,
    });
  }

  return out;
}

function serializeActivation(a: PatternActivation): ForecastActivation {
  return {
    pattern: a.pattern,
    patternName: a.patternName,
    intensity: a.intensity,
    reason: a.reason,
  };
}
