/**
 * Review-request email — sent 3+ days after a session is marked completed
 * (and after the recap email was dispatched), inviting the client to share
 * their experience as a testimonial.
 *
 * Content:
 *   - "How was your session?"
 *   - One short paragraph naming what was named in the session
 *   - "Share your experience" CTA — links to
 *     /testimonials/submit?booking=<id>&email=<encoded> so the submit form
 *     pre-fills the booking reference + email, and the submission can be
 *     auto-verified (skipping moderation).
 *   - "Book a follow-up" soft CTA
 *
 * Visual style matches the rest of the email system:
 *   - Dark bg #070707, gold #a58a54, Georgia serif
 *   - 560px max-width, editorial spacing
 *   - Per-recipient signed unsubscribe link in the footer
 *
 * NOTE: renderReviewRequestEmail is async because the per-recipient
 * unsubscribe token uses Web Crypto (HMAC).
 */

import { sendEmail, type SendEmailResult } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/email-templates";

export interface ReviewRequestBooking {
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
 * Build the booking-specific submit URL with pre-filled booking + email
 * query params so the testimonial form can auto-verify on submit.
 */
export function buildReviewSubmitUrl(booking: {
  id: string;
  email: string;
}): string {
  const params = new URLSearchParams({
    booking: booking.id,
    email: booking.email,
  });
  return `${SITE_URL}/testimonials/submit?${params.toString()}`;
}

/**
 * Render the review-request email (subject + html + text). Pure — does NOT
 * send. Caller is responsible for dispatching via sendEmail().
 */
export async function renderReviewRequestEmail(
  booking: ReviewRequestBooking
): Promise<RenderedEmail> {
  const firstName = booking.name.split(" ")[0] || booking.name;
  const submitUrl = buildReviewSubmitUrl(booking);

  const subject = `${firstName}, how was your session?`;

  // ─── Plain text body ──────────────────────────────────────────
  const textBody = [
    `${booking.name},`,
    ``,
    `A few days have passed since the session.`,
    ``,
    `If a pattern was named — and you want to name it back, in your own words — your testimony helps the next person recognise it in themselves.`,
    ``,
    `Share your experience:`,
    submitUrl,
    ``,
    `Submissions are read by hand and published anonymously (first-initial, age, the session it followed). If you include the booking reference, your testimonial is marked as a "Verified Session" — it carries more weight than an anonymous submission, and it skips the moderation queue.`,
    ``,
    `Book a follow-up: ${SITE_URL}/#booking`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  // ─── HTML body ────────────────────────────────────────────────
  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">${escapeHtml(
      firstName
    )},<br/><em style="font-style:italic;color:#a58a54;">how was your session?</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">
      A few days have passed since the session. If a pattern was named — and you want to name it back, in your own words — your testimony helps the next person recognise it in themselves.
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;"/>
    <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 16px;">Share your experience</p>
    <p style="margin:0 0 12px;">
      <a href="${submitUrl}" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Share your experience →</a>
    </p>
    <p style="font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;margin:16px 0 8px;">
      Submissions are read by hand and published anonymously — first-initial, age, the session it followed. The booking reference is pre-filled, so your testimonial is marked as a <strong style="color:#a58a54;">Verified Session</strong> and skips the moderation queue.
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>
    <p style="font-size:14px;line-height:1.8;color:#9a9a9a;font-weight:300;margin:0;">
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
 * Send the review-request email directly (convenience wrapper).
 */
export async function sendReviewRequestEmail(
  booking: ReviewRequestBooking
): Promise<SendEmailResult> {
  const { subject, html, text } = await renderReviewRequestEmail(booking);
  return sendEmail({ to: booking.email, subject, html, text });
}
