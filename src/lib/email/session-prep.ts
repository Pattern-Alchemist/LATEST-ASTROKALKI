/**
 * Session-prep email — sent to a client immediately after they book a slot
 * (or after they submit the booking intake form).
 *
 * Content:
 *   - Session date/time (if scheduled) + duration
 *   - "What to prepare" — 4-5 practical bullets
 *   - "What to expect" — soft link to /what-to-expect
 *   - The focus areas they selected (booking.contexts)
 *
 * Visual style matches the rest of the email system:
 *   - Dark bg #070707, gold #a58a54, Georgia serif
 *   - 560px max-width, editorial spacing
 *   - Per-recipient signed unsubscribe link in the footer
 *
 * NOTE: renderPrepEmail is async because the per-recipient unsubscribe
 * token uses Web Crypto (HMAC). Callers should await it.
 */

import { sendEmail, type SendEmailResult } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/email-templates";

export interface PrepEmailBooking {
  id: string;
  name: string;
  email: string;
  duration: number;
  /** JSON-stringified array of focus areas (Booking.contexts). */
  contexts: string;
  scheduledAt?: Date | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";

function parseContexts(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
        .filter((s) => s.length > 0);
    }
  } catch {
    return raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

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
    return `We respect your inbox. <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">Manage your email preferences</a> or <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">unsubscribe instantly</a>.`;
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
 * Render the prep email (subject + html + text). Pure — does NOT send.
 * Caller is responsible for actually dispatching via sendEmail(), and for
 * stamping prepSentAt on the SessionRecap row.
 *
 * Async because the per-recipient unsubscribe token uses Web Crypto.
 */
export async function renderPrepEmail(
  booking: PrepEmailBooking
): Promise<RenderedEmail> {
  const firstName = booking.name.split(" ")[0] || booking.name;
  const contexts = parseContexts(booking.contexts);
  const subject = booking.scheduledAt
    ? `Your session is on ${formatSessionTime(booking.scheduledAt)} (IST).`
    : `${firstName}, here's how to prepare for your session.`;

  const prepBullets = [
    `Have your birth details ready — date, exact time, and place of birth. Accuracy matters more than memory; if you're unsure, send a photo of your birth certificate before the session.`,
    `Find a space where you can close the door and not be overheard. A car works. A café does not.`,
    `Bring a notebook and a pen. The session moves quickly and you will want to read your own words back later.`,
    `Think about what you want to <em>understand</em>, not what you want to <em>predict</em>. "Why does this keep happening?" is a better question than "When will it stop?"`,
    `Eat beforehand. Skip alcohol. Come as you are — including skeptical.`,
  ];

  const prepListHtml = prepBullets
    .map(
      (b) =>
        `<li style="font-size:14px;line-height:1.8;color:#cfcabf;font-weight:300;margin:0 0 14px;">${b}</li>`
    )
    .join("");

  const prepListText = prepBullets
    .map((b) => `  - ${b.replace(/<[^>]+>/g, "")}`)
    .join("\n");

  const contextsHtml =
    contexts.length > 0
      ? `
        <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;"/>
        <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 16px;">The focus areas you selected</p>
        <ul style="list-style:none;padding:0;margin:0;">
          ${contexts
            .map(
              (c) =>
                `<li style="font-size:14px;line-height:1.8;color:#cfcabf;font-weight:300;margin:0 0 10px;"><span style="color:#a58a54;margin-right:10px;">•</span>${escapeHtml(
                  c
                )}</li>`
            )
            .join("")}
        </ul>
      `
      : "";

  const contextsText =
    contexts.length > 0
      ? `\nThe focus areas you selected:\n${contexts
          .map((c) => `  • ${c}`)
          .join("\n")}\n`
      : "";

  // ─── Plain text body ──────────────────────────────────────────
  const sessionTimeText = booking.scheduledAt
    ? `Your session is on ${formatSessionTime(
        booking.scheduledAt
      )} (IST), for ${booking.duration} minutes.`
    : `Your ${booking.duration}-minute session is being scheduled. We'll confirm the exact time on WhatsApp.`;

  const textBody = [
    `${booking.name},`,
    ``,
    sessionTimeText,
    ``,
    `What to prepare:`,
    prepListText,
    ``,
    `What to expect:`,
    `  No horoscope language. No predictions. A structured session where we name the specific pattern running beneath the one you already see.`,
    `  Full details: ${SITE_URL}/what-to-expect`,
    contextsText,
    `If you need to reschedule, just reply to this email.`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  // ─── HTML body ────────────────────────────────────────────────
  const sessionLineHtml = booking.scheduledAt
    ? `<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:24px 0 0;">
        Your session is on
        <strong style="color:#a58a54;">${formatSessionTime(
          booking.scheduledAt
        )}</strong>
        (IST), for
        <strong style="color:#a58a54;">${booking.duration} minutes</strong>.
      </p>`
    : `<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:24px 0 0;">
        Your <strong style="color:#a58a54;">${booking.duration}-minute</strong> session is being scheduled. We'll confirm the exact time on WhatsApp.
      </p>`;

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">${escapeHtml(
      firstName
    )},<br/><em style="font-style:italic;color:#a58a54;">before the session.</em></h1>
    ${sessionLineHtml}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 16px;">What to prepare</p>
    <ul style="list-style:none;padding:0;margin:0;">${prepListHtml}</ul>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 12px;">What to expect</p>
    <p style="font-size:14px;line-height:1.8;color:#9a9a9a;font-weight:300;margin:0 0 16px;">
      No horoscope language. No predictions. A structured session where we name the specific pattern running beneath the one you already see.
    </p>
    <p style="margin:0 0 8px;">
      <a href="${SITE_URL}/what-to-expect" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Read the full guide →</a>
    </p>
    ${contextsHtml}
    <p style="font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;margin-top:32px;">
      If you need to reschedule, just reply to this email.
    </p>
  `;

  // ─── Wrap in brand template + signed unsubscribe footer ───────
  const footerNote = await buildFooterNote(booking.email);
  const footerText = await buildFooterText(booking.email);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>AstroKalki</title>
</head>
<body style="margin:0;padding:0;background:#070707;">
  <div style="background:#070707;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/>
    <p style="font-size:12px;color:#5a5a5a;margin:0;font-weight:300;line-height:1.7;">${footerNote}</p>
    <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
  </div>
</body>
</html>`;

  const text = `${textBody}\n\n${footerText}`;

  return { subject, html, text };
}

/**
 * Send the prep email directly (convenience wrapper around render + sendEmail).
 * Returns the SendEmailResult so the caller can log the delivery channel.
 */
export async function sendPrepEmail(
  booking: PrepEmailBooking
): Promise<SendEmailResult> {
  const { subject, html, text } = await renderPrepEmail(booking);
  return sendEmail({ to: booking.email, subject, html, text });
}
