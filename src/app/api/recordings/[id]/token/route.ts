import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { createPlaybackToken } from '@/lib/security/playback-token';

/**
 * Issue a playback token for a recording.
 *
 *   POST /api/recordings/<id>/token
 *   Body: { email: string }
 *
 * Auth model:
 *   - The requestor must provide the email address that matches the booking
 *     linked to this recording. We don't require them to be signed in via
 *     NextAuth — clients who booked without signing in (most users) can
 *     still retrieve their recording.
 *   - If the recording has NO bookingId (bookingId=null), no email will
 *     ever match — these recordings are admin-only and tokens are NOT
 *     issued here.
 *
 * Rate limit: 10 tokens / hour per IP+email combo. A legitimate user
 * requesting one token per playback session will never hit this.
 *
 * Returns:
 *   {
 *     token: "<base64url-hmac>.<expires>",
 *     expires: <unix-ms>,
 *     url: "/api/recordings/<id>?token=<token>&expires=<expires>"
 *   }
 */

const RATE_LIMIT_CONFIG = { windowMs: 60 * 60 * 1000, max: 10 }; // 10/hour

const tokenRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Email is required')
    .max(254, 'Email too long')
    .email('A valid email is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ─── Read + validate the body FIRST ─────────────────────────────────
    // We need the email before the rate-limit check so the bucket key can
    // be per-email. If the body is malformed we bail out before burning a
    // rate-limit slot — bots shouldn't be able to DOS us with garbage.
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const parsed = tokenRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Invalid email',
        },
        { status: 400 }
      );
    }
    const email = parsed.data.email;

    // ─── Rate-limit (10/hour per IP+email) ──────────────────────────────
    const ip = getClientIp(request);
    const rateKey = `recording-token:${ip}:${email}`;
    const rl = checkRateLimit(rateKey, RATE_LIMIT_CONFIG);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: 'Too many token requests. Please try again later.',
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSeconds) },
        }
      );
    }

    // ─── Look up the recording + booking ────────────────────────────────
    const recording = await db.recordedReading.findUnique({
      where: { id },
      select: {
        id: true,
        bookingId: true,
        booking: { select: { email: true, name: true } },
      },
    });
    if (!recording) {
      // 404 — we don't want to leak which IDs exist.
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // ─── Match the email against the booking ────────────────────────────
    if (!recording.bookingId || !recording.booking) {
      // Recording has no booking attached → no client should be able to
      // play it through this endpoint. 403 (the recording exists, just
      // not for this caller).
      return NextResponse.json(
        { error: 'This recording is not yet available for playback.' },
        { status: 403 }
      );
    }

    const bookingEmail = recording.booking.email.trim().toLowerCase();
    if (bookingEmail !== email) {
      // Same 403 — don't leak which emails are valid.
      return NextResponse.json(
        {
          error:
            'This email does not match the booking attached to this recording.',
        },
        { status: 403 }
      );
    }

    // ─── Issue the signed token ─────────────────────────────────────────
    const { token, expires } = await createPlaybackToken(recording.id);
    const url = `/api/recordings/${recording.id}?token=${encodeURIComponent(
      token
    )}&expires=${expires}`;

    return NextResponse.json({
      token,
      expires,
      url,
      expiresInMs: expires - Date.now(),
    });
  } catch (error) {
    console.error('Recording token issue error:', error);
    return NextResponse.json(
      { error: 'Failed to issue playback token' },
      { status: 500 }
    );
  }
}
