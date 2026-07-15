/**
 * Drip cron — runs hourly, sends drip emails whose scheduled time has arrived.
 *
 * Schedules:
 *   dripStage 0 → welcome sent immediately on subscribe (handled in /api/newsletter)
 *   dripStage 1 → send 48 hours after subscribe (Day +2 email)
 *   dripStage 2 → send 120 hours after subscribe (Day +5 email)
 *   dripStage 3 → drip complete
 *
 * Security: this endpoint requires a CRON_SECRET query param matching
 * process.env.CRON_SECRET. If CRON_SECRET is unset (dev/test), the endpoint
 * is open so manual testing works without setup.
 *
 * Production scheduling:
 *   0 * * * *  curl -fsS "https://preview-0e79c0ab.space-z.ai/api/cron/drip?key=$CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDripDay2, sendDripDay5 } from "@/lib/email-templates";

const HOUR = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Auth — optional in dev, required in prod via env
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.nextUrl.searchParams.get("key");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const stats = {
    day2Sent: 0,
    day5Sent: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // ─── Send Day +2 drips ───
    // Recipients must NOT have opted out AND must have the drip preference
    // enabled (prefDrip=true). The preference center at /unsubscribe lets
    // subscribers mute just the nurture sequence without losing session /
    // blog emails.
    const day2Cutoff = new Date(now.getTime() - 48 * HOUR);
    const day2Candidates = await db.newsletter.findMany({
      where: {
        dripStage: 0,
        optedOut: false,
        prefDrip: true,
        lastDripAt: { lt: day2Cutoff },
      },
      take: 100,
    });

    for (const sub of day2Candidates) {
      try {
        await sendDripDay2(sub.email);
        await db.newsletter.update({
          where: { id: sub.id },
          data: { dripStage: 1, lastDripAt: now },
        });
        stats.day2Sent++;
      } catch (err) {
        console.error(`[cron/drip] Day2 send failed for ${sub.email}:`, err);
        stats.errors++;
      }
    }

    // ─── Send Day +5 drips ───
    // Same preference gate as Day +2: optedOut=false AND prefDrip=true.
    const day5Cutoff = new Date(now.getTime() - 120 * HOUR);
    const day5Candidates = await db.newsletter.findMany({
      where: {
        dripStage: 1,
        optedOut: false,
        prefDrip: true,
        lastDripAt: { lt: day5Cutoff },
      },
      take: 100,
    });

    for (const sub of day5Candidates) {
      try {
        await sendDripDay5(sub.email);
        await db.newsletter.update({
          where: { id: sub.id },
          data: { dripStage: 2, lastDripAt: now },
        });
        stats.day5Sent++;
      } catch (err) {
        console.error(`[cron/drip] Day5 send failed for ${sub.email}:`, err);
        stats.errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      runAt: now.toISOString(),
      ...stats,
    });
  } catch (error) {
    console.error("[cron/drip] Fatal:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
