import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackConversion } from '@/lib/ab/testing';
import { SESSION_COOKIE_NAME } from '@/lib/ab/session';

/**
 * POST /api/experiment/convert
 *
 * Body: { "name": "<experimentName>" }
 *
 * Marks the current visitor's assignment for the named experiment as
 * converted. Called when the visitor completes the experiment's target
 * action — e.g. clicking "Book Session" for a hero-headline experiment.
 *
 * Auth: none. The visitor is identified solely by the `ak_sid` cookie
 * set on /api/experiment/assign. If no cookie is present, the request
 * is a no-op (the visitor was never assigned, so there's nothing to
 * convert).
 *
 * The middleware whitelists `/api/experiment` POST endpoints for
 * bot-detection + CSRF + body-size checks (see /src/middleware.ts,
 * section 3). This handler only needs to validate the payload shape.
 *
 * Idempotent: calling this twice for the same (experiment, session)
 * simply keeps `converted = true`. No error is raised.
 */

const ConvertSchema = z.object({
  name: z.string().trim().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = ConvertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload — `name` is required (1-128 chars).' },
        { status: 400 }
      );
    }

    const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionId) {
      // Visitor was never assigned (no cookie). Nothing to convert —
      // but return 200 so client-side error handling doesn't fire.
      return NextResponse.json({ success: false, reason: 'no-session' });
    }

    await trackConversion(parsed.data.name, sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/experiment/convert] error:', error);
    // Return success — conversion tracking must not break the booking flow.
    return NextResponse.json({ success: true });
  }
}
