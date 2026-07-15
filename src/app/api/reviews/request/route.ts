import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendEmail, notifyAdmin } from '@/lib/email';
import {
  renderReviewRequestEmail,
  buildReviewSubmitUrl,
} from '@/lib/email/review-request';
import { isSessionValid, ADMIN_COOKIE_NAME } from '@/lib/security';

/**
 * POST /api/reviews/request
 *
 * Admin-gated OR internal endpoint. Sends a review-request email to the
 * client of a completed booking, inviting them to share their experience
 * as a testimonial. The email includes a pre-filled link to
 * /testimonials/submit?booking=<id>&email=<encoded> so the submission
 * form auto-fills the booking reference + email — and the testimonial can
 * be auto-verified on submit (driving the "Verified Session" badge).
 *
 * Auth — one of:
 *   - Bearer token (Authorization: Bearer <CRON_SECRET|ADMIN_SECRET>)
 *   - Admin cookie session (same gate as /api/admin/*)
 *
 * Behavior:
 *   - Loads the booking — must exist + be status='completed'.
 *   - If a VerifiedReview already exists for this booking (the client
 *     has already submitted a verified testimonial), skip sending.
 *     Returns { skipped: true, reason: 'already_verified' }.
 *   - Otherwise, renders the review-request email + dispatches via
 *     sendEmail + soft admin notification. Returns { ok: true, delivered }.
 *
 * Called from:
 *   - /api/session-emails/recap (after the recap email is dispatched)
 *   - Admin UI "Resend review request" action (future)
 *   - Daily cron at /api/cron/review-request (separate endpoint that
 *     handles the 3+ day post-session nudge with the same template)
 */

const requestSchema = z.object({
  bookingId: z.string().trim().min(1).max(100),
});

export async function POST(request: NextRequest) {
  // ─── Auth — admin cookie OR bearer token ───────────────────────
  const auth = request.headers.get('authorization') || '';
  const hasBearer = auth.startsWith('Bearer ');
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  let authorized = false;
  if (hasBearer) {
    const token = auth.slice(7).trim();
    const cronSecret = process.env.CRON_SECRET;
    const adminSecret = process.env.ADMIN_SECRET;
    if (
      (cronSecret && token === cronSecret) ||
      (adminSecret && token === adminSecret)
    ) {
      authorized = true;
    }
  }
  if (!authorized && cookie) {
    authorized = await isSessionValid(cookie);
  }
  if (!authorized) {
    return NextResponse.json(
      { error: 'Unauthorized — admin session or service token required' },
      { status: 401 }
    );
  }

  // ─── Parse body ───────────────────────────────────────────────
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

  const parsed = requestSchema.safeParse(raw);
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

  try {
    // ─── Load booking — must exist + be completed ────────────────
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        name: true,
        email: true,
        duration: true,
        scheduledAt: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'completed') {
      return NextResponse.json(
        {
          error: `Booking is not marked completed (status: ${booking.status}). Review requests are only sent for completed sessions.`,
        },
        { status: 400 }
      );
    }

    // ─── Skip if a VerifiedReview already exists for this booking ──
    // The client has already submitted a verified testimonial — no need
    // to ask again. (Testimonials submitted without the booking reference
    // won't have a VerifiedReview row, so this check won't catch those —
    // the cron endpoint has a more thorough skip-check that looks for
    // any matching testimonial by email.)
    const existingVerified = await db.verifiedReview.findFirst({
      where: { bookingId: booking.id },
      select: { testimonialId: true, verifiedAt: true },
    });

    if (existingVerified) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'already_verified',
        verifiedAt: existingVerified.verifiedAt.toISOString(),
        bookingId: booking.id,
      });
    }

    // ─── Render + dispatch the review-request email ─────────────
    const { subject, html, text } = await renderReviewRequestEmail({
      id: booking.id,
      name: booking.name,
      email: booking.email,
      duration: booking.duration,
      scheduledAt: booking.scheduledAt,
    });

    const result = await sendEmail({
      to: booking.email,
      subject,
      html,
      text,
    });

    // ─── Soft admin notification ────────────────────────────────
    // Non-blocking — failures here don't fail the request.
    await notifyAdmin({
      subject: `[AstroKalki] Review request sent — ${booking.name}`,
      text: [
        `Review-request email dispatched for booking ${booking.id}.`,
        ``,
        `Client:   ${booking.name} <${booking.email}>`,
        `Duration: ${booking.duration} min`,
        `Sent at:  ${new Date().toISOString()}`,
        `Delivered via: ${result.delivered}`,
        ``,
        `The email includes a pre-filled link to /testimonials/submit`,
        `with the booking reference + email, so the client's testimonial`,
        `will be auto-verified on submit (skipping moderation + earning`,
        `the "Verified Session" badge).`,
        ``,
        `Submit URL: ${buildReviewSubmitUrl({
          id: booking.id,
          email: booking.email,
        })}`,
      ].join('\n'),
      html: `
        <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
          <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki · Review Request</p>
          <h1 style="font-size:22px;font-weight:300;letter-spacing:-0.02em;line-height:1.3;margin:0 0 16px;">Review-request email dispatched.</h1>
          <p style="font-size:14px;line-height:1.8;color:#9a9a9a;font-weight:300;">
            Client: <strong style="color:#cfcabf;">${booking.name}</strong> &lt;${booking.email}&gt;<br/>
            Booking: <code style="color:#a58a54;">${booking.id}</code><br/>
            Duration: ${booking.duration} min<br/>
            Delivered via: ${result.delivered}
          </p>
          <p style="font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;margin-top:16px;">
            The email includes a pre-filled link to /testimonials/submit with the booking reference + email, so the client's testimonial will be auto-verified on submit (skipping moderation + earning the "Verified Session" badge).
          </p>
        </div>
      `,
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      skipped: false,
      delivered: result.delivered,
      messageId: result.messageId,
      bookingId: booking.id,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Review request error:', error);
    return NextResponse.json(
      { error: 'Failed to send review request' },
      { status: 500 }
    );
  }
}
