/**
 * Daily cron — sends review-request emails to clients whose sessions were
 * completed + recap sent 3+ days ago, and who haven't yet submitted a
 * testimonial (verified or otherwise).
 *
 * Selection logic:
 *   - Find SessionRecap rows where recapSentAt IS NOT NULL
 *   - recapSentAt <= (now - 3 days)    (session was 3+ days ago)
 *   - recapSentAt >= (now - 7 days)    (cap so we don't spam old sessions
 *                                       that never reviewed; also keeps
 *                                       the daily cron from re-sending
 *                                       every day to the same person)
 *   - Booking status === 'completed'   (still completed, not retroactively
 *                                       cancelled)
 *   - No VerifiedReview exists for the bookingId (no testimonial linked
 *     yet — if one exists, the client has already reviewed)
 *   - No Testimonial exists with an email matching the booking's email
 *     (covers the case where the client submitted a testimonial WITHOUT
 *     the booking reference — we still don't want to nag them)
 *
 * Auth: ?key=CRON_SECRET or ?secret=CRON_SECRET (both work, matching the
 *       existing /api/cron/session-emails pattern).
 *       If CRON_SECRET is unset (dev/test), the endpoint is open.
 *
 * Production schedule:
 *   0 6 * * *  curl -fsS "https://astrokalki.com/api/cron/review-request?key=$CRON_SECRET"
 *   (6 AM IST daily — lands in the client's morning inbox.)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderReviewRequestEmail } from "@/lib/email/review-request";
import { sendEmail, notifyAdmin } from "@/lib/email";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      request.nextUrl.searchParams.get("key") ||
      request.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const since = new Date(now.getTime() - 7 * DAY); // recapSentAt >= now-7d
  const until = new Date(now.getTime() - 3 * DAY); // recapSentAt <= now-3d

  const stats = {
    candidates: 0,
    sent: 0,
    skippedAlreadyReviewed: 0,
    skippedPendingTestimonial: 0,
    skippedBookingNotCompleted: 0,
    errors: 0,
  };

  try {
    // ─── Find SessionRecap rows in the [now-7d, now-3d] recapSentAt window
    // ──────────────────────────────────────────────────────────────
    const recaps = await db.sessionRecap.findMany({
      where: {
        recapSentAt: {
          gte: since,
          lte: until,
        },
      },
      select: {
        bookingId: true,
        email: true,
        recapSentAt: true,
      },
      take: 200,
    });

    stats.candidates = recaps.length;

    if (recaps.length === 0) {
      return NextResponse.json({
        ok: true,
        runAt: now.toISOString(),
        window: {
          recapSentSince: since.toISOString(),
          recapSentUntil: until.toISOString(),
        },
        ...stats,
      });
    }

    // ─── Load the corresponding bookings in one query ─────────────
    const bookingIds = recaps.map((r) => r.bookingId);
    const bookings = await db.booking.findMany({
      where: { id: { in: bookingIds } },
      select: {
        id: true,
        name: true,
        email: true,
        duration: true,
        scheduledAt: true,
        status: true,
      },
    });
    const bookingById = new Map(bookings.map((b) => [b.id, b]));

    // ─── Load existing VerifiedReview rows for these bookings ─────
    // If a VerifiedReview exists, the client has already reviewed — skip.
    const existingVerified = await db.verifiedReview.findMany({
      where: { bookingId: { in: bookingIds } },
      select: { bookingId: true },
    });
    const reviewedBookingIds = new Set(
      existingVerified.map((v) => v.bookingId)
    );

    // ─── Load existing Testimonials with matching emails ──────────
    // Covers the case where the client submitted a testimonial without
    // the booking reference (so no VerifiedReview row, but they did
    // review). We don't want to nag them with another request.
    const bookingEmails = bookings.map((b) => b.email.toLowerCase());
    const existingTestimonials = await db.testimonial.findMany({
      where: {
        email: { in: bookingEmails },
        // Only consider non-rejected testimonials. A rejected testimonial
        // means the moderator decided not to publish it — the client
        // might re-submit if prompted.
        status: { in: ["pending", "approved"] },
      },
      select: { email: true },
    });
    const reviewedEmails = new Set(
      existingTestimonials
        .map((t) => t.email)
        .filter((e): e is string => Boolean(e))
        .map((e) => e.toLowerCase())
    );

    // ─── Dispatch review-request emails ───────────────────────────
    for (const recap of recaps) {
      const booking = bookingById.get(recap.bookingId) as any;
      if (!booking) {
        // SessionRecap without a Booking — orphan row, skip.
        stats.errors++;
        continue;
      }

      // Booking must still be 'completed' (might have been retroactively
      // cancelled/refunded).
      if (booking?.status !== "completed") {
        stats.skippedBookingNotCompleted++;
        continue;
      }

      // Already has a VerifiedReview for this booking?
      if (reviewedBookingIds.has(booking.id)) {
        stats.skippedAlreadyReviewed++;
        continue;
      }

      // Already has any pending/approved testimonial with this email?
      if (reviewedEmails.has(booking.email.toLowerCase())) {
        stats.skippedPendingTestimonial++;
        continue;
      }

      try {
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

        stats.sent++;

        // Soft admin notification — useful for the practitioner to know
        // a review request went out (and the booking ID, so they can
        // cross-reference if the client later complains).
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
            `with the booking reference + email, so the client's`,
            `testimonial will be auto-verified on submit.`,
          ].join("\n"),
          html: `
            <p>Review-request email dispatched for booking <code>${booking.id}</code>.</p>
            <p>
              Client: ${booking.name} &lt;${booking.email}&gt;<br/>
              Duration: ${booking.duration} min<br/>
              Sent at: ${new Date().toISOString()}<br/>
              Delivered via: ${result.delivered}
            </p>
            <p>The email includes a pre-filled link to /testimonials/submit with the booking reference + email, so the client's testimonial will be auto-verified on submit.</p>
          `,
        }).catch(() => null);
      } catch (err) {
        stats.errors++;
        console.error(
          `[cron/review-request] send failed for booking ${booking.id}:`,
          err
        );
      }
    }

    return NextResponse.json({
      ok: true,
      runAt: now.toISOString(),
      window: {
        recapSentSince: since.toISOString(),
        recapSentUntil: until.toISOString(),
      },
      ...stats,
    });
  } catch (error) {
    console.error("[cron/review-request] Fatal:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
