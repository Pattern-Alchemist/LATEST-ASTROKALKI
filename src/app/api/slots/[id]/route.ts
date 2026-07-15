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

/**
 * /api/slots/[id]
 *
 * GET  — Public. Returns a single slot's details (for preview before booking).
 * POST — Public. Books the slot. Accepts the full booking intake payload
 *        (the same shape /api/bookings expects) and atomically:
 *          1. Verifies the slot exists, is 'open', and its duration matches.
 *          2. Creates the Booking with status='pending', scheduledAt=slot.start,
 *             slotId=slot.id.
 *          3. Marks the slot as 'booked' and links bookingId.
 *        Sends confirmation emails to the user + admin (same shape as
 *        /api/bookings). Falls back gracefully if SMTP isn't configured.
 *
 *        Rate-limited at 3 bookings per IP per hour (same preset as
 *        /api/bookings). Body capped at 4KB by middleware. Honeypot field
 *        `website` silently succeeds for bots.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slot = await db.availabilitySlot.findUnique({
      where: { id },
      select: {
        id: true,
        start: true,
        end: true,
        duration: true,
        status: true,
        bookingId: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error('Slot fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slot' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ─── Rate limit (3/hour/IP) ──────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`slots:book:${ip}`, RATE_LIMITS.bookings);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many booking attempts. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── Parse body (4 KB hard cap) ──────────────────────────────────
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

  // ─── Honeypot — silently succeed for bots ────────────────────────
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      honeypotSuccessResponse('bookings'),
      { status: 201 }
    );
  }

  // ─── Validate intake payload (reuses the central booking schema) ─
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

  const { id: slotId } = await params;

  try {
    // ─── Atomic slot reservation ──────────────────────────────────
    // We use a transaction so the slot can never be double-booked: if
    // the booking creation fails, the slot remains open.
    const result = await db.$transaction(async (tx) => {
      // Lock-style read: find the slot and verify it's bookable.
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw new Error('SLOT_NOT_FOUND');
      }
      if (slot.status !== 'open') {
        throw new Error('SLOT_NOT_OPEN');
      }
      if (slot.duration !== Number(duration)) {
        throw new Error('SLOT_DURATION_MISMATCH');
      }
      // Refuse to book a slot that has already started.
      if (slot.start.getTime() <= Date.now()) {
        throw new Error('SLOT_IN_PAST');
      }

      // Create the booking linked to this slot.
      const booking = await tx.booking.create({
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
          scheduledAt: slot.start,
          slotId: slot.id,
        },
      });

      // Mark slot as booked and link back.
      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: {
          status: 'booked',
          bookingId: booking.id,
        },
      });

      return { booking, slot };
    });

    const { booking, slot } = result;

    // ─── Confirmation emails (non-blocking) ───────────────────────
    const contextsList = Array.isArray(contexts)
      ? contexts.map((c: string) => `  • ${c}`).join('\n')
      : String(contexts || '');

    const sessionTime = slot.start.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    const userDetails = [
      `Name:          ${name}`,
      `Email:         ${email}`,
      phone ? `Phone:         ${phone}` : null,
      `Duration:      ${duration} minutes`,
      `Investment:    ${price}`,
      `Scheduled:     ${sessionTime} (IST)`,
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
        subject: 'Your session is booked.',
        text: [
          `${name},`,
          ``,
          `Your session is confirmed.`,
          ``,
          `Session: ${duration} minutes  /  ${price}`,
          `When:    ${sessionTime} (IST)`,
          ``,
          `A reminder will arrive closer to the time. If you need to reschedule, just reply to this email.`,
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
              Your session is confirmed.
            </p>
            <p style="font-size:15px;line-height:1.8;color:#cfcabf;font-weight:300;margin-top:24px;">
              Session: <strong style="color:#a58a54;">${duration} minutes</strong>  /  ${price}
            </p>
            <p style="font-size:15px;line-height:1.8;color:#cfcabf;font-weight:300;margin-top:12px;">
              When: <strong style="color:#a58a54;">${sessionTime}</strong> (IST)
            </p>
            <p style="font-size:15px;line-height:1.8;color:#9a9a9a;font-weight:300;margin-top:24px;">
              A reminder will arrive closer to the time. If you need to reschedule, just reply to this email.
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
        subject: `[AstroKalki] New booking — ${name} · ${duration}min · ${sessionTime}`,
        text: [
          `New booking received (self-serve slot).`,
          ``,
          userDetails,
          ``,
          `Booking ID: ${booking.id}`,
          `Slot ID:    ${slot.id}`,
          `Created:    ${booking.createdAt.toISOString()}`,
          `Status:     ${booking.status}`,
        ].join('\n'),
        html: `
          <p>New booking received (self-serve slot).</p>
          <pre style="font-family:monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;">${userDetails}</pre>
          <p style="margin-top:24px;color:#666;">
            Booking ID: ${booking.id}<br/>
            Slot ID: ${slot.id}<br/>
            Created: ${booking.createdAt.toISOString()}<br/>
            Status: ${booking.status}
          </p>
        `,
      }),
      // ─── Pre-session prep email ───────────────────────────────────
      // Non-blocking + idempotent. For slot-booked sessions the
      // scheduledAt is already set (slot.start), so the prep email
      // includes the exact date/time. Failures are logged but never
      // break booking creation.
      dispatchPrepEmail(booking.id).catch((err) => {
        console.error(
          `[slots] prep email dispatch failed for ${booking.id}:`,
          err
        );
      }),
    ]);

    // ─── Create Daily.co meeting room (non-blocking) ───────────────
    ensureDailyRoom(booking.id, "[slots]");

    return NextResponse.json({ booking, slot }, { status: 201 });
  } catch (error: unknown) {
    // Surface friendly errors for the known slot-state failures.
    const code = error instanceof Error ? error.message : '';
    if (code === 'SLOT_NOT_FOUND') {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }
    if (code === 'SLOT_NOT_OPEN') {
      return NextResponse.json(
        { error: 'This slot was just taken. Please pick another.' },
        { status: 409 }
      );
    }
    if (code === 'SLOT_DURATION_MISMATCH') {
      return NextResponse.json(
        { error: 'Slot duration does not match the selected session.' },
        { status: 400 }
      );
    }
    if (code === 'SLOT_IN_PAST') {
      return NextResponse.json(
        { error: 'This slot has already passed.' },
        { status: 400 }
      );
    }
    console.error('Slot booking error:', error);
    return NextResponse.json(
      { error: 'Failed to book slot' },
      { status: 500 }
    );
  }
}
