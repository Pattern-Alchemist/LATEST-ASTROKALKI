import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  getClientIp,
} from '@/lib/security';

/**
 * POST /api/testimonials/verify
 *
 * Public endpoint. Called when a testimonial is submitted with a booking
 * reference — verifies the booking exists, is status='completed', and the
 * email matches. On success, links the testimonial to the booking via a
 * VerifiedReview record (which gives the testimonial a "Verified Session"
 * badge on /testimonials).
 *
 * Accepts EITHER:
 *   { testimonialId, bookingId }  — verify an existing testimonial against a
 *                                    booking; creates VerifiedReview record
 *   { email, bookingId }          — pre-check whether the booking is
 *                                    verifiable for that email (no
 *                                    VerifiedReview record created, since
 *                                    there's no testimonial to link yet)
 *
 * Rate-limited: 10 per IP per hour. Idempotent: re-verifying an already-
 * linked testimonial returns { verified: true, verifiedAt } without
 * creating a duplicate (testimonialId is @unique on VerifiedReview).
 */

const verifySchema = z
  .object({
    testimonialId: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().toLowerCase().max(254).email().optional(),
    bookingId: z.string().trim().min(1).max(100),
  })
  .refine((v) => v.testimonialId || v.email, {
    message: 'Either testimonialId or email is required',
  });

const RATE_LIMIT_CONFIG = { windowMs: 60 * 60 * 1000, max: 10 };

export async function POST(request: NextRequest) {
  // ─── Rate limit — 10 verifications per IP per hour ─────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`tm-verify:${ip}`, RATE_LIMIT_CONFIG);
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

  const { testimonialId, email, bookingId } = parsed.data;

  try {
    // ─── Look up the booking ───────────────────────────────────────
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        scheduledAt: true,
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

    // ─── Resolve the email to verify against ───────────────────────
    // If testimonialId was provided, use the testimonial's stored email
    // (the submitter's email). If only email was provided, use that
    // directly.
    let verifyEmail: string | undefined;
    let testimonialExists = false;

    if (testimonialId) {
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
      testimonialExists = true;
      verifyEmail = testimonial.email || undefined;
    } else if (email) {
      verifyEmail = email;
    }

    if (!verifyEmail) {
      return NextResponse.json(
        {
          verified: false,
          reason: 'No email on file for this testimonial — cannot verify',
        },
        { status: 200 }
      );
    }

    // Case-insensitive email match against the booking's email.
    if (
      verifyEmail.trim().toLowerCase() !== booking.email.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { verified: false, reason: 'Email does not match booking' },
        { status: 200 }
      );
    }

    // ─── If only email+bookingId were provided (no testimonial to link),
    // return verified=true without creating a VerifiedReview record. The
    // caller (e.g. /api/testimonials POST auto-verify) is responsible for
    // creating the VerifiedReview row alongside the testimonial.
    if (!testimonialId || !testimonialExists) {
      return NextResponse.json({
        verified: true,
        verifiedAt: new Date().toISOString(),
        linked: false,
      });
    }

    // ─── Idempotent upsert of VerifiedReview ───────────────────────
    // testimonialId is @unique on VerifiedReview, so upsert protects us
    // against duplicate-key errors if the same testimonial is verified
    // twice (e.g. user re-submits, or auto-verify races with admin
    // manual-verify).
    const verified = await db.verifiedReview.upsert({
      where: { testimonialId },
      create: {
        testimonialId,
        bookingId,
      },
      update: {
        // If the testimonial was already verified against a different
        // booking, leave the original link intact (don't silently
        // re-link to a new booking). The admin can manually unlink +
        // re-link via /api/admin/testimonials/[id]/verify if needed.
      },
    });

    return NextResponse.json({
      verified: true,
      verifiedAt: verified.verifiedAt.toISOString(),
      linked: true,
    });
  } catch (error) {
    console.error('Testimonial verification error:', error);
    return NextResponse.json(
      { verified: false, reason: 'Verification failed' },
      { status: 500 }
    );
  }
}
