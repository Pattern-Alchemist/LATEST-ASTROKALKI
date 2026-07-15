/**
 * Email layer for AstroKalki.
 *
 * Primary: Resend (https://resend.com)
 * Fallback: SMTP via nodemailer (when RESEND_API_KEY is missing but SMTP is set)
 * Console: Logs to stdout (when neither Resend nor SMTP is configured)
 *
 * Why this order:
 *   Resend guarantees the highest deliverability and requires the least
 *   operational overhead (DKIM, SPF, DMARC, open tracking out of the box).
 *   SMTP is retained as a fallback for teams that self-host.
 *   Console logging ensures no lead/reading/booking is ever silently lost
 *   during local development.
 *
 * Required env (Resend — preferred):
 *   RESEND_API_KEY   re_xxx (from https://resend.com/api-keys)
 *   EMAIL_FROM       "AstroKalki <hello@astrokalki.com>"
 *
 * Fallback env (SMTP):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *
 * Admin notification:
 *   ADMIN_EMAIL      receives new lead / booking / reading notifications
 */

import { sendViaResend, type ResendSendInput } from "./email/resend-client";
import nodemailer, { type Transporter } from "nodemailer";

// ── SMTP fallback (kept for self-hosted setups) ──────────────────────────────

let cachedTransporter: Transporter | null = null;

function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getSmtpTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  return cachedTransporter;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  delivered: "resend" | "smtp" | "console";
  messageId?: string;
  preview: string;
}

// ── SendEmail ────────────────────────────────────────────────────────────────

/**
 * Send an email.
 *
 * Priority:
 *   1. Resend (if RESEND_API_KEY is set)
 *   2. SMTP via nodemailer (if SMTP_HOST + SMTP_USER + SMTP_PASS are set)
 *   3. Console log (always succeeds, never loses data)
 */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "AstroKalki <no-reply@astrokalki.local>";

  // 1. Try Resend first
  if (process.env.RESEND_API_KEY) {
    const resendInput: ResendSendInput = {
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      from,
    };

    const result = await sendViaResend(resendInput);

    if (result.delivered === "resend") {
      return {
        delivered: "resend",
        messageId: result.id,
        preview: result.preview || `Sent to ${input.to} via Resend`,
      };
    }

    // Resend failed — fall through to SMTP
    console.warn("[Email] Resend failed, falling back to SMTP");
  }

  // 2. Fallback: SMTP via nodemailer
  if (hasSmtpConfig()) {
    try {
      const info = await getSmtpTransporter().sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo,
      });

      return {
        delivered: "smtp",
        messageId: info.messageId,
        preview: `Sent to ${input.to} via SMTP (messageId=${info.messageId})`,
      };
    } catch (err) {
      console.error("[Email] SMTP failed:", err);
      // Fall through to console
    }
  }

  // 3. Final fallback: console log
  const preview = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `[EMAIL — No provider configured, logging only]`,
    `From:    ${from}`,
    `To:      ${input.to}`,
    `Subject: ${input.subject}`,
    input.replyTo ? `ReplyTo: ${input.replyTo}` : null,
    "─────────── PLAIN TEXT ───────────",
    input.text,
    "─────────── END ───────────",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ]
    .filter(Boolean)
    .join("\n");

  console.log(preview);

  return {
    delivered: "console",
    preview,
  };
}

// ── Admin notification ───────────────────────────────────────────────────────

/**
 * Send a notification email to the site owner (admin).
 *
 * Uses ADMIN_EMAIL from environment. When unset, the notification is
 * silently skipped — the calling request never fails.
 */
export async function notifyAdmin(params: {
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult | null> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn(
      "[email] ADMIN_EMAIL not set — admin notification skipped. Subject:",
      params.subject
    );
    return null;
  }

  return sendEmail({
    to: adminEmail,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}
