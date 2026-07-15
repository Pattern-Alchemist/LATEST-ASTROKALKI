/**
 * POST /api/session-emails/recap
 *
 * Manually dispatch (or re-dispatch) the post-session recap email with
 * AI-generated integration prompts. Admin-gated.
 *
 * Auth — one of:
 *   - Bearer token (Authorization: Bearer <CRON_SECRET|ADMIN_SECRET>)
 *   - Admin cookie session (same gate as /api/admin/*)
 *
 * Called automatically by /api/admin/bookings/[id] when admin PATCHes a
 * booking status to "completed". This endpoint also exists for manual
 * re-sends.
 *
 * Idempotent: if recapSentAt is already set, returns { skipped: true }
 * unless `force: true` is in the body.
 *
 * Body: { bookingId: string, force?: boolean }
 *
 * Review request (M9-a): after a successful recap dispatch, we ALSO
 * trigger the review-request email via /api/reviews/request. The recap
 * email includes a "Share your experience" CTA with the booking-linked
 * submit URL; the separate review-request email is a more focused
 * "how was your session?" nudge that emphasizes the Verified Session
 * badge. They serve slightly different purposes — recap = integration
 * prompts, review-request = share your experience. Both contain the
 * pre-filled /testimonials/submit?booking=X&email=Y link.
 *
 * If the recap was skipped (already sent), we DON'T re-send the review
 * request — the client has already received it. Use
 * /api/reviews/request directly to manually re-prompt.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchRecapEmail } from "@/lib/session-emails";
import { isSessionValid, ADMIN_COOKIE_NAME } from "@/lib/security";

export async function POST(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────
  const auth = request.headers.get("authorization") || "";
  const hasBearer = auth.startsWith("Bearer ");
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  let authorized = false;
  if (hasBearer) {
    const token = auth.slice(7).trim();
    const cronSecret = process.env.CRON_SECRET;
    const adminSecret = process.env.ADMIN_SECRET;
    if ((cronSecret && token === cronSecret) || (adminSecret && token === adminSecret)) {
      authorized = true;
    }
  }
  if (!authorized && cookie) {
    authorized = await isSessionValid(cookie);
  }
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized — admin session or service token required" },
      { status: 401 }
    );
  }

  // ─── Parse body ───────────────────────────────────────────────
  let body: { bookingId?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = (body.bookingId || "").trim();
  if (!bookingId) {
    return NextResponse.json(
      { error: "bookingId is required" },
      { status: 400 }
    );
  }

  // ─── Verify booking exists + is in a recap-eligible state ─────
  // Recap is only meaningful for sessions that actually happened.
  // We allow re-sending via force=true for any non-cancelled booking,
  // but the default flow requires status='completed'.
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot send recap for a cancelled booking" },
      { status: 400 }
    );
  }

  if (booking.status !== "completed" && !body.force) {
    return NextResponse.json(
      {
        error:
          "Booking is not marked completed. Pass force=true to override (e.g. for test sends).",
      },
      { status: 400 }
    );
  }

  // ─── Dispatch recap email ─────────────────────────────────────
  const result = await dispatchRecapEmail(bookingId, {
    force: Boolean(body.force),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason || "Dispatch failed" },
      { status: 400 }
    );
  }

  // ─── Trigger review-request email (M9-a) ──────────────────────
  // Only when the recap was actually dispatched (not skipped). If the
  // recap was already sent, the review-request was already sent with
  // it — don't double-send. The /api/reviews/request endpoint is
  // idempotent (skips if a VerifiedReview already exists for this
  // booking), so even if the call races it's safe.
  let reviewRequest = { sent: false, skipped: false, reason: null as string | null };
  if (!result.skipped) {
    try {
      const reviewRes = await fetch(
        "http://localhost:3000/api/reviews/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        }
      );

      if (reviewRes.ok) {
        const reviewData = await reviewRes.json().catch(() => ({}));
        if (reviewData.skipped) {
          reviewRequest = {
            sent: false,
            skipped: true,
            reason: reviewData.reason || "already_verified",
          };
        } else {
          reviewRequest = {
            sent: true,
            skipped: false,
            reason: null,
          };
        }
      } else {
        reviewRequest = {
          sent: false,
          skipped: false,
          reason: `reviews/request returned ${reviewRes.status}`,
        };
      }
    } catch (err) {
      // Non-blocking — the recap email itself already includes a
      // "Share your experience" CTA, so the client can still submit
      // a verified testimonial even if the separate review-request
      // email fails to dispatch.
      console.error(
        `[session-emails/recap] review-request trigger failed for ${bookingId} (non-blocking):`,
        err
      );
      reviewRequest = {
        sent: false,
        skipped: false,
        reason: "fetch failed",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped || false,
    reason: result.reason,
    delivered: result.delivered,
    messageId: result.messageId,
    recapId: result.recapId,
    reviewRequest,
  });
}
