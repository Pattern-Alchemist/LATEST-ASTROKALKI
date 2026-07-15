/**
 * POST /api/admin/bookings/[id]/resend-email
 *
 * Resends the booking confirmation email to the client.
 * Admin-only action for recovery scenarios.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/email/booking-confirmation";
import { logBookingEvent } from "@/lib/bookings/events";
import { BOOKING_EVENTS, EVENT_SOURCES } from "@/lib/bookings/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const booking = await db.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "confirmed" && booking.status !== "completed") {
      return NextResponse.json(
        { error: "Can only resend email for confirmed or completed bookings" },
        { status: 400 }
      );
    }

    const result = await sendBookingConfirmation({
      id: booking.id,
      name: booking.name,
      email: booking.email,
      duration: booking.duration,
      price: booking.price,
      scheduledAt: booking.scheduledAt,
      roomUrl: booking.roomUrl || undefined,
    });

    await logBookingEvent({
      bookingId: booking.id,
      type: BOOKING_EVENTS.CONFIRMATION_EMAIL_SENT,
      source: EVENT_SOURCES.ADMIN_UI,
      payload: { resent: true, delivered: result.delivered, messageId: result.messageId },
    });

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error("[AdminResendEmail] Error:", err);
    return NextResponse.json(
      { error: "Failed to resend email" },
      { status: 500 }
    );
  }
}
