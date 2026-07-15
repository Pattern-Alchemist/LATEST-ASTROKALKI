/**
 * POST /api/session-emails/prep
 *
 * Manually dispatch (or re-dispatch) the pre-session "what to prepare"
 * email for a given booking. Creates the SessionRecap row if needed.
 *
 * Auth — one of:
 *   - Bearer token (Authorization: Bearer <CRON_SECRET|ADMIN_SECRET>)
 *   - Admin cookie session (same gate as /api/admin/*)
 *
 * Idempotent: if prepSentAt is already set, returns { skipped: true }
 * unless `force: true` is in the body.
 *
 * Body: { bookingId: string, force?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchPrepEmail } from "@/lib/session-emails";
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

  // ─── Verify booking exists ────────────────────────────────────
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // ─── Dispatch ─────────────────────────────────────────────────
  const result = await dispatchPrepEmail(bookingId, {
    force: Boolean(body.force),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason || "Dispatch failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped || false,
    reason: result.reason,
    delivered: result.delivered,
    messageId: result.messageId,
    recapId: result.recapId,
  });
}
