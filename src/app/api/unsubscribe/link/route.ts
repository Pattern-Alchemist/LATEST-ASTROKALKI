import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import {
  checkRateLimit,
  getClientIp,
  validateInput,
  isHoneypotTriggered,
  emailSchema,
  createUnsubscribeToken,
} from '@/lib/security';

/**
 * POST /api/unsubscribe/link — send the subscriber a fresh preferences link.
 *
 * Body: { email, website? (honeypot) }
 *
 * Flow:
 *   1. Rate-limit: 3 requests/hour per email (prevents a malicious visitor
 *      from spamming a victim's inbox with "preferences link" emails).
 *   2. Honeypot: if `website` is non-empty, return fake success.
 *   3. Zod-validate the email.
 *   4. Look up the subscriber. If not found, STILL return success (so this
 *      endpoint cannot be used to enumerate which emails are on the list).
 *   5. If found, issue a 30-day signed token and send a plain-text + HTML
 *      email containing the link to /unsubscribe?email=...&token=...
 *
 * This endpoint is intentionally NOT in the middleware's public-POST-API
 * whitelist (middleware.ts is frozen for this task) — so it does its own
 * 4KB body cap, honeypot check, Zod validation, and rate limiting.
 */

const linkRequestSchema = z.object({
  email: emailSchema,
  website: z
    .string()
    .max(0, 'Honeypot must be empty')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export async function POST(request: NextRequest) {
  // Parse body with size cap (4 KB).
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot — silently succeed for bots. Same shape as the real success
  // response so the bot can't distinguish.
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      { ok: true, message: 'If this email is on our list, a link is on its way.' },
      { status: 200 }
    );
  }

  // Zod validation.
  const parsed = validateInput(linkRequestSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { email } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Rate limit — 3 per hour per email.
  const rl = checkRateLimit(`unsub-link:${normalizedEmail}`, {
    windowMs: 60 * 60 * 1000,
    max: 3,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // Secondary IP-based rate limit — 10 per hour per IP (prevents a single
  // attacker from enumerating many emails from one IP).
  const ip = getClientIp(request);
  const ipRl = checkRateLimit(`unsub-link-ip:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 10,
  });
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${ipRl.retryAfterSeconds}s.` },
      {
        status: 429,
        headers: { 'Retry-After': String(ipRl.retryAfterSeconds) },
      }
    );
  }

  try {
    // Look up the subscriber. If not found, return success WITHOUT sending
    // an email — this prevents email enumeration.
    const subscriber = await db.newsletter.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, optedOut: true },
    });

    if (!subscriber) {
      return NextResponse.json(
        { ok: true, message: 'If this email is on our list, a link is on its way.' },
        { status: 200 }
      );
    }

    // Issue a signed token valid for 30 days.
    const { token } = await createUnsubscribeToken(normalizedEmail);

    // Build the preference-center URL. Use NEXT_PUBLIC_SITE_URL with a
    // localhost fallback for dev.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV !== 'production'
        ? 'http://localhost:3000'
        : 'https://astrokalki.com');
    const linkUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(
      normalizedEmail
    )}&token=${encodeURIComponent(token)}`;

    // Send the email (falls back to console logging if SMTP not configured).
    const subject = 'Your AstroKalki email preferences link';
    const text = [
      'You requested a link to manage your AstroKalki email preferences.',
      '',
      'Open this link in your browser:',
      linkUrl,
      '',
      'The link is valid for 30 days. If you did not request this, you can',
      'safely ignore this email — no preferences have been changed.',
      '',
      '— AstroKalki',
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#070707;">
  <div style="background:#070707;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">Your preferences link.</h1>
    <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">
      You requested a link to manage which emails you receive from AstroKalki.
    </p>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;margin-top:24px;">
      Open the link below to choose your preferences — or unsubscribe from everything with one click.
    </p>
    <p style="margin:32px 0;">
      <a href="${linkUrl}" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;">Manage preferences →</a>
    </p>
    <p style="font-size:12px;color:#5a5a5a;font-weight:300;line-height:1.7;margin-top:32px;word-break:break-all;">
      Or copy this link: <span style="color:#7a7a7a;">${linkUrl}</span>
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/>
    <p style="font-size:12px;color:#5a5a5a;margin:0;font-weight:300;line-height:1.7;">
      The link is valid for 30 days. If you did not request this email, you can safely ignore it — no preferences have been changed.
    </p>
    <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
  </div>
</body>
</html>
`;

    await sendEmail({
      to: normalizedEmail,
      subject,
      text,
      html,
    });

    return NextResponse.json(
      { ok: true, message: 'If this email is on our list, a link is on its way.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/unsubscribe/link] Error:', error);
    return NextResponse.json(
      { error: 'Could not send the link. Please try again shortly.' },
      { status: 500 }
    );
  }
}
