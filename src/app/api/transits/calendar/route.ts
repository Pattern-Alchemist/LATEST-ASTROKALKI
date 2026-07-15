import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getForecastForUser } from '@/lib/astrology/forecast';

/**
 * GET /api/transits/calendar — auth-gated.
 *
 * Returns a 30-day pattern-activation forecast for the signed-in
 * member. The forecast is computed by `getForecastForUser()` in
 * `src/lib/astrology/forecast.ts`, which:
 *
 *   1. Loads the member's most recent BirthChart (if any).
 *   2. For each of the next 30 days, calculates the sidereal transits
 *      at noon UTC and computes Atlas-pattern activations (natal-aware
 *      if a chart is on file, general otherwise).
 *   3. Caches the result in-memory for 1 hour per user. The cache key
 *      includes the birth-chart ID so casting a new chart invalidates.
 *
 * This route is a thin auth-gate around the shared helper — the page
 * component `/pattern-calendar/page.tsx` calls the same helper directly
 * (server-side) so the first page load is already cached.
 *
 * Response shape:
 *   {
 *     forecast: [{ date, activations: [{ pattern, patternName, intensity, reason }], peakPattern }],
 *     hasNatalChart: boolean,
 *     generatedAt: string,
 *     cached: boolean
 *   }
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // 1. Auth gate
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to view your pattern calendar.' },
      { status: 401 },
    );
  }

  // 2. Delegate to the shared forecast helper.
  try {
    const result = await getForecastForUser(session.user.email);
    return NextResponse.json(
      result,
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Cache': result.cached ? 'HIT' : 'MISS',
        },
      },
    );
  } catch (err) {
    console.error('[api/transits/calendar] forecast failed:', err);
    return NextResponse.json(
      { error: 'Could not compute the pattern forecast right now.' },
      { status: 500 },
    );
  }
}
