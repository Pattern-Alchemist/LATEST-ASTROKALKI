/**
 * GET /api/portal/bookings/[id]/notes — Fetch notes for a specific booking
 *
 * Used by the portal timeline view to show notes tied to a particular session.
 * Respects visibility rules: clients see shared+client notes, admins see all.
 *
 * Query params:
 *   - email: viewer email (required for client access verification)
 *   - token: signed portal access token (optional, production)
 *   - role: "admin" | "client" (default: "client")
 *   - includeDeleted: "true" to include soft-deleted notes (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPortalAccess } from "@/lib/portal/portal-access";
import { shapeNote } from "@/lib/portal/portal-dto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");
    const role = searchParams.get("role") || "client";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Verify portal access
    const access = verifyPortalAccess({ token, email, role });
    if (!access) {
      return NextResponse.json(
        { error: "Portal access denied" },
        { status: 403 }
      );
    }

    // Verify the booking exists and belongs to this viewer (for clients)
    const booking = await db.booking.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Clients can only access their own bookings
    if (
      access.role === "client" &&
      booking.email.toLowerCase() !== access.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Portal access denied" },
        { status: 403 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      bookingId: id,
    };

    // Soft delete filter — clients never see deleted notes, even if param is passed
    if (!includeDeleted || access.role !== "admin") {
      where.deletedAt = null;
    }

    // Visibility filtering
    if (access.role === "client") {
      where.visibility = { in: ["shared", "client"] };
    }
    // Admins see everything

    // Fetch notes
    const notes = await db.portalNote.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });

    // Shape notes through DTO (strips admin-only for client viewers)
    const shapedNotes = notes
      .map((note) => shapeNote(note, access.role))
      .filter(Boolean);

    return NextResponse.json({
      bookingId: id,
      notes: shapedNotes,
      count: shapedNotes.length,
    });
  } catch (err) {
    console.error("[PortalBookingNotes] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch booking notes" },
      { status: 500 }
    );
  }
}
