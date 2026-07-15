/**
 * Drip email content — subject lines, HTML bodies, and plain-text bodies
 * for the 3 post-session integration drips.
 *
 * Each function returns { subject, html, text } ready to pass to sendEmail().
 * The HTML already includes the AstroKalki brand wrapper (070707 bg, gold #a58a54,
 * Georgia serif, signed unsubscribe footer).
 *
 * Tone: calm, emotionally specific, Jyotish-guided. Never pushy.
 * One CTA per email.
 */

import { buildUnsubscribeUrl } from "@/lib/email-templates";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
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

function brandWrapper(bodyHtml: string, footerNote: string): string {
  return `<!DOCTYPE html>
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
}

export interface DripEmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Drip 2 — Post-session reflection (Day +1)
 * Sent 24 hours after the session recap.
 * Gentle nudge to journal and sit with what was named.
 * One CTA: "Open your journal"
 */
export async function postSessionReflection(
  firstName: string,
  email: string
): Promise<DripEmailContent> {
  const subject = `${escapeHtml(firstName)}, one pattern to sit with.`;

  const textBody = [
    `${firstName},`,
    ``,
    `A day has passed since the session.`,
    ``,
    `What was named yesterday doesn't need you to act on it today. It needs you to sit with it — without fixing, without deciding, without explaining it away.`,
    ``,
    `The patterns that shape your life were not formed in a single conversation. One session names them. The days after are where the naming becomes real.`,
    ``,
    `Here is one question for today:`,
    ``,
    `  "If this pattern had a voice, what would it have said in the session — but didn't?"`,
    ``,
    `Write the answer down before your mind edits it.`,
    ``,
    `You don't need to share it. But naming it to yourself is the second step. The first step was booking the session.`,
    ``,
    `Journal: ${SITE_URL}/journal`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">${escapeHtml(firstName)},<br/><em style="font-style:italic;color:#a58a54;">one pattern to sit with.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">A day has passed since the session.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin:0 0 24px;">What was named yesterday doesn't need you to act on it today. It needs you to sit with it — without fixing, without deciding, without explaining it away.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">The patterns that shape your life were not formed in a single conversation. One session names them. The days after are where the naming becomes real.</p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>
    <h2 style="font-size:18px;font-weight:300;letter-spacing:-0.01em;line-height:1.3;color:#f0eee9;margin:0 0 16px;">One question for today</h2>
    <p style="font-size:16px;line-height:1.7;color:#a58a54;font-weight:300;font-style:italic;margin:0 0 24px;padding:16px;background:#0d0d0d;border-left:2px solid #a58a54;">"If this pattern had a voice, what would it have said in the session — but didn't?"</p>
    <p style="font-size:14px;line-height:1.7;color:#9a9a9a;font-weight:300;margin:0 0 24px;">Write the answer down before your mind edits it. You don't need to share it. But naming it to yourself is the second step. The first step was booking the session.</p>
    <p style="margin-top:24px;">
      <a href="${SITE_URL}/journal" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Open your journal →</a>
    </p>
  `;

  const footerNote = await buildFooterNote(email);
  const footerText = await buildFooterText(email);

  return {
    subject,
    html: brandWrapper(bodyHtml, footerNote),
    text: `${textBody}\n\n${footerText}`,
  };
}

/**
 * Drip 3 — Two-week check-in (Day +14)
 * Sent 14 days after the session.
 * Asks how integration is going. Soft CTA to book follow-up.
 * One CTA: "Book a follow-up"
 */
export async function twoWeekCheckIn(
  firstName: string,
  email: string
): Promise<DripEmailContent> {
  const subject = `${escapeHtml(firstName)}, two weeks later.`;

  const textBody = [
    `${firstName},`,
    ``,
    `Two weeks since the session.`,
    ``,
    `The question is not "Has everything changed?" The question is: "What have you noticed that you would not have noticed before?"`,
    ``,
    `Sometimes the pattern shows up in subtle ways the second week — not as a crisis, but as a familiar thought, a familiar hesitation, a familiar choice. Noticing it is the practice.`,
    ``,
    `If a specific pattern was named in the session, watch for it this week — not to fight it, just to see it arrive. The seeing is the shift.`,
    ``,
    `You know where to find me if something surfaced that wants a closer look.`,
    ``,
    `Book a follow-up: ${SITE_URL}/#booking`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">${escapeHtml(firstName)},<br/><em style="font-style:italic;color:#a58a54;">two weeks later.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">Two weeks since the session.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin:0 0 24px;">The question is not "Has everything changed?" The question is: <em style="color:#cfcabf;">"What have you noticed that you would not have noticed before?"</em></p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">Sometimes the pattern shows up in subtle ways the second week — not as a crisis, but as a familiar thought, a familiar hesitation, a familiar choice. Noticing it is the practice.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin:0 0 24px;">If a specific pattern was named in the session, watch for it this week — not to fight it, just to see it arrive. The seeing is the shift.</p>
    <p style="margin-top:24px;">
      <a href="${SITE_URL}/#booking" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Book a follow-up →</a>
    </p>
  `;

  const footerNote = await buildFooterNote(email);
  const footerText = await buildFooterText(email);

  return {
    subject,
    html: brandWrapper(bodyHtml, footerNote),
    text: `${textBody}\n\n${footerText}`,
  };
}

/**
 * Drip 4 — One-month check-in (Day +28)
 * Sent 28 days after the session.
 * Marks the completion of the integration cycle. Names the lunar cycle metaphor.
 * One CTA: "Book a follow-up"
 */
export async function oneMonthCheckIn(
  firstName: string,
  email: string
): Promise<DripEmailContent> {
  const subject = `${escapeHtml(firstName)}, a month later.`;

  const textBody = [
    `${firstName},`,
    ``,
    `A month. One lunar cycle since the session.`,
    ``,
    `In Jyotish, each phase of the moon carries a different quality — the same pattern looked at under different light. What you saw in the session four weeks ago may look different now. Not because the pattern changed, but because you are standing in a different part of the room.`,
    ``,
    `You have been sitting with something real. That alone changes the relationship between you and the pattern.`,
    ``,
    `If the pattern has shown up differently this month — or if you want to see the next layer — a follow-up session can look at what has surfaced since.`,
    ``,
    `No pressure. Just the invitation.`,
    ``,
    `Book a follow-up: ${SITE_URL}/#booking`,
    ``,
    `— AstroKalki`,
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">${escapeHtml(firstName)},<br/><em style="font-style:italic;color:#a58a54;">a month later.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">A month. One lunar cycle since the session.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin:0 0 24px;">In Jyotish, each phase of the moon carries a different quality — the same pattern looked at under different light. What you saw in the session four weeks ago may look different now. Not because the pattern changed, but because you are standing in a different part of the room.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 24px;">You have been sitting with something real. That alone changes the relationship between you and the pattern.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin:0 0 24px;">If the pattern has shown up differently this month — or if you want to see the next layer — a follow-up session can look at what has surfaced since.</p>
    <p style="font-size:14px;line-height:1.7;color:#7a7a7a;font-weight:300;margin:0 0 24px;font-style:italic;">No pressure. Just the invitation.</p>
    <p style="margin-top:24px;">
      <a href="${SITE_URL}/#booking" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Book a follow-up →</a>
    </p>
  `;

  const footerNote = await buildFooterNote(email);
  const footerText = await buildFooterText(email);

  return {
    subject,
    html: brandWrapper(bodyHtml, footerNote),
    text: `${textBody}\n\n${footerText}`,
  };
}
