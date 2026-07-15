import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logBookingEvent } from '@/lib/bookings/events';
import { BOOKING_EVENTS, EVENT_SOURCES } from '@/lib/bookings/constants';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { reason?: string; notifyCustomer?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  try {
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });

    await db.$transaction(async (tx) => {
      // Free the slot if one was assigned
      if (booking.slotId) {
        await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: 'open', bookingId: null } });
      }
      await tx.booking.update({ where: { id }, data: { status: 'cancelled', cancelledAt: new Date(), cancelledReason: body.reason || null } });
    });

    await logBookingEvent({ bookingId: id, type: BOOKING_EVENTS.CANCELLED, source: EVENT_SOURCES.ADMIN_UI, payload: { reason: body.reason, notifyCustomer: body.notifyCustomer } });

    return NextResponse.json({ success: true, bookingId: id, status: 'cancelled' });
  } catch (err) { console.error(`[Cancel] Error:`, err); return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 }); }
}
