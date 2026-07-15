import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/cal/webhook
 *
 * Receives webhook events from Cal.com when bookings are created,
 * rescheduled, or cancelled. Syncs booking data into the local
 * AvailabilitySlot and Booking tables for analytics and record-keeping.
 *
 * Cal.com webhook docs: https://cal.com/docs/developing/webhooks
 *
 * Expected headers:
 *   - X-Cal-Signature-256: HMAC-SHA256 signature for verification
 *
 * Body (BOOKING_CREATED / BOOKING_RESCHEDULED):
 *   { triggerEvent, payload: { uid, title, startTime, endTime, ... } }
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Verify webhook signature (optional but recommended) ──────
    const signature = request.headers.get('x-cal-signature-256');
    const webhookSecret = process.env.CAL_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const body = await request.clone().text();
      const crypto = await import('crypto');
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSig) {
        console.warn('[Cal Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { triggerEvent, payload } = body;

    console.log('[Cal Webhook] Received event:', triggerEvent, {
      uid: payload?.uid,
      title: payload?.title,
    });

    if (!payload?.uid) {
      return NextResponse.json({ error: 'Missing payload.uid' }, { status: 400 });
    }

    // ─── Handle different event types ─────────────────────────────
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
      case 'BOOKING_RESCHEDULED': {
        const startTime = new Date(payload.startTime);
        const endTime = new Date(payload.endTime);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        // Create or update an AvailabilitySlot record for tracking
        await db.availabilitySlot.upsert({
          where: { id: payload.uid },
          create: {
            id: payload.uid,
            start: startTime,
            end: endTime,
            duration: durationMinutes,
            status: 'booked',
          },
          update: {
            start: startTime,
            end: endTime,
            duration: durationMinutes,
            status: 'booked',
          },
        });

        // Also create a Booking record if we have attendee info
        const attendee = payload.attendees?.[0];
        if (attendee?.email) {
          await db.booking.upsert({
            where: { id: `cal-${payload.uid}` },
            create: {
              id: `cal-${payload.uid}`,
              name: attendee.name || 'Cal.com Booking',
              email: attendee.email,
              phone: attendee.phone || null,
              duration: durationMinutes,
              price: payload.price ? String(payload.price) : "0",
              contexts: '["cal-com-booking"]',
              status: 'confirmed',
              scheduledAt: startTime,
              slotId: payload.uid,
            },
            update: {
              name: attendee.name || 'Cal.com Booking',
              email: attendee.email,
              phone: attendee.phone || null,
              duration: durationMinutes,
              status: 'confirmed',
              scheduledAt: startTime,
            },
          });
        }

        console.log(`[Cal Webhook] Booking ${triggerEvent === 'BOOKING_CREATED' ? 'created' : 'rescheduled'}: ${payload.uid}`);
        break;
      }

      case 'BOOKING_CANCELLED': {
        // Mark the slot as open again
        await db.availabilitySlot.update({
          where: { id: payload.uid },
          data: { status: 'open', bookingId: null },
        }).catch(() => {
          // Slot might not exist in our DB — that's fine
        });

        // Update booking status
        await db.booking.update({
          where: { id: `cal-${payload.uid}` },
          data: { status: 'cancelled' },
        }).catch(() => {
          // Booking might not exist — that's fine
        });

        console.log(`[Cal Webhook] Booking cancelled: ${payload.uid}`);
        break;
      }

      default:
        console.log(`[Cal Webhook] Unhandled event type: ${triggerEvent}`);
    }

    return NextResponse.json({ received: true, event: triggerEvent });
  } catch (error) {
    console.error('[Cal Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Allow Cal.com to verify the webhook endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'cal-webhook' });
}