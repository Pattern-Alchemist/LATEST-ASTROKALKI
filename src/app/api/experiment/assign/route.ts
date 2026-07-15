import { NextRequest, NextResponse } from 'next/server';
import { getVariant } from '@/lib/ab/testing';
import { getOrCreateSessionId, setSessionCookie } from '@/lib/ab/session';

/**
 * GET /api/experiment/assign?name=<experimentName>
 *
 * Called client-side on page load (by <AbVariant/>) to determine which
 * variant of an experiment the current visitor should see.
 *
 * Response:
 *   200 OK
 *   { variant: "b", config: { ... } }    // assigned variant
 *   { variant: null }                      // no active experiment — caller renders default
 *
 * Side effects:
 *   - Reads the `ak_sid` cookie. If absent (or malformed), generates a
 *     fresh UUIDv4 and sets it on the response (httpOnly, 1-year expiry).
 *   - On first assignment for a given (experiment, session) pair, a new
 *     ExperimentAssignment row is persisted.
 *
 * This route is intentionally public (no auth). The middleware already
 * whitelists `/api/experiment` for POST so conversion tracking works;
 * GET is unrestricted by design — visitors need to be assigned without
 * authentication.
 *
 * Failure mode: any error returns `{ variant: null }` with 200 — the
 * <AbVariant/> wrapper renders its default prop and the page never
 * breaks because of an A/B test hiccup.
 */
export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name')?.trim();
    if (!name || name.length > 128) {
      return NextResponse.json({ variant: null });
    }

    const sessionId = getOrCreateSessionId(request);
    const assignment = await getVariant(name, sessionId);

    const response = NextResponse.json(
      assignment
        ? { variant: assignment.variant, config: assignment.config }
        : { variant: null }
    );

    // Always (re)set the cookie — refreshes maxAge for returning
    // visitors so a long-running experiment doesn't lose its sticky
    // assignment mid-conversion-window.
    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    console.error('[/api/experiment/assign] error:', error);
    // Never break the page — render default.
    return NextResponse.json({ variant: null });
  }
}
