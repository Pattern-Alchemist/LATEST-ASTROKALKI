/**
 * Email templates for AstroKalki drip sequences, birthday automation,
 * and abandoned-flow recovery.
 *
 * All templates share the same brand-voice principles as the site copy:
 *  - Second-person ("you"), never first-person plural ("we")
 *  - Psychological specificity, not mystical abstraction
 *  - No banned words: destiny, cosmic, transformation, unlock, hidden wisdom
 *  - One idea per email. Long paragraphs are forbidden.
 *  - Every email ends with one CTA — never multiple.
 *
 * Every subscriber-bound template embeds a per-recipient signed
 * unsubscribe / preferences link in the footer:
 *   https://astrokalki.com/unsubscribe?email=<email>&token=<signed>
 * The token is issued server-side at send-time via createUnsubscribeToken
 * (HMAC-signed, valid for 30 days). This satisfies CAN-SPAM / GDPR one-click
 * opt-out requirements while also letting the recipient manage granular
 * preferences (session emails / blog / drip).
 *
 * The SAME signed link is included in BOTH the plain-text and HTML bodies so
 * recipients whose mail client only shows text still have a working
 * unsubscribe link.
 */

import { sendEmail, notifyAdmin, type SendEmailResult } from "./email";
import { createUnsubscribeToken } from "@/lib/security/unsubscribe-token";

// ─── Per-recipient signed unsubscribe link ──────────────────────────────────

/**
 * Build the per-recipient signed unsubscribe URL. Returns the full URL
 * (host + path + query) with an HMAC-signed token valid for 30 days.
 *
 * Async because token signing uses Web Crypto.
 */
export async function buildUnsubscribeUrl(email: string): Promise<string> {
  const { token } = await createUnsubscribeToken(email);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";
  return `${siteUrl}/unsubscribe?email=${encodeURIComponent(
    email.toLowerCase()
  )}&token=${encodeURIComponent(token)}`;
}

/**
 * Build the per-recipient footer NOTE for the HTML body, embedding the
 * signed unsubscribe link as a clickable anchor.
 */
async function buildFooterNoteHtml(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">Manage your email preferences</a> or <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">unsubscribe instantly</a>.`;
  } catch {
    // If token signing fails (e.g. env not configured), fall back to a
    // generic note so the email still sends. The recipient can reply to
    // unsubscribe.
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

/**
 * Build the per-recipient footer LINE for the plain-text body, embedding
 * the signed unsubscribe link as a bare URL.
 */
async function buildFooterText(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. Manage your email preferences:\n${href}`;
  } catch {
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

// ─── Visual brand wrapper used by every template ────────────────────────────

const EMAIL_WRAPPER = (bodyHtml: string, footerNote: string): string => `
<!DOCTYPE html>
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
</html>
`;

// ─── Drip #1 (Day 0 — already wired into /api/newsletter, kept here for reference) ──

// Welcome email is handled inline in /api/newsletter/route.ts. Not re-templated here.
// (The welcome email's inline HTML should also embed a per-recipient
//  unsubscribe link — see M5-b worklog for the recommended migration.)

// ─── Drip #2 (Day +2): One pattern fragment ─────────────────────────────────

export async function sendDripDay2(email: string): Promise<SendEmailResult> {
  const subject = "One pattern. Read it slowly.";
  const footerText = await buildFooterText(email);
  const text = [
    "Most people skim. Try reading this slowly.",
    "",
    "The Control Architecture.",
    "",
    "You don't control because you want power. You control because the",
    "alternative — uncertainty, surprise, the ground shifting under you —",
    "once felt like the end of the world.",
    "",
    "The architecture is impressive. It's also the reason intimacy can't",
    "get in. Control and connection can't occupy the same room. One",
    "always asks the other to leave.",
    "",
    "Does this sound like you?",
    "",
    "— AstroKalki",
    "",
    footerText,
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">One pattern.<br/><em style="font-style:italic;color:#a58a54;">Read it slowly.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;">Most people skim. Try reading this slowly.</p>
    <p style="font-size:20px;line-height:1.5;color:#f0eee9;font-weight:300;margin:32px 0 16px;font-style:italic;">The Control Architecture.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">You don't control because you want power. You control because the alternative — uncertainty, surprise, the ground shifting under you — once felt like the end of the world.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">The architecture is impressive. It's also the reason intimacy can't get in. Control and connection can't occupy the same room. One always asks the other to leave.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">Does this sound like you?</p>
  `;

  const footerNote = await buildFooterNoteHtml(email);
  return sendEmail({
    to: email,
    subject,
    text,
    html: EMAIL_WRAPPER(bodyHtml, footerNote),
  });
}

// ─── Drip #3 (Day +5): Soft CTA to micro-reading ───────────────────────────

export async function sendDripDay5(email: string): Promise<SendEmailResult> {
  const subject = "60 seconds. No chart. Just honesty.";
  const footerText = await buildFooterText(email);
  const text = [
    "Three questions.",
    "",
    "No chart. No mysticism. No horoscope language.",
    "",
    "Just an honest 60 seconds that names the pattern beneath the one you",
    "already see.",
    "",
    "If you've been waiting for permission to look closely — this is it.",
    "",
    "Begin: https://preview-0e79c0ab.space-z.ai/#micro-reading",
    "",
    "— AstroKalki",
    "",
    footerText,
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">60 seconds.<br/><em style="font-style:italic;color:#a58a54;">No chart. Just honesty.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">Three questions.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;">No chart. No mysticism. No horoscope language.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">Just an honest 60 seconds that names the pattern beneath the one you already see.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">If you've been waiting for permission to look closely — this is it.</p>
    <p style="margin-top:32px;">
      <a href="https://preview-0e79c0ab.space-z.ai/#micro-reading" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Begin →</a>
    </p>
  `;

  const footerNote = await buildFooterNoteHtml(email);
  return sendEmail({
    to: email,
    subject,
    text,
    html: EMAIL_WRAPPER(bodyHtml, footerNote),
  });
}

// ─── Enhancement #5: Birthday / solar-return automation ─────────────────────

export async function sendBirthdayEmail(
  email: string,
  birthMonth: number
): Promise<SendEmailResult> {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = monthNames[birthMonth - 1] || "this month";
  const subject = `Your year. One observation. (${monthName}.)`;
  const footerText = await buildFooterText(email);

  const text = [
    "It's your birth month.",
    "",
    "Not a prediction. Not a horoscope.",
    "",
    "Just one observation about the year ahead — read through the pattern",
    "you already know you carry.",
    "",
    "The pattern that named itself in your reading isn't a flaw. It's a",
    "stance you took, once, to survive something. Each year, you have the",
    "chance to notice the stance — and choose, this time, whether to take",
    "it again.",
    "",
    "If this is the year you want to look more closely — book a full decode.",
    "",
    "https://preview-0e79c0ab.space-z.ai/#booking",
    "",
    "— AstroKalki",
    "",
    footerText,
  ].join("\n");

  const bodyHtml = `
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">Your year.<br/><em style="font-style:italic;color:#a58a54;">One observation.</em></h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">It's your birth month.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;">Not a prediction. Not a horoscope.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">Just one observation about the year ahead — read through the pattern you already know you carry.</p>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:24px;">The pattern that named itself in your reading isn't a flaw. It's a stance you took, once, to survive something. Each year, you have the chance to notice the stance — and choose, this time, whether to take it again.</p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">If this is the year you want to look more closely — book a full decode.</p>
    <p style="margin-top:32px;">
      <a href="https://preview-0e79c0ab.space-z.ai/#booking" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Book the full decode →</a>
    </p>
  `;

  const footerNote = await buildFooterNoteHtml(email);
  return sendEmail({
    to: email,
    subject,
    text,
    html: EMAIL_WRAPPER(bodyHtml, footerNote),
  });
}

// ─── Enhancement #4: Abandoned-flow recovery ────────────────────────────────

export async function sendAbandonedRecoveryEmail(
  email: string,
  patternKey: string | null,
  step: number
): Promise<SendEmailResult> {
  // If the user dropped at step 2 (patterns), reference the pattern they
  // selected. If they dropped at step 1 (month) or 3 (frustration), use a
  // softer prompt.
  const patternNames: Record<string, string> = {
    abandonment: "The Abandonment Loop",
    control: "The Control Architecture",
    "people-pleasing": "The Chameleon Pattern",
    "emotional-numbness": "The Deep Freeze",
    overthinking: "The Mental Labyrinth",
    "self-doubt": "The Erosion Pattern",
  };
  const patternName = patternKey ? patternNames[patternKey] : null;

  const subject = patternName
    ? `You stopped at ${patternName}.`
    : "You stopped halfway through the reading.";

  const footerText = await buildFooterText(email);

  const text = patternName
    ? [
        `You stopped at ${patternName}.`,
        "",
        "That's often where people stop — right at the edge of the thing",
        "they came to see.",
        "",
        "The pattern doesn't disappear because you closed the tab. It just",
        "stays unnamed. And unnamed patterns are the ones that keep running",
        "the show.",
        "",
        "If you're ready to read the rest:",
        "https://preview-0e79c0ab.space-z.ai/#micro-reading",
        "",
        "— AstroKalki",
        "",
        footerText,
      ].join("\n")
    : [
        "You stopped halfway through the reading.",
        "",
        "That's often where people stop — right at the edge of the thing",
        "they came to see.",
        "",
        "If you're ready to finish it:",
        "https://preview-0e79c0ab.space-z.ai/#micro-reading",
        "",
        "— AstroKalki",
        "",
        footerText,
      ].join("\n");

  const bodyHtml = patternName
    ? `
      <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">You stopped at<br/><em style="font-style:italic;color:#a58a54;">${patternName}.</em></h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">That's often where people stop — right at the edge of the thing they came to see.</p>
      <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">The pattern doesn't disappear because you closed the tab. It just stays unnamed. And unnamed patterns are the ones that keep running the show.</p>
      <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">If you're ready to read the rest:</p>
      <p style="margin-top:24px;">
        <a href="https://preview-0e79c0ab.space-z.ai/#micro-reading" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Continue the reading →</a>
      </p>
    `
    : `
      <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 32px;">You stopped halfway<br/><em style="font-style:italic;color:#a58a54;">through the reading.</em></h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">That's often where people stop — right at the edge of the thing they came to see.</p>
      <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">If you're ready to finish it:</p>
      <p style="margin-top:24px;">
        <a href="https://preview-0e79c0ab.space-z.ai/#micro-reading" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Continue the reading →</a>
      </p>
    `;

  const footerNote = await buildFooterNoteHtml(email);
  return sendEmail({
    to: email,
    subject,
    text,
    html: EMAIL_WRAPPER(bodyHtml, footerNote),
  });
}

// ─── Convenience: re-export notifyAdmin so callers can import everything from here ──

export { notifyAdmin };
