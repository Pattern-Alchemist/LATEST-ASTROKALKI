import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, notifyAdmin } from '@/lib/email';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  newsletterInputSchema,
  isHoneypotTriggered,
  honeypotSuccessResponse,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  // Rate limit — 5 subscribes per IP per 10 min
  const ip = getClientIp(request);
  const rl = checkRateLimit(`nl:${ip}`, RATE_LIMITS.newsletter);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap (4 KB)
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

  // Honeypot — silently succeed for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      honeypotSuccessResponse('newsletter'),
      { status: 200 }
    );
  }

  // Validate
  const parsed = validateInput(newsletterInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { email, source } = parsed.data;

  try {
    const existing = await db.newsletter.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Already subscribed', subscribed: true },
        { status: 200 }
      );
    }

    await db.newsletter.create({
      data: {
        email,
        source: source || 'website',
        dripStage: 0,
        lastDripAt: new Date(),
      },
    });
    // The cron (/api/email/process-drips) will send Day +2 (stage 1)
    // 48 hours after this timestamp.

    // Welcome email — non-blocking. Failures are logged but never break the
    // subscription flow.
    await Promise.allSettled([
      sendEmail({
        to: email,
        subject: 'You are in. The first pattern lands soon.',
        text: [
          'You are in.',
          '',
          'No horoscopes. No mystical fluff.',
          'Just one short observation about the pattern beneath your choices —',
          'arriving in your inbox when something true is ready to be said.',
          '',
          'We respect your inbox. Unsubscribe anytime.',
          '',
          '— AstroKalki',
        ].join('\n'),
        html: `
          <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
            <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
            <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">You are in.</h1>
            <p style="font-size:15px;line-height:1.8;color:#9a9a9a;font-weight:300;">
              No horoscopes. No mystical fluff.<br/>
              Just one short observation about the pattern beneath your choices — arriving in your inbox when something true is ready to be said.
            </p>
            <p style="font-size:12px;color:#5a5a5a;margin-top:32px;font-weight:300;">We respect your inbox. Unsubscribe anytime.</p>
            <p style="font-size:13px;color:#a58a54;margin-top:24px;font-style:italic;">— AstroKalki</p>
          </div>
        `,
      }),
      notifyAdmin({
        subject: `[AstroKalki] New newsletter subscriber`,
        text: `New subscriber: ${email}\nSource: ${source || 'website'}`,
        html: `<p>New subscriber: <strong>${email}</strong></p><p>Source: ${source || 'website'}</p>`,
      }),
    ]);

    return NextResponse.json(
      { message: 'Subscribed successfully', subscribed: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
