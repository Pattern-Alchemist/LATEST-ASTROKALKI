import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, notifyAdmin } from '@/lib/email';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  bookingInputSchema,
  isHoneypotTriggered,
  honeypotSuccessResponse,
} from '@/lib/security';
import { dispatchPrepEmail } from '@/lib/session-emails';
import { ensureDailyRoom } from '@/lib/daily';

export async function POST(request: NextRequest) {
  // Rate limit — 3 bookings per IP per hour
  const ip = getClientIp(request);
  const rl = checkRateLimit(`bk:${ip}`, RATE_LIMITS.bookings);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many booking attempts. Retry in ${rl.retryAfterSeconds}s.` },
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
      honeypotSuccessResponse('bookings'),
      { status: 201 }
    );
  }

  // Validate
  const parsed = validateInput(bookingInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const {
    name,
    email,
    phone,
    duration,
    price,
    contexts,
    birthDate,
    birthTime,
    birthPlace,
    message,
    referredBy,
  } = parsed.data;

  try {
    const booking = await db.booking.create({
      data: {
        name,
        email,
        phone: phone || null,
        duration: Number(duration),
        price,
        contexts: JSON.stringify(contexts || []),
        birthDate: birthDate || null,
        birthTime: birthTime || null,
        birthPlace: birthPlace || null,
        message: message || null,
        referredBy: referredBy || null,
        status: 'pending',
      },
    });

    // Send confirmation email to the user + full-intake notification to admin.
    // Non-blocking — failures are logged but never break the booking creation.
    const contextsList = Array.isArray(contexts)
      ? contexts.map((c: string) => `  • ${c}`).join('\n')
      : String(contexts || '');

    const userDetails = [
      `Name:          ${name}`,
      `Email:         ${email}`,
      phone ? `Phone:         ${phone}` : null,
      `Duration:      ${duration} minutes`,
      `Investment:    ${price}`,
      birthDate ? `Birth date:    ${birthDate}` : null,
      birthTime ? `Birth time:    ${birthTime}` : null,
      birthPlace ? `Birth place:   ${birthPlace}` : null,
      contexts ? `Focus areas:\n${contextsList}` : null,
      message ? `Message:\n  ${message}` : null,
      referredBy ? `Referred by:   ${referredBy}` : null,
    ].filter(Boolean).join('\n');

    await Promise.allSettled([
      sendEmail({
        to: email,
        subject: 'Your booking is in. Next step: WhatsApp.',
        text: [
          `${name},`,
          ``,
          `Your booking request has been received.`,
          ``,
          `Session: ${duration} minutes  /  ${price}`,
          ``,
          `To confirm the time and complete the intake, finish the conversation on WhatsApp — the button you tapped already opened it with your details pre-filled.`,
          ``,
          `If WhatsApp didn't open, message us directly and mention this email so we can match it.`,
          ``,
          `— — —`,
          ``,
          `Your intake:`,
          userDetails,
          ``,
          `— — —`,
          ``,
          `We respect your inbox. You will only hear from us about this booking.`,
          ``,
          `— AstroKalki`,
        ].join('\n'),
        html: `
          <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
            <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
            <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">${name},</h1>
            <p style="font-size:15px;line-height:1.8;color:#9a9a9a;font-weight:300;">
              Your booking request has been received.
            </p>
            <p style="font-size:15px;line-height:1.8;color:#cfcabf;font-weight:300;margin-top:24px;">
              Session: <strong style="color:#a58a54;">${duration} minutes</strong>  /  ${price}
            </p>
            <p style="font-size:15px;line-height:1.8;color:#9a9a9a;font-weight:300;margin-top:24px;">
              To confirm the time and complete the intake, finish the conversation on WhatsApp — the button you tapped already opened it with your details pre-filled. If WhatsApp didn't open, message us directly and mention this email so we can match it.
            </p>
            <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0;"/>
            <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a7a7a;margin:0 0 12px;">Your intake</p>
            <pre style="font-family:Georgia,serif;font-size:13px;line-height:1.8;color:#9a9a9a;font-weight:300;white-space:pre-wrap;margin:0;">${userDetails}</pre>
            <p style="font-size:12px;color:#5a5a5a;margin-top:40px;font-weight:300;">We respect your inbox. You will only hear from us about this booking.</p>
            <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
          </div>
        `,
      }),
      notifyAdmin({
        subject: `[AstroKalki] New booking — ${name} · ${duration}min · ${price}`,
        text: [
          `New booking received.`,
          ``,
          userDetails,
          ``,
          `Booking ID: ${booking.id}`,
          `Created: ${booking.createdAt.toISOString()}`,
          `Status: ${booking.status}`,
        ].join('\n'),
        html: `
          <p>New booking received.</p>
          <pre style="font-family:monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;">${userDetails}</pre>
          <p style="margin-top:24px;color:#666;">
            Booking ID: ${booking.id}<br/>
            Created: ${booking.createdAt.toISOString()}<br/>
            Status: ${booking.status}
          </p>
        `,
      }),
      // ─── Pre-session prep email ───────────────────────────────────
      // Non-blocking + idempotent (SessionRecap row created on first
      // dispatch; re-calls no-op). Failures are logged but never break
      // booking creation. The cron at /api/cron/session-emails is the
      // safety net for any bookings whose initial dispatch failed.
      dispatchPrepEmail(booking.id).catch((err) => {
        console.error(
          `[bookings] prep email dispatch failed for ${booking.id}:`,
          err
        );
      }),
    ]);

    // ─── Create Daily.co meeting room (non-blocking) ───────────────
    ensureDailyRoom(booking.id, "[bookings]");

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Booking list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
