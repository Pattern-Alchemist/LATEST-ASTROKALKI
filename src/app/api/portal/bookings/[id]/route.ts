/**
 * GET /api/portal/bookings/[id]
 *
 * Returns one portal-safe booking detail payload.
 * Requires email-based access verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPortalAccess } from "@/lib/portal/portal-access";
import { shapeBooking } from "@/lib/portal/portal-dto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");
    const role = searchParams.get("role");

    const access = verifyPortalAccess({ token, email, role });
    if (!access) {
      return NextResponse.json(
        { error: "Portal access denied" },
        { status: 403 }
      );
    }

    const booking = await db.booking.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        duration: true,
        price: true,
        status: true,
        scheduledAt: true,
        roomUrl: true,
        roomName: true,
        createdAt: true,
        contexts: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        message: true,
        bundlePurchaseId: true,
        clientNotesJson: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Clients can only see their own bookings
    if (access.role === "client" && booking.email.toLowerCase() !== access.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Portal access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      booking: shapeBooking(booking),
      details: {
        contexts: booking.contexts,
        birthDate: booking.birthDate,
        birthTime: booking.birthTime,
        birthPlace: booking.birthPlace,
        message: booking.message,
        bundlePurchaseId: booking.bundlePurchaseId,
        clientNotesJson: booking.clientNotesJson,
        roomName: booking.roomName,
      },
    });
  } catch (err) {
    console.error("[PortalBooking] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
