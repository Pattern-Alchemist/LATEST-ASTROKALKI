import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * POST /api/admin/testimonials/[id]/verify
 *
 * Admin-gated (middleware covers /api/admin/*). Manually links a testimonial
 * to a real booking — creating a VerifiedReview record. Used when:
 *   - The auto-verify on public submission failed (e.g. email mismatch) but
 *     the admin has confirmed the testimonial is genuine
 *   - A testimonial was seeded without a booking reference and the admin
 *     later discovers which session it was
 *
 * Body: { bookingId: string }
 *
 * Unlike the public /api/testimonials/verify endpoint, this does NOT require
 * the email to match — the admin's action is the verification. The booking
 * MUST exist (referential integrity for VerifiedReview.bookingId), but its
 * status does not have to be 'completed' (admin override).
 *
 * Idempotent: re-calling with the same bookingId is a no-op. Calling with
 * a different bookingId re-links the testimonial (updates VerifiedReview
 * row in place via upsert).
 */

const adminVerifySchema = z.object({
  bookingId: z.string().trim().min(1).max(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let raw: unknown;
    try {
      const text = await request.text();
      if (text.length > 4 * 1024) {
        return NextResponse.json(
          { error: 'Body too large' },
          { status: 413 }
        );
      }
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = adminVerifySchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue
            ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
            : 'Invalid input',
        },
        { status: 400 }
      );
    }

    const { bookingId } = parsed.data;

    // ─── Verify the testimonial exists ──────────────────────────────
    const testimonial = await db.testimonial.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    // ─── Verify the booking exists ──────────────────────────────────
    // VerifiedReview.bookingId has no FK relation in the schema (no
    // @relation), but we enforce referential integrity at the application
    // layer — refusing to link to a non-existent booking.
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, name: true, email: true, status: true },
    });
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // ─── Upsert the VerifiedReview record ───────────────────────────
    // testimonialId is @unique, so this either creates a new link or
    // updates the existing one to point at the new bookingId.
    const verifiedReview = await db.verifiedReview.upsert({
      where: { testimonialId: id },
      create: {
        testimonialId: id,
        bookingId,
      },
      update: {
        bookingId,
      },
    });

    // ─── Auto-approve the testimonial if it's still pending ─────────
    // Verified testimonials skip moderation — the booking link IS the
    // verification. Don't downgrade an already-approved testimonial, and
    // don't override a 'rejected' decision silently (the admin can
    // separately set status='approved' via the PATCH endpoint).
    let newStatus: string | null = null;
    if (testimonial.status === 'pending') {
      await db.testimonial.update({
        where: { id },
        data: { status: 'approved' },
      });
      newStatus = 'approved';
    }

    return NextResponse.json({
      verified: true,
      verifiedAt: verifiedReview.verifiedAt.toISOString(),
      bookingId: verifiedReview.bookingId,
      testimonialId: verifiedReview.testimonialId,
      statusChanged: newStatus
        ? { from: testimonial.status, to: newStatus }
        : null,
    });
  } catch (error) {
    console.error('Admin testimonial verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify testimonial' },
      { status: 500 }
    );
  }
}
