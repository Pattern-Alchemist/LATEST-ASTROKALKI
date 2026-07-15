import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { logBookingEvent } from '@/lib/bookings/events';
import { BOOKING_EVENTS, EVENT_SOURCES } from '@/lib/bookings/constants';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  let body: { bookingId: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

  try {
    const booking = await db.booking.findUnique({ where: { id: body.bookingId } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (!booking.paymentIntentId) return NextResponse.json({ error: 'No payment to refund' }, { status: 400 });
    if (booking.status === 'refunded') return NextResponse.json({ error: 'Already refunded' }, { status: 400 });

    await logBookingEvent({ bookingId: body.bookingId, type: BOOKING_EVENTS.REFUND_REQUESTED, source: EVENT_SOURCES.ADMIN_UI, payload: { reason: body.reason } });

    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      reason: body.reason === 'requested_by_customer' ? 'requested_by_customer' : 'duplicate',
    });

    await db.booking.update({
      where: { id: body.bookingId },
      data: { status: 'refunded', refundedAt: new Date(), refundId: refund.id },
    });

    // Free slot if assigned
    if (booking.slotId) {
      await db.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: 'open', bookingId: null } });
    }

    await logBookingEvent({ bookingId: body.bookingId, type: BOOKING_EVENTS.REFUNDED, source: EVENT_SOURCES.ADMIN_UI, payload: { refundId: refund.id, amount: refund.amount } });

    return NextResponse.json({ success: true, refundId: refund.id, bookingId: body.bookingId, status: 'refunded' });
  } catch (err) { console.error('[Refund] Error:', err); return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 }); }
}
