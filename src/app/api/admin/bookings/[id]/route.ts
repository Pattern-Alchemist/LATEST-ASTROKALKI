import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dispatchRecapEmail } from '@/lib/session-emails';
import { ensureDailyRoom } from '@/lib/daily';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, confirmed, completed, or cancelled' },
        { status: 400 }
      );
    }

    const existing = await db.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = await db.booking.update({
      where: { id },
      data: { status },
    });

    // ─── Create Daily.co room when admin marks as confirmed ───────
    // Only fires on the transition INTO "confirmed". Idempotent — if the
    // booking already has a roomUrl from the initial creation flow,
    // ensureDailyRoom returns the existing one without making an API call.
    // Non-blocking — failures are logged but never block the status update.
    if (status === 'confirmed' && existing.status !== 'confirmed') {
      ensureDailyRoom(id, "[admin/bookings]");
    }

    // ─── Trigger recap email when admin marks a session as completed ─
    // Only fire on the transition INTO "completed" — not on every PATCH.
    // The dispatch helper is idempotent (SessionRecap row + recapSentAt
    // guard re-sends), so even a repeat PATCH won't double-send.
    //
    // Non-blocking — failures are logged but never block the status update.
    // The recap endpoint at /api/session-emails/recap can be called
    // manually to re-send if this ever fails silently.
    if (status === 'completed' && existing.status !== 'completed') {
      dispatchRecapEmail(id).catch((err) => {
        console.error(
          `[admin/bookings] recap email dispatch failed for ${id}:`,
          err
        );
      });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Booking update error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    await db.booking.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Booking delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}
