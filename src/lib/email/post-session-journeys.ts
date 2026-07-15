/**
 * Post-session email journey for AstroKalki.
 *
 * Branches based on whether the client completed a session, has an active bundle,
 * booked a next session, or went inactive after the first consultation.
 *
 * Journey variants:
 *   - integration: Session completed, no follow-up yet
 *   - returning_client: Client has active bundle or follow-up booking
 *   - bundle_nurture: No active bundle, potential upsell
 *   - inactive_recovery: Client went silent after first session
 *
 * Uses centralized email content from journey-email-content.ts for consistency.
 */

import { db } from "@/lib/db";
import { sendViaResend } from "./resend-client";
import {
  JOURNEY_EMAIL_CONTENT,
  getJourneyHtmlBody,
  getJourneyTextBody,
} from "./journey-email-content";

// ─── Journey event types ──────────────────────────────────────────

export type JourneyEvent =
  | "session_completed"
  | "session_notes_shared"
  | "bundle_purchased"
  | "followup_booking_created"
  | "client_portal_opened"
  | "reflection_note_submitted";

// ─── Journey stage definitions ────────────────────────────────────

export interface JourneyStage {
  id: string;
  name: string;
  delayHours: number;
  template: string;
  subject: string;
  stopCondition?: string; // event name that stops the journey
  condition?: (ctx: JourneyContext) => boolean | Promise<boolean>;
}

export interface JourneyContext {
  email: string;
  name?: string;
  bookingId?: string;
  bundlePurchaseId?: string;
}

export const JOURNEY_STAGES: Record<string, JourneyStage[]> = {
  integration: [
    {
      id: "session-thankyou",
      name: "Session Thank You + Portal Access",
      delayHours: 0, // immediate
      template: "post-session-thankyou",
      subject: "Your session — what comes next",
      stopCondition: "followup_booking_created",
    },
    {
      id: "reflection-prompt",
      name: "Reflection Prompt",
      delayHours: 48, // 2 days
      template: "post-session-reflection",
      subject: "One pattern to sit with this week",
      stopCondition: "followup_booking_created",
      condition: async (ctx) => {
        // Don't send if client already submitted a reflection note
        const note = await db.portalNote.findFirst({
          where: {
            bookingId: ctx.bookingId,
            noteType: "reflection",
            deletedAt: null,
          },
        });
        return !note;
      },
    },
    {
      id: "next-step-guidance",
      name: "Next Step Guidance",
      delayHours: 120, // 5 days
      template: "post-session-next-step",
      subject: "Continuing your pattern work",
      stopCondition: "followup_booking_created",
      condition: async (ctx) => {
        // Don't send if follow-up booking exists
        if (!ctx.bookingId) return true;
        const followup = await db.booking.findFirst({
          where: {
            email: ctx.email,
            status: { in: ["pending", "confirmed"] },
            createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        return !followup;
      },
    },
    {
      id: "bundle-offer",
      name: "Bundle Offer",
      delayHours: 168, // 7 days
      template: "post-session-bundle-offer",
      subject: "Continue your journey — session packs",
      condition: async (ctx) => {
        // Don't send if client already has an active bundle
        const activeBundle = await db.bundlePurchase.findFirst({
          where: {
            email: ctx.email,
            status: "paid",
            remainingSessions: { gt: 0 },
          },
        });
        return !activeBundle;
      },
    },
  ],
  inactive_recovery: [
    {
      id: "recovery-checkin",
      name: "Inactive Recovery Check-in",
      delayHours: 336, // 14 days
      template: "inactive-recovery",
      subject: "We're thinking of you",
      stopCondition: "followup_booking_created",
      condition: async (ctx) => {
        // Only send if no recent activity
        const recentBooking = await db.booking.findFirst({
          where: {
            email: ctx.email,
            createdAt: { gt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          },
        });
        return !recentBooking;
      },
    },
  ],
};

// ─── Record journey event ─────────────────────────────────────────

export async function recordJourneyEvent(
  event: JourneyEvent,
  context: JourneyContext
): Promise<void> {
  await db.portalActivity.create({
    data: {
      bookingId: context.bookingId || null,
      bundlePurchaseId: context.bundlePurchaseId || null,
      eventType: `journey.${event}`,
      eventSource: "system",
      payloadJson: JSON.stringify({
        email: context.email,
        event,
        timestamp: new Date().toISOString(),
      }),
    },
  });
}

// ─── Send journey stage email ─────────────────────────────────────

export async function sendJourneyStageEmail(
  stage: JourneyStage,
  context: JourneyContext
): Promise<boolean> {
  // Check stop condition
  if (stage.stopCondition) {
    const shouldStop = await checkStopCondition(
      stage.stopCondition,
      context
    );
    if (shouldStop) {
      console.log(
        `[Journey] Stopping journey for ${context.email} — stop condition met: ${stage.stopCondition}`
      );
      return false;
    }
  }

  // Check optional condition
  if (stage.condition) {
    const passes = await stage.condition(context);
    if (!passes) {
      console.log(
        `[Journey] Skipping stage ${stage.id} for ${context.email} — condition not met`
      );
      return false;
    }
  }

  // Get content from centralized registry
  const content = JOURNEY_EMAIL_CONTENT[stage.template];
  if (!content) {
    console.error(`[Journey] No content found for template: ${stage.template}`);
    return false;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Build HTML with portal CTA
  const fullHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#070707;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;padding:48px 24px;color:#f0eee9;">
  <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#c9a96e;margin:0 0 24px;">AstroKalki</p>
  <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">
    ${content.subject}
  </h1>
  ${content.htmlBody}
  <div style="margin-top:32px;">
    <a href="${siteUrl}/portal" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">
      Open Your Portal
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;" />
  <p style="font-size:12px;color:#5a5a5a;font-weight:300;">
    This email was sent as part of your post-session journey. You can unsubscribe from these emails in your portal settings.
  </p>
  <p style="font-size:13px;color:#c9a96e;margin-top:16px;font-style:italic;">— AstroKalki</p>
</div>
</body>
</html>`;

  const fullText = `
${content.subject}

${content.textBody}

Open Your Portal: ${siteUrl}/portal

— AstroKalki
`;

  // Send email
  const result = await sendViaResend({
    to: context.email,
    subject: content.subject,
    html: fullHtml,
    text: fullText,
    tags: [
      { name: "template", value: stage.template },
      { name: "journey_stage", value: stage.id },
      ...(context.bookingId
        ? [{ name: "bookingId", value: context.bookingId }]
        : []),
    ],
  });

  // Record the send event
  await recordJourneyEvent("session_completed", context).catch(() => {});

  console.log(
    `[Journey] Sent ${stage.id} to ${context.email} via ${result.delivered}`
  );
  return true;
}

// ─── Helpers ──────────────────────────────────────────────────────

async function checkStopCondition(
  eventName: string,
  context: JourneyContext
): Promise<boolean> {
  switch (eventName) {
    case "followup_booking_created":
      const booking = await db.booking.findFirst({
        where: {
          email: context.email,
          status: { in: ["pending", "confirmed"] },
        },
        orderBy: { createdAt: "desc" },
      });
      return !!booking;

    case "bundle_purchased":
      const bundle = await db.bundlePurchase.findFirst({
        where: {
          email: context.email,
          status: "paid",
          remainingSessions: { gt: 0 },
        },
      });
      return !!bundle;

    default:
      return false;
  }
}
