import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logBookingEvent } from '@/lib/bookings/events';
import { BOOKING_EVENTS, EVENT_SOURCES } from '@/lib/bookings/constants';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { newSlotId: string; note?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.newSlotId) return NextResponse.json({ error: 'newSlotId is required' }, { status: 400 });

  try {
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'Cannot reschedule a cancelled booking' }, { status: 400 });

    const newSlot = await db.availabilitySlot.findUnique({ where: { id: body.newSlotId } });
    if (!newSlot) return NextResponse.json({ error: 'New slot not found' }, { status: 404 });
    if (newSlot.status !== 'open') return NextResponse.json({ error: 'New slot is not available' }, { status: 409 });

    const result = await db.$transaction(async (tx) => {
      // Free old slot if one was assigned
      if (booking.slotId) {
        await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: 'open', bookingId: null } });
      }
      // Assign new slot
      await tx.availabilitySlot.update({ where: { id: body.newSlotId }, data: { status: 'booked', bookingId: id } });
      // Update booking
      return tx.booking.update({
        where: { id },
        data: { scheduledAt: newSlot.start, slotId: body.newSlotId, rescheduledAt: new Date(), rescheduledFromId: booking.slotId || booking.scheduledAt?.toISOString() || null },
      });
    });

    await logBookingEvent({ bookingId: id, type: BOOKING_EVENTS.RESCHEDULED, source: EVENT_SOURCES.ADMIN_UI, payload: { oldSlotId: booking.slotId, newSlotId: body.newSlotId, note: body.note } });

    return NextResponse.json({ success: true, booking: { id: result.id, status: result.status, scheduledAt: result.scheduledAt?.toISOString(), slotId: result.slotId } });
  } catch (err) { console.error(`[Reschedule] Error:`, err); return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 }); }
}
