/**
 * Email course cron — runs hourly, advances the 5-day drip.
 *
 * For each enrollment where:
 *   - stage < 6 (course not complete)
 *   - lastSentAt is null OR lastSentAt is more than 24 hours ago
 *
 *   • If stage is 0..4: send Day (stage + 1), advance to stage (stage + 1),
 *     set lastSentAt = now.
 *   • If stage is 5: Day 5 has already been sent — mark the course complete
 *     (stage → 6, completedAt = now, lastSentAt = now).
 *
 * Stage mapping (per prisma/schema.prisma):
 *   0 = enrolled, no email sent yet
 *   1 = Day 1 sent
 *   2 = Day 2 sent
 *   3 = Day 3 sent
 *   4 = Day 4 sent
 *   5 = Day 5 sent
 *   6 = complete
 *
 * Security: same pattern as /api/cron/drip — auth via CRON_SECRET query param.
 * Accepts either ?key=CRON_SECRET or ?secret=CRON_SECRET. If CRON_SECRET is
 * unset (dev/test), the endpoint is open so manual testing works without
 * setup.
 *
 * Production scheduling (hourly):
 *   0 * * * *  curl -fsS "https://astrokalki.com/api/cron/email-course?key=$CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderCourseEmail } from "@/lib/email-course/render";
import { COURSE_LENGTH } from "@/lib/email-course/content";

const HOUR = 60 * 60 * 1000;
const SEND_GAP_MS = 24 * HOUR; // one day between course emails

// Stage value that means "complete" — per the schema comment, 6.
const STAGE_COMPLETE = COURSE_LENGTH + 1;

export async function GET(request: NextRequest) {
  // Auth — optional in dev, required in prod via env
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
  const cutoff = new Date(now.getTime() - SEND_GAP_MS);

  const stats = {
    sent: 0,
    completed: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Find enrollments ready for their next action.
    //   stage < 6         → course not finished
    //   lastSentAt IS NULL OR lastSentAt < cutoff
    //
    // lastSentAt IS NULL handles the rare case where /api/email-course
    // created the enrollment at stage 0 but the immediate Day-1 send failed
    // (SMTP down, etc.). The cron will pick it up and send Day 1 on the
    // next run, advancing stage 0 → 1.
    const candidates = await db.emailCourseEnrollment.findMany({
      where: {
        stage: { lt: STAGE_COMPLETE },
        OR: [{ lastSentAt: null }, { lastSentAt: { lt: cutoff } }],
      },
      take: 100,
      orderBy: { createdAt: "asc" },
    });

    for (const enrollment of candidates) {
      // ─── Stage 5 → mark complete ────────────────────────────────────────
      // Day 5 was already sent (by the previous cron run that advanced
      // stage 4 → 5). Now that 24h have passed, record completion.
      if (enrollment.stage === COURSE_LENGTH) {
        try {
          await db.emailCourseEnrollment.update({
            where: { id: enrollment.id },
            data: {
              stage: STAGE_COMPLETE,
              completedAt: now,
              lastSentAt: now,
            },
          });
          stats.completed++;
        } catch (err) {
          console.error(
            `[cron/email-course] Completion update failed for ${enrollment.email}:`,
            err
          );
          stats.errors++;
        }
        continue;
      }

      // ─── Stage 0..4 → send Day (stage + 1) ──────────────────────────────
      const nextDay = enrollment.stage + 1;

      // Defensive: nextDay must be within 1..COURSE_LENGTH
      if (nextDay < 1 || nextDay > COURSE_LENGTH) {
        // Shouldn't happen given the filters above, but be safe.
        await db.emailCourseEnrollment.update({
          where: { id: enrollment.id },
          data: { stage: STAGE_COMPLETE, completedAt: now, lastSentAt: now },
        });
        stats.skipped++;
        continue;
      }

      try {
        const rendered = await renderCourseEmail(nextDay, enrollment.email);
        if (!rendered) {
          // Render returned null — day out of range. Skip defensively.
          stats.skipped++;
          continue;
        }

        await sendEmail({
          to: enrollment.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });

        // Advance the stage. lastSentAt = now so we wait another 24h.
        await db.emailCourseEnrollment.update({
          where: { id: enrollment.id },
          data: {
            stage: nextDay,
            lastSentAt: now,
          },
        });

        stats.sent++;
      } catch (err) {
        console.error(
          `[cron/email-course] Day ${nextDay} send failed for ${enrollment.email}:`,
          err
        );
        stats.errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      runAt: now.toISOString(),
      candidates: candidates.length,
      ...stats,
    });
  } catch (error) {
    console.error("[cron/email-course] Fatal:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
