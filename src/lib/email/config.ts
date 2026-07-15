/**
 * Email infrastructure for AstroKalki
 *
 * This module provides template configuration and the primary sendEmail
 * function used by API routes and background jobs.
 *
 * Provider: Resend (https://resend.com)
 *   - Higher deliverability than SMTP
 *   - Built-in open/click tracking
 *   - No SMTP credentials to manage
 *
 * Fallback: Console logging (dev/local — always succeeds)
 *
 * Required env:
 *   RESEND_API_KEY   re_xxx (from https://resend.com/api-keys)
 *   EMAIL_FROM       sender address (default: hello@astrokalki.com)
 */

import { sendViaResend } from "./resend-client";

// ── Template registry ────────────────────────────────────────────────────────
// Maps template slugs to their default subject + any metadata.
// Actual HTML rendering lives in ./templates.ts and ./email-templates.ts.

export const emailTemplates = {
  "lead-magnet-delivery": {
    subject: "Your AstroKalki Pattern Recognition Guide",
    description: "Sent after downloading a lead magnet (guide, quiz, checklist)",
  },
  "session-confirmation": {
    subject: "Your AstroKalki Session Confirmed",
    description: "Sent after a session is successfully booked",
  },
  "pre-session-prep": {
    subject: "Prepare for Your Pattern Reading Session",
    description: "Sent 24h before a scheduled session",
  },
  "post-session-integration": {
    subject: "Your Integration Prompts — Continuing the Pattern Work",
    description: "Sent after a session is completed (recap + prompts)",
  },
  "post-session-reflection": {
    subject: "One Pattern to Sit With",
    description: "Sent 1 day after session — gentle reflection nudge",
  },
  "check-in-2-weeks": {
    subject: "Two Weeks Later — How Is the Integration?",
    description: "Sent 14 days after session — gentle check-in",
  },
  "check-in-4-weeks": {
    subject: "A Month Later — A Note Before the Cycle Turns",
    description: "Sent 28 days after session — final drip in the sequence",
  },
  "welcome-drip-1": {
    subject: "Patterns don't break without awareness.",
    description: "Welcome email sent immediately on newsletter signup",
  },
  "welcome-drip-2": {
    subject: "One pattern. Read it slowly.",
    description: "Sent 2 days after signup — pattern fragment",
  },
  "welcome-drip-3": {
    subject: "60 seconds. No chart. Just honesty.",
    description: "Sent 5 days after signup — CTA to micro-reading",
  },
  "abandoned-recovery": {
    subject: "You stopped halfway through the reading.",
    description: "Sent 1 hour after abandoned micro-reading flow",
  },
  "birthday-observation": {
    subject: "Your year. One observation.",
    description: "Yearly solar-return / birthday email",
  },
  // ── Phase 16: Post-session journey emails ──────────────────────────────
  "journey-session-thankyou": {
    subject: "Your session — what comes next",
    description: "Immediate post-session thank you + portal access",
  },
  "journey-reflection-prompt": {
    subject: "One pattern to sit with this week",
    description: "Reflection nudge 24-48h after session",
  },
  "journey-next-step-guidance": {
    subject: "Continuing your pattern work",
    description: "Continuation guidance around day 5-7",
  },
  "journey-bundle-offer": {
    subject: "Continue your journey — session packs",
    description: "Bundle suggestion for clients without active bundle",
  },
  "journey-inactive-recovery": {
    subject: "We're thinking of you",
    description: "Reactivation email for inactive clients",
  },
  "journey-bundle-reminder": {
    subject: "Your session pack is waiting",
    description: "Reminder for clients with remaining bundle sessions",
  },
} as const;

export type EmailTemplateSlug = keyof typeof emailTemplates;

// ── SendEmail (template-based) ──────────────────────────────────────────────

export interface SendEmailInput {
  to: string;
  subject: string;
  template: string;
  data?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using a named template.
 *
 * Delegates to Resend for actual delivery, with console fallback
 * when RESEND_API_KEY is not configured.
 */
export async function sendEmail({
  to,
  subject,
  template,
  data = {},
}: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || "hello@astrokalki.com";

  try {
    // Build a simple HTML body from template metadata + data
    const templateMeta = emailTemplates[template as EmailTemplateSlug];
    const description = templateMeta?.description || "";

    const html = `
      <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
        <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
        <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">${subject}</h1>
        <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">${description}</p>
        <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/>
        <p style="font-size:12px;color:#5a5a5a;font-weight:300;">— AstroKalki</p>
      </div>
    `;

    const text = `${subject}\n\n${description}\n\n— AstroKalki`;

    const result = await sendViaResend({
      to,
      subject,
      html,
      text,
      from,
      tags: [
        { name: "template", value: template },
        ...Object.entries(data).map(([key, val]) => ({
          name: `data_${key}`,
          value: String(val),
        })),
      ],
    });

    if (result.delivered === "console") {
      console.log(`[Email] Template "${template}" logged to console for ${to}`);
    }

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error(`[Email] Failed to send template "${template}" to ${to}:`, error);
    return { success: false, error: String(error) };
  }
}

// ── Drip campaigns (configuration) ──────────────────────────────────────────

export interface DripLesson {
  day: number;
  title: string;
  template: string;
}

export const dripCampaigns = {
  /** 3-email welcome drip for new newsletter subscribers. */
  welcomeSequence: {
    name: "New Subscriber Welcome",
    trigger: "on_subscribe",
    emails: [
      {
        day: 0,
        title: "Patterns don't break without awareness.",
        template: "welcome-drip-1",
        sendAfterHours: 0, // immediate
      },
      {
        day: 2,
        title: "One pattern. Read it slowly.",
        template: "welcome-drip-2",
        sendAfterHours: 48, // 2 days
      },
      {
        day: 5,
        title: "60 seconds. No chart. Just honesty.",
        template: "welcome-drip-3",
        sendAfterHours: 120, // 5 days
      },
    ],
  },

  /** 3-email post-session integration sequence. */
  postSessionSequence: {
    name: "Post-Session Integration",
    trigger: "on_session_complete",
    emails: [
      {
        day: 1,
        title: "One Pattern to Sit With",
        template: "post-session-reflection",
        sendAfterHours: 24, // 1 day
      },
      {
        day: 14,
        title: "Two Weeks Later — How Is the Integration?",
        template: "check-in-2-weeks",
        sendAfterHours: 336, // 14 days
      },
      {
        day: 28,
        title: "A Month Later — A Note Before the Cycle Turns",
        template: "check-in-4-weeks",
        sendAfterHours: 672, // 28 days
      },
    ],
  },
};

export const leadMagnets = {
  patternRecognitionGuide: {
    title: "The Complete Pattern Recognition Guide",
    description: "Understand the 7 karmic loops running your relationships and choices",
    pages: 24,
    format: "PDF",
  },
  quizzes: {
    shadowPatternQuiz: {
      title: "Which Shadow Pattern Is Running Your Relationships?",
      questions: 15,
      leadTime: "2 minutes",
    },
    karmicLoopQuiz: {
      title: "What Karmic Loop Are You Repeating?",
      questions: 18,
      leadTime: "3 minutes",
    },
  },
};
