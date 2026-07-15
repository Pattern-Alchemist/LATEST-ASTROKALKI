/**
 * Session-recap email — sent when admin marks a booking as completed.
 *
 * Content:
 *   - "Thank you for the session"
 *   - "Your integration prompts" — 5 AI-generated prompts (gold numbers,
 *     generous spacing)
 *   - "Journal" CTA linking to /journal
 *   - "Book a follow-up" soft CTA
 *   - "Rate your session" link (to /testimonials/submit)
 *
 * Visual style matches the rest of the email system:
 *   - Dark bg #070707, gold #a58a54, Georgia serif
 *   - 560px max-width, editorial spacing
 *   - Per-recipient signed unsubscribe link in the footer
 *
 * NOTE: renderRecapEmail is async because the per-recipient unsubscribe
 * token uses Web Crypto (HMAC).
 */

import { sendEmail, type SendEmailResult } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/email-templates";

export interface RecapEmailBooking {
  id: string;
  name: string;
  email: string;
  duration: number;
  scheduledAt?: Date | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";

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
 * Render the recap email (subject + html + text). Pure — does NOT send.
 * Caller is responsible for dispatching via sendEmail() and for stamping
 * recapSentAt + integrationPrompts on the SessionRecap row.
 *
 * @param booking  The completed booking
 * @param prompts  The 5 AI-generated integration prompts (strings)
 */
export async function renderRecapEmail(
  booking: RecapEmailBooking,
  prompts: string[]
): Promise<RenderedEmail> {
  const firstName = booking.name.split(" ")[0] || booking.name;
  // Defensive: ensure exactly 5 prompts, pad with neutral fallbacks if needed.
  const safePrompts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const p = prompts[i];
    safePrompts.push(
      typeof p === "string" && p.trim().length > 0
        ? p.trim()
        : "What surfaced in the session that you most need to sit with this week?"
    );
  }

  const subject = `${firstName}, your integration prompts.`;

  // ─── Booking-specific testimonial submit URL ─────────────────────
  // Pre-fills booking reference + email on the submit form so the
  // testimonial can be auto-verified (skip moderation, get "Verified
  // Session" badge).
  const reviewParams = new URLSearchParams({
    booking: booking.id,
    email: booking.email,
  });
  const reviewSubmitUrl = `${SITE_URL}/testimonials/submit?${reviewParams.toString()}`;

  // ─── Plain text body ──────────────────────────────────────────
  const textBody = [
    `${booking.name},`,
    ``,
    `Thank you for the session.`,
    ``,
    `What was named doesn't dissolve the moment we end the call. It surfaces slowly — sometimes in the body before the mind catches up. The five prompts below are for that slow surfacing.`,
    ``,
    `Your integration prompts:`,
    ``,
    ...safePrompts.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `Don't answer all five at once. Pick the one that tightens something in your chest — that's the one to write about first.`,
    ``,
    `Journal: ${SITE_URL}/journal`,
    `Book a follow-up: ${SITE_URL}/#booking`,
    `Share your experience: ${reviewSubmitUrl}`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  // ─── HTML body ────────────────────────────────────────────────
  const promptsListHtml = safePrompts
    .map(
      (p, i) => `
      <li style="display:flex;align-items:flex-start;margin:0 0 24px;list-style:none;padding:0;">
        <span style="flex:0 0 36px;color:#a58a54;font-family:Georgia,serif;font-size:18px;font-weight:300;line-height:1.4;text-align:right;padding-right:14px;">${String(
          i + 1
        ).padStart(2, "0")}</span>
        <span style="flex:1;font-size:15px;line-height:1.7;color:#f0eee9;font-weight:300;font-style:italic;">${escapeHtml(
          p
        )}</span>
      </li>`
    )
    .join("");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">${escapeHtml(
      firstName
    )},<br/><em style="font-style:italic;color:#a58a54;">thank you for the session.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">
      What was named doesn't dissolve the moment we end the call. It surfaces slowly — sometimes in the body before the mind catches up. The five prompts below are for that slow surfacing.
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 24px;">Your integration prompts</p>
    <ul style="list-style:none;padding:0;margin:0;">${promptsListHtml}</ul>
    <p style="font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;margin:8px 0 32px;">
      Don't answer all five at once. Pick the one that tightens something in your chest — that's the one to write about first.
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 32px;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 16px;">What's next</p>
    <p style="margin:0 0 12px;">
      <a href="${SITE_URL}/journal" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Open your journal →</a>
    </p>
    <p style="margin:24px 0 12px;">
      <a href="${reviewSubmitUrl}" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Share your experience →</a>
    </p>
    <p style="font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;margin:8px 0;">
      If a pattern was named in the session, name it back in your own words. Your booking reference is pre-filled — your testimonial is marked as a <strong style="color:#a58a54;">Verified Session</strong> and skips moderation.
    </p>
    <p style="font-size:14px;line-height:1.8;color:#9a9a9a;font-weight:300;margin:16px 0 8px;">
      <a href="${SITE_URL}/#booking" style="color:#a58a54;text-decoration:underline;">Book a follow-up</a>
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
 * Send the recap email directly (convenience wrapper around render + sendEmail).
 */
export async function sendRecapEmail(
  booking: RecapEmailBooking,
  prompts: string[]
): Promise<SendEmailResult> {
  const { subject, html, text } = await renderRecapEmail(booking, prompts);
  return sendEmail({ to: booking.email, subject, html, text });
}
