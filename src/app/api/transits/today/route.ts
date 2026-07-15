import { NextResponse } from 'next/server';
import {
  getTodaysTransits,
  renderTransitWheelSVG,
  retrogradeCount,
  retrogradeSummary,
} from '@/lib/astrology/transits';

/**
 * GET /api/transits/today — public. Returns today's planetary transits.
 *
 * Returns 200 with TransitData + a rendered SVG wheel + a small
 * summary (retrograde count, retrograde summary).
 *
 * Cache-Control: public, max-age=3600 — the transits are computed
 * once per day server-side (cached in the DB), so the response is
 * effectively immutable for 24h. The 1-hour CDN cache keeps the
 * ephemeris cost off the origin while still allowing a quick
 * refresh after midnight UTC.
 *
 * Note: the global middleware sets `Cache-Control: no-store` on every
 * /api/* response — we override it here explicitly so the public CDN
 * cache kicks in. The headers we set in NextResponse take precedence
 * over the middleware's headers (we run after middleware and write
 * the actual response).
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const transits = await getTodaysTransits();
    const svg = renderTransitWheelSVG(transits);
    const retroCount = retrogradeCount(transits);
    const retroSummaryStr = retrogradeSummary(transits);

    return NextResponse.json(
      {
        date: transits.date,
        ayanamsa: transits.ayanamsa,
        planets: transits.planets,
        wheelSvg: svg,
        retrogradeCount: retroCount,
        retrogradeSummary: retroSummaryStr,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (err) {
    console.error('[api/transits/today] failed:', err);
    return NextResponse.json(
      { error: 'Could not compute today\u2019s transits.' },
      { status: 500 },
    );
  }
}
