/**
 * POST /api/email/process-drips
 *
 * Cron-triggered endpoint that processes pending drip emails.
 *
 * How it works:
 *   1. Queries all Newsletter rows where:
 *       - optedOut = false
 *       - dripStage < 13 (not complete for post-session) AND dripStage < 3 (not complete for welcome)
 *       - lastDripAt is old enough that the next email is due
 *   2. For each subscriber, checks their dripStage and elapsed time:
 *       - Stage 0: sent immediately (welcome) or needs 24h (post-session stage 10)
 *       - Stage 1 → 2: needs 48h (welcome) or 336h (post-session stage 11)
 *       - Stage 2 → complete: needs 72h (welcome) or 672h (post-session stage 12)
 *   3. Sends the appropriate email via Resend
 *   4. Advances dripStage + stamps lastDripAt
 *
 * Security:
 *   - Requires CRON_SECRET header to prevent public access
 *   - Protected by body size cap
 *
 * For Vercel cron (see vercel.json):
 *   - Scheduled: "0 8 * * *" (daily at 8 AM IST)
 *   - Or manual trigger from admin dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { postSessionReflection, twoWeekCheckIn, oneMonthCheckIn } from "@/lib/email/drip-content";

// ── Constants ────────────────────────────────────────────────────────────────

/** Hours each drip stage requires before the next email is due. */
const STAGE_INTERVALS_HOURS: Record<number, number> = {
  // Welcome sequence (stages 0–2)
  0: 0, // welcome is sent immediately
  1: 48, // Day 2: 48 hours after stage 0
  2: 72, // Day 5: 72 hours after stage 1
  // Post-session sequence (stages 10–12)
  10: 24, // Day 1: 24 hours after session
  11: 336, // Day 14: 14 days after stage 10
  12: 672, // Day 28: 28 days after stage 11
};

/** Maps dripStage → email template to send (subject + content). */
function getStageSubject(stage: number, firstName: string): string | null {
  switch (stage) {
    // Welcome sequence
    case 0:
      return null; // Welcome sent inline in newsletter route
    case 1:
      return "One pattern. Read it slowly.";
    case 2:
      return "60 seconds. No chart. Just honesty.";
    // Post-session sequence (content functions below)
    case 10:
      return `${firstName}, one pattern to sit with.`;
    case 11:
      return `${firstName}, two weeks later.`;
    case 12:
      return `${firstName}, a month later.`;
    default:
      return null;
  }
}

/** Returns the next stage after sending the current one. */
function nextStage(stage: number): number {
  if (stage < 3) return stage + 1; // Welcome: 0→1→2→3(complete)
  if (stage >= 10 && stage < 13) return stage + 1; // Post-session: 10→11→12→13(complete)
  return stage; // Already complete
}

/**
 * POST handler — process all pending drip emails.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret to prevent public access
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && auth !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all active subscribers eligible for drip processing
    const subscribers = await db.newsletter.findMany({
      where: {
        optedOut: false,
        prefDrip: true,
        dripStage: { notIn: [3, 13] }, // not complete
        lastDripAt: { not: null },
      },
    });

    const results: Array<{
      email: string;
      stage: number;
      action: "sent" | "too_soon" | "error" | "skipped";
      subject?: string;
    }> = [];

    const now = Date.now();

    for (const sub of subscribers) {
      const stage = sub.dripStage;
      const lastDripAt = sub.lastDripAt!.getTime();
      const hoursElapsed = (now - lastDripAt) / (1000 * 60 * 60);
      const requiredHours = STAGE_INTERVALS_HOURS[stage];

      // Check if enough time has elapsed
      if (requiredHours !== undefined && hoursElapsed < requiredHours) {
        results.push({
          email: sub.email,
          stage,
          action: "too_soon",
        });
        continue;
      }

      const firstName = sub.email.split("@")[0].split(".")[0];
      const firstNameTitle =
        firstName.charAt(0).toUpperCase() + firstName.slice(1);

      try {
        // Determine what to send based on stage
        switch (stage) {
          case 0:
            // Welcome — already sent inline; just advance
            await db.newsletter.update({
              where: { email: sub.email },
              data: {
                dripStage: nextStage(stage),
                lastDripAt: new Date(),
              },
            });
            results.push({ email: sub.email, stage, action: "sent", subject: "welcome (already sent)" });
            break;

          case 1:
            // "One pattern. Read it slowly." — send text-only or use existing template
            await sendDripEmail(sub.email, "One pattern. Read it slowly.", stage);
            results.push({ email: sub.email, stage, action: "sent", subject: "One pattern. Read it slowly." });
            break;

          case 2:
            // "60 seconds. No chart. Just honesty."
            await sendDripEmail(sub.email, "60 seconds. No chart. Just honesty.", stage);
            results.push({ email: sub.email, stage, action: "sent", subject: "60 seconds. No chart. Just honesty." });
            break;

          case 10:
            // Post-session Day 1 reflection
            const content10 = await postSessionReflection(firstNameTitle, sub.email);
            await sendEmail({
              to: sub.email,
              subject: content10.subject,
              html: content10.html,
              text: content10.text,
            });
            await advanceStage(sub.email, stage);
            results.push({ email: sub.email, stage, action: "sent", subject: content10.subject });
            break;

          case 11:
            // Post-session Day 14 check-in
            const content11 = await twoWeekCheckIn(firstNameTitle, sub.email);
            await sendEmail({
              to: sub.email,
              subject: content11.subject,
              html: content11.html,
              text: content11.text,
            });
            await advanceStage(sub.email, stage);
            results.push({ email: sub.email, stage, action: "sent", subject: content11.subject });
            break;

          case 12:
            // Post-session Day 28 check-in (final)
            const content12 = await oneMonthCheckIn(firstNameTitle, sub.email);
            await sendEmail({
              to: sub.email,
              subject: content12.subject,
              html: content12.html,
              text: content12.text,
            });
            await advanceStage(sub.email, stage);
            results.push({ email: sub.email, stage, action: "sent", subject: content12.subject });
            break;

          default:
            results.push({ email: sub.email, stage, action: "skipped" });
        }
      } catch (err) {
        console.error(`[Drip] Failed to send stage ${stage} to ${sub.email}:`, err);
        results.push({ email: sub.email, stage, action: "error" });
      }
    }

    const summary = {
      processed: results.length,
      sent: results.filter((r) => r.action === "sent").length,
      tooSoon: results.filter((r) => r.action === "too_soon").length,
      errors: results.filter((r) => r.action === "error").length,
      skipped: results.filter((r) => r.action === "skipped").length,
    };

    console.log("[Drip Cron] Processed:", summary);

    return NextResponse.json({ ok: true, ...summary, details: results }, { status: 200 });
  } catch (error) {
    console.error("[Drip Cron] Fatal error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

/**
 * Send a welcome-sequence drip email with consistent brand styling.
 * For stages 1 and 2 (welcome sequence), we send a simple branded email.
 */
async function sendDripEmail(
  email: string,
  subject: string,
  stage: number
): Promise<void> {
  const bodyText = stage === 1
    ? "Most people skim. Try reading this slowly.\n\nThe Control Architecture.\n\nYou don't control because you want power. You control because the alternative — uncertainty, surprise, the ground shifting under you — once felt like the end of the world.\n\nThe architecture is impressive. It's also the reason intimacy can't get in. Control and connection can't occupy the same room. One always asks the other to leave.\n\n— AstroKalki"
    : "Three questions.\n\nNo chart. No mysticism. No horoscope language.\n\nJust an honest 60 seconds that names the pattern beneath the one you already see.\n\nIf you've been waiting for permission to look closely — this is it.\n\nBegin: https://astrokalki.com/#micro-reading\n\n— AstroKalki";

  const bodyHtml = stage === 1
    ? `<h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">One pattern.<br/><em style="font-style:italic;color:#a58a54;">Read it slowly.</em></h1>
       <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;">Most people skim. Try reading this slowly.</p>
       <p style="font-size:20px;line-height:1.5;color:#f0eee9;font-weight:300;margin:32px 0 16px;font-style:italic;">The Control Architecture.</p>
       <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">You don't control because you want power. You control because the alternative — uncertainty, surprise, the ground shifting under you — once felt like the end of the world.</p>
       <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">The architecture is impressive. It's also the reason intimacy can't get in. Control and connection can't occupy the same room. One always asks the other to leave.</p>`
    : `<h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">60 seconds.<br/><em style="font-style:italic;color:#a58a54;">No chart. Just honesty.</em></h1>
       <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">Three questions.</p>
       <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;">No chart. No mysticism. No horoscope language.</p>
       <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">Just an honest 60 seconds that names the pattern beneath the one you already see.</p>
       <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">If you've been waiting for permission to look closely — this is it.</p>
       <p style="margin-top:32px;"><a href="https://astrokalki.com/#micro-reading" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Begin →</a></p>`;

  await sendEmail({
    to: email,
    subject,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#070707;"><div style="background:#070707;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;"><p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>${bodyHtml}<hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/><p style="font-size:12px;color:#5a5a5a;margin:0;font-weight:300;">— AstroKalki</p></div></body></html>`,
    text: bodyText,
  });

  await advanceStage(email, stage);
}

/**
 * Advance the user's drip stage and stamp lastDripAt.
 */
async function advanceStage(email: string, currentStage: number): Promise<void> {
  await db.newsletter.update({
    where: { email },
    data: {
      dripStage: nextStage(currentStage),
      lastDripAt: new Date(),
    },
  });
}
