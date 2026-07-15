/**
 * Booking confirmation email — sent after Stripe payment succeeds.
 *
 * Content:
 *   - Confirmation + "Payment received" message
 *   - Session details (duration, price, scheduled time if available)
 *   - What happens next (prep email, what to prepare)
 *   - Brand styling matching the rest of the email system
 *
 * Visual style:
 *   - Dark bg #070707, gold #a58a54 / #c9a96e, Georgia serif
 *   - 560px max-width, editorial spacing
 *   - Per-recipient signed unsubscribe link in the footer
 */

import { sendEmail, type SendEmailResult } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/email-templates";

export interface ConfirmationEmailBooking {
  id: string;
  name: string;
  email: string;
  duration: number;
  price: string;
  scheduledAt?: Date | null;
  roomUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND_GOLD = "#c9a96e";
const ACCENT_GOLD = "#a58a54";
const BG_DARK = "#070707";
const TEXT_LIGHT = "#f0eee9";
const TEXT_BODY = "#cfcabf";
const TEXT_MUTED = "#9a9a9a";
const TEXT_DIM = "#5a5a5a";
const DIVIDER = "#2a2a2a";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";

function formatSessionTime(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function buildFooterNote(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. <a href="${href}" style="color:${TEXT_DIM};text-decoration:underline;">Manage your email preferences</a> or <a href="${href}" style="color:${TEXT_DIM};text-decoration:underline;">unsubscribe instantly</a>.`;
  } catch {
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

async function buildFooterText(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. Manage your email preferences:\n${href}`;
  } catch {
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

/**
 * Render the booking confirmation email (subject + html + text).
 * Pure — does NOT send. Caller dispatches via sendEmail().
 */
export async function renderBookingConfirmation(
  booking: ConfirmationEmailBooking
): Promise<RenderedEmail> {
  const firstName = booking.name.split(" ")[0] || booking.name;

  const subject = booking.scheduledAt
    ? `Your AstroKalki session is confirmed for ${formatSessionTime(booking.scheduledAt)} (IST)`
    : `Your AstroKalki session is confirmed — payment received.`;

  // ─── Scheduled time block ─────────────────────────────────────
  const sessionTimeHtml = booking.scheduledAt
    ? `<p style="font-size:15px;line-height:1.85;color:${TEXT_BODY};font-weight:300;margin:24px 0 0;">
        Your session is scheduled for
        <strong style="color:${ACCENT_GOLD};">${formatSessionTime(booking.scheduledAt)}</strong>
        (IST), for
        <strong style="color:${ACCENT_GOLD};">${booking.duration} minutes</strong>.
      </p>`
    : `<p style="font-size:15px;line-height:1.85;color:${TEXT_BODY};font-weight:300;margin:24px 0 0;">
        Your <strong style="color:${ACCENT_GOLD};">${booking.duration}-minute</strong> session will be scheduled shortly. We'll confirm the exact time via email.
      </p>`;

  const sessionTimeText = booking.scheduledAt
    ? `Your session is on ${formatSessionTime(booking.scheduledAt)} (IST), for ${booking.duration} minutes.`
    : `Your ${booking.duration}-minute session will be scheduled shortly. We'll confirm the exact time via email.`;

  // ─── What happens next ────────────────────────────────────────
  const nextStepsHtml = `
    <hr style="border:none;border-top:1px solid ${DIVIDER};margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 16px;">What happens next</p>
    <ol style="list-style:none;padding:0;margin:0;">
      <li style="font-size:14px;line-height:1.8;color:${TEXT_BODY};font-weight:300;margin:0 0 14px;">
        <span style="color:${ACCENT_GOLD};margin-right:10px;">1.</span>
        You'll receive a <strong style="color:${ACCENT_GOLD};">pre-session prep email</strong> with details on what to prepare — birth details, a quiet space, a notebook.
      </li>
      <li style="font-size:14px;line-height:1.8;color:${TEXT_BODY};font-weight:300;margin:0 0 14px;">
        <span style="color:${ACCENT_GOLD};margin-right:10px;">2.</span>
        At your session time, we'll connect and identify the pattern running beneath the one you already see.
      </li>
      <li style="font-size:14px;line-height:1.8;color:${TEXT_BODY};font-weight:300;margin:0 0 14px;">
        <span style="color:${ACCENT_GOLD};margin-right:10px;">3.</span>
        After the session, you'll receive <strong style="color:${ACCENT_GOLD};">integration prompts</strong> — structured questions to keep the work going.
      </li>
    </ol>
  `;

  const nextStepsText = [
    `What happens next:`,
    `  1. You'll receive a pre-session prep email with details on what to prepare — birth details, a quiet space, a notebook.`,
    `  2. At your session time, we'll connect and identify the pattern running beneath the one you already see.`,
    `  3. After the session, you'll receive integration prompts — structured questions to keep the work going.`,
  ].join("\n");

  // ─── Booking reference ────────────────────────────────────────
  const refHtml = `
    <hr style="border:none;border-top:1px solid ${DIVIDER};margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 8px;">Reference</p>
    <p style="font-size:13px;line-height:1.8;color:${TEXT_MUTED};font-weight:300;margin:0;font-family:monospace;">${booking.id}</p>
  `;

  const refText = `\nReference: ${booking.id}`;

  // ─── HTML body ────────────────────────────────────────────────
  // ─── Meeting link block ────────────────────────────────────────
  const meetingHtml = booking.roomUrl
    ? `
    <hr style="border:none;border-top:1px solid ${DIVIDER};margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 8px;">Meeting link</p>
    <p style="font-size:14px;line-height:1.8;color:${TEXT_BODY};font-weight:300;margin:0 0 16px;">
      Your session will be held over video. Click the button below to join at the scheduled time.
    </p>
    <p style="margin:0;">
      <a href="${escapeHtml(booking.roomUrl)}" style="display:inline-block;background:${ACCENT_GOLD};color:${BG_DARK};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;font-weight:600;">
        Join your session →
      </a>
    </p>
    <p style="font-size:12px;line-height:1.7;color:${TEXT_DIM};font-weight:300;margin-top:8px;">
      Works on any device — no account or download needed. Just click the link.
    </p>
  `
    : "";

  const meetingText = booking.roomUrl
    ? `\nMeeting link: ${booking.roomUrl}\nYour session will be held over video. Click the link to join at the scheduled time. No account needed.`
    : "";

  const bodyHtml = `
    <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 12px;">
      ${escapeHtml(firstName)}, your session is confirmed.
    </h1>
    <p style="font-size:14px;line-height:1.8;color:${BRAND_GOLD};font-weight:300;margin:0;">
      Payment received — <strong>${booking.price}</strong>
    </p>
    ${sessionTimeHtml}
    ${meetingHtml}
    ${nextStepsHtml}
    ${refHtml}
    <hr style="border:none;border-top:1px solid ${DIVIDER};margin:32px 0;"/>
    <p style="font-size:13px;line-height:1.8;color:${TEXT_MUTED};font-weight:300;margin:0 0 16px;">
      Have questions before the session? Reply to this email — we read every message.
    </p>
    <p style="margin:0;">
      <a href="${SITE_URL}/what-to-expect" style="display:inline-block;border:1px solid ${ACCENT_GOLD};color:${ACCENT_GOLD};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">
        What to expect from your session →
      </a>
    </p>
  `;

  // ─── Plain text body ──────────────────────────────────────────
  const textBody = [
    `${booking.name},`,
    ``,
    `Your session is confirmed.`,
    `Payment received — ${booking.price}`,
    ``,
    sessionTimeText,
    meetingText,
    ``,
    nextStepsText,
    refText,
    ``,
    `Have questions before the session? Reply to this email — we read every message.`,
    ``,
    `What to expect: ${SITE_URL}/what-to-expect`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  // ─── Wrap in brand template ──────────────────────────────────
  const footerNote = await buildFooterNote(booking.email);
  const footerText = await buildFooterText(booking.email);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>AstroKalki — Session Confirmed</title>
</head>
<body style="margin:0;padding:0;background:${BG_DARK};">
  <div style="background:${BG_DARK};color:${TEXT_LIGHT};font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:${ACCENT_GOLD};margin:0 0 24px;">AstroKalki</p>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid ${DIVIDER};margin:40px 0 24px;"/>
    <p style="font-size:12px;color:${TEXT_DIM};margin:0;font-weight:300;line-height:1.7;">${footerNote}</p>
    <p style="font-size:13px;color:${ACCENT_GOLD};margin-top:16px;font-style:italic;">— AstroKalki</p>
  </div>
</body>
</html>`;

  const text = `${textBody}\n\n${footerText}`;

  return { subject, html, text };
}

/**
 * Send the booking confirmation email directly.
 * Returns the SendEmailResult so the caller can log the delivery channel.
 */
export async function sendBookingConfirmation(
  booking: ConfirmationEmailBooking
): Promise<SendEmailResult> {
  const { subject, html, text } = await renderBookingConfirmation(booking);
  return sendEmail({ to: booking.email, subject, html, text });
}
