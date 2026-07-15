import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  getClientIp,
} from '@/lib/security';

/**
 * POST /api/reviews/verify
 *
 * Internal endpoint — called when a testimonial is submitted with a
 * bookingId (from /api/testimonials POST) OR when an admin manually
 * triggers verification on a testimonial.
 *
 * Verifies:
 *   1. The booking exists
 *   2. The booking is status='completed' (the session actually happened)
 *   3. The testimonial's email matches the booking's email
 *      (case-insensitive — proves the person submitting the testimonial is
 *      the person who attended the session)
 *
 * On success: creates (or upserts) a VerifiedReview record linking the
 * testimonial to the booking. The VerifiedReview row drives the gold
 * "Verified Session" badge shown on /testimonials and /admin/testimonials.
 *
 * On failure (booking missing, status not completed, email mismatch):
 * returns { verified: false } with HTTP 200 — negative verification is a
 * normal API result, not an HTTP error. The caller can still save the
 * testimonial as unverified.
 *
 * Accepts: { testimonialId, bookingId }
 *   - testimonialId: required — the testimonial to link
 *   - bookingId:     required — the completed booking to verify against
 *
 * Rate-limited: 10 per IP per hour. Idempotent: testimonialId is @unique
 * on VerifiedReview, so re-verifying the same testimonial is a no-op
 * (re-verify does NOT silently re-link to a new booking — that's an
 * admin-only action via /api/admin/testimonials/[id]/verify).
 */

const verifySchema = z.object({
  testimonialId: z.string().trim().min(1).max(100),
  bookingId: z.string().trim().min(1).max(100),
});

const RATE_LIMIT_CONFIG = { windowMs: 60 * 60 * 1000, max: 10 };

export async function POST(request: NextRequest) {
  // ─── Rate limit — 10 verifications per IP per hour ─────────────────
  // Public endpoint (whitelisted under /api/reviews in middleware), so
  // we rate-limit to prevent booking-id brute-force.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`reviews-verify:${ip}`, RATE_LIMIT_CONFIG);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Too many requests. Please try again in ${rl.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // ─── Parse body ────────────────────────────────────────────────────
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        verified: false,
        reason: firstIssue?.message || 'Invalid input',
      },
      { status: 400 }
    );
  }

  const { testimonialId, bookingId } = parsed.data;

  try {
    // ─── Look up the testimonial ───────────────────────────────────
    // We need the testimonial's stored email to match against the booking.
    const testimonial = await db.testimonial.findUnique({
      where: { id: testimonialId },
      select: { id: true, email: true },
    });

    if (!testimonial) {
      return NextResponse.json(
        { verified: false, reason: 'Testimonial not found' },
        { status: 200 }
      );
    }

    // ─── Look up the booking ───────────────────────────────────────
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { verified: false, reason: 'Booking not found' },
        { status: 200 }
      );
    }

    if (booking.status !== 'completed') {
      return NextResponse.json(
        {
          verified: false,
          reason: `Booking is not marked completed (status: ${booking.status})`,
        },
        { status: 200 }
      );
    }

    // ─── Email match — case-insensitive ────────────────────────────
    // The testimonial's stored email must match the booking's email.
    // This proves the person submitting the testimonial is the person
    // who actually attended the session.
    const testimonialEmail = (testimonial.email || '').trim().toLowerCase();
    const bookingEmail = booking.email.trim().toLowerCase();

    if (!testimonialEmail) {
      return NextResponse.json(
        {
          verified: false,
          reason: 'No email on file for this testimonial — cannot verify',
        },
        { status: 200 }
      );
    }

    if (testimonialEmail !== bookingEmail) {
      return NextResponse.json(
        { verified: false, reason: 'Email does not match booking' },
        { status: 200 }
      );
    }

    // ─── Idempotent upsert of VerifiedReview ───────────────────────
    // testimonialId is @unique on VerifiedReview, so upsert protects us
    // against duplicate-key errors if the same testimonial is verified
    // twice (e.g. user re-submits, or auto-verify races with admin
    // manual-verify). On update, we DON'T re-link to a new booking — the
    // original link stays intact. The admin can manually re-link via
    // /api/admin/testimonials/[id]/verify if needed.
    const verifiedReview = await db.verifiedReview.upsert({
      where: { testimonialId },
      create: {
        testimonialId,
        bookingId,
      },
      update: {
        // Intentionally empty — see comment above.
      },
    });

    return NextResponse.json({
      verified: true,
      verifiedAt: verifiedReview.verifiedAt.toISOString(),
      bookingId: verifiedReview.bookingId,
      testimonialId: verifiedReview.testimonialId,
    });
  } catch (error) {
    console.error('Review verification error:', error);
    return NextResponse.json(
      { verified: false, reason: 'Verification failed' },
      { status: 500 }
    );
  }
}
