/**
 * Session-emails cron — runs hourly.
 *
 * Responsibilities:
 *   1. For bookings scheduled in the next 24–48 hours whose prep email
 *      has NOT been sent (SessionRecap.prepSentAt IS NULL), dispatch the
 *      prep email now.
 *
 *      This catches:
 *        - Bookings made well in advance (>= 48h out) that we deferred
 *          the prep email for (so it lands close to the session, not
 *          weeks early).
 *        - Bookings whose original prep dispatch failed for any reason.
 *
 *      NOTE: Bookings made < 24h before the session still get their prep
 *      email immediately at booking time (via dispatchPrepEmail called
 *      inline from /api/bookings + /api/slots/[id]). The cron is the
 *      safety net + the "send closer to the session" mechanism.
 *
 *   2. Recap emails are NOT handled here — those are dispatched on-demand
 *      when admin marks a booking as completed.
 *
 * Auth: requires ?key=CRON_SECRET (or ?secret=CRON_SECRET) matching
 *       process.env.CRON_SECRET. We accept both param names so the
 *       endpoint matches BOTH the existing /api/cron/drip pattern (?key=)
 *       and the literal task spec (?secret=).
 *       If CRON_SECRET is unset (dev/test), the endpoint is open so
 *       manual testing works without setup.
 *
 * Production schedule:
 *   0 * * * *  curl -fsS "https://astrokalki.com/api/cron/session-emails?key=$CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchPrepEmail } from "@/lib/session-emails";

const HOUR = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────
  // Match the existing /api/cron/drip pattern (?key=) AND accept the
  // task-spec'd ?secret= param. Either works.
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
  const stats = {
    prepSent: 0,
    skipped: 0,
    errors: 0,
    candidates: 0,
  };

  try {
    // ─── Find bookings scheduled in the next 24-48h ──────────────
    // We want to send the prep email to land ~24h before the session,
    // but no later than the session start. Window: [now+24h, now+48h].
    //
    // Filters:
    //   - scheduledAt IS NOT NULL  (must have a confirmed time)
    //   - status IN ('pending', 'confirmed')  (not cancelled, not completed)
    //   - scheduledAt BETWEEN now+24h AND now+48h
    //   - No SessionRecap OR SessionRecap.prepSentAt IS NULL
    //
    // NOTE: SessionRecap ↔ Booking has no Prisma @relation defined
    // (the schema was set by UPGRADE2-PREP without one, to keep
    // Booking untouched). So we query SessionRecap separately and
    // filter in memory.
    const windowStart = new Date(now.getTime() + 24 * HOUR);
    const windowEnd = new Date(now.getTime() + 48 * HOUR);

    const candidates = await db.booking.findMany({
      where: {
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: { in: ["pending", "confirmed"] },
      },
      take: 100,
      orderBy: { scheduledAt: "asc" },
      select: { id: true },
    });

    stats.candidates = candidates.length;

    if (candidates.length > 0) {
      // Load existing SessionRecap rows for these bookings in one query.
      const recaps = await db.sessionRecap.findMany({
        where: { bookingId: { in: candidates.map((c) => c.id) } },
        select: { bookingId: true, prepSentAt: true },
      });
      const recapByBooking = new Map(recaps.map((r) => [r.bookingId, r]));

      for (const booking of candidates) {
        const recap = recapByBooking.get(booking.id) as any;
        if (recap?.prepSentAt) {
          // Already sent — skip.
          stats.skipped++;
          continue;
        }
        try {
          const result = await dispatchPrepEmail(booking.id);
          if (result.ok) {
            if (result.skipped) {
              stats.skipped++;
            } else {
              stats.prepSent++;
            }
          } else {
            stats.errors++;
            console.error(
              `[cron/session-emails] prep dispatch failed for ${booking.id}: ${result.reason}`
            );
          }
        } catch (err) {
          stats.errors++;
          console.error(
            `[cron/session-emails] prep dispatch threw for ${booking.id}:`,
            err
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      runAt: now.toISOString(),
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
      ...stats,
    });
  } catch (error) {
    console.error("[cron/session-emails] Fatal:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
