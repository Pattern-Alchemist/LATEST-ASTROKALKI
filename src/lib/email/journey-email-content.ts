/**
 * Post-session email content registry for AstroKalki.
 *
 * All email body text is centralized here for consistency with the rest of
 * the email system. Post-session-journeys.ts imports these instead of
 * hardcoding strings.
 */

// ─── Journey email content ────────────────────────────────────────

export interface JourneyEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export const JOURNEY_EMAIL_CONTENT: Record<string, JourneyEmailContent> = {
  "session-thankyou": {
    subject: "Your session — what comes next",
    htmlBody: `
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
  Thank you for completing your session. Your patterns are worth understanding — and the work you've started here matters.
</p>
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">
  Your portal is ready, where you can revisit your session details, track your journey, and connect with notes from your reading.
</p>`,
    textBody: `Thank you for completing your session. Your patterns are worth understanding — and the work you've started here matters.\n\nYour portal is ready, where you can revisit your session details, track your journey, and connect with notes from your reading.`,
  },

  "reflection-prompt": {
    subject: "One pattern to sit with this week",
    htmlBody: `
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
  It's been a couple of days since your session. Sometimes the patterns we discussed become clearer with a bit of distance.
</p>
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">
  Take a moment to reflect — what's one thing that shifted, even slightly? You can add a reflection note in your portal to track your progress.
</p>`,
    textBody: `It's been a couple of days since your session. Sometimes the patterns we discussed become clearer with a bit of distance.\n\nTake a moment to reflect — what's one thing that shifted, even slightly? You can add a reflection note in your portal to track your progress.`,
  },

  "next-step-guidance": {
    subject: "Continuing your pattern work",
    htmlBody: `
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
  You've had some time to sit with your patterns. If you're ready to go deeper, your portal has everything you need to book your next session.
</p>
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">
  There's no rush — the patterns will wait for you.
</p>`,
    textBody: `You've had some time to sit with your patterns. If you're ready to go deeper, your portal has everything you need to book your next session.\n\nThere's no rush — the patterns will wait for you.`,
  },

  "bundle-offer": {
    subject: "Continue your journey — session packs",
    htmlBody: `
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
  If you've found value in your session, a session pack lets you continue the work at a pace that fits your life.
</p>
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">
  Bundles are available in your portal, with sessions valid for up to 3 months.
</p>`,
    textBody: `If you've found value in your session, a session pack lets you continue the work at a pace that fits your life.\n\nBundles are available in your portal, with sessions valid for up to 3 months.`,
  },

  "inactive-recovery": {
    subject: "We're thinking of you",
    htmlBody: `
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
  It's been a while since your last session. Your patterns are still there, and your portal is always available when you're ready to continue.
</p>
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">
  No pressure — just a reminder that the door is open.
</p>`,
    textBody: `It's been a while since your last session. Your patterns are still there, and your portal is always available when you're ready to continue.\n\nNo pressure — just a reminder that the door is open.`,
  },

  "bundle-reminder": {
    subject: "Your session pack is waiting",
    htmlBody: `
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
  You have a session pack with remaining sessions. Each session builds on the last — the patterns become clearer with continuity.
</p>
<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">
  When you're ready, your portal has everything you need to book your next session.
</p>`,
    textBody: `You have a session pack with remaining sessions. Each session builds on the last — the patterns become clearer with continuity.\n\nWhen you're ready, your portal has everything you need to book your next session.`,
  },
};

/**
 * Get the HTML body for a journey email template.
 */
export function getJourneyHtmlBody(templateId: string): string {
  return JOURNEY_EMAIL_CONTENT[templateId]?.htmlBody || "";
}

/**
 * Get the text body for a journey email template.
 */
export function getJourneyTextBody(templateId: string): string {
  return JOURNEY_EMAIL_CONTENT[templateId]?.textBody || "";
}

/**
 * Get the subject for a journey email template.
 */
export function getJourneySubject(templateId: string): string {
  return JOURNEY_EMAIL_CONTENT[templateId]?.subject || "An update from AstroKalki";
}
