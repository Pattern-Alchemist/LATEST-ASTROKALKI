/**
 * /api/admin/rooms
 *
 * GET  — Returns upcoming confirmed/completed bookings with Daily.co room status.
 * POST — Creates or regenerates a Daily.co room for a specific booking.
 *
 * Security: Admin-only (protected by middleware). Rate-limited at 30/hour per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDailyRoom } from "@/lib/daily";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security";

interface RoomBooking {
  id: string;
  name: string;
  email: string;
  duration: number;
  price: string;
  status: string;
  scheduledAt: string | null;
  roomName: string | null;
  roomUrl: string | null;
  createdAt: string;
}

/**
 * GET /api/admin/rooms
 *
 * Returns all bookings with status 'confirmed' or 'completed', sorted by
 * scheduledAt (soonest first), with Daily.co room info included.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin:rooms:${ip}`, RATE_LIMITS.api);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const bookings = await db.booking.findMany({
      where: {
        status: { in: ["confirmed", "completed"] },
      },
      orderBy: [
        { scheduledAt: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        duration: true,
        price: true,
        status: true,
        scheduledAt: true,
        roomName: true,
        roomUrl: true,
        createdAt: true,
      },
    });

    const rooms: RoomBooking[] = bookings.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      duration: b.duration,
      price: b.price,
      status: b.status,
      scheduledAt: b.scheduledAt?.toISOString() || null,
      roomName: b.roomName,
      roomUrl: b.roomUrl,
      createdAt: b.createdAt.toISOString(),
    }));

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("[Admin Rooms] Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rooms
 *
 * Body: { bookingId: string, action: "create" | "regenerate" }
 *
 * Creates (or regenerates) a Daily.co room for the given booking.
 * "regenerate" clears the existing roomUrl first to force a new room.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin:rooms:create:${ip}`, RATE_LIMITS.api);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 2 * 1024) throw new Error("Too large");
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const bookingId = body.bookingId as string | undefined;
  const action = (body.action as string) || "create";

  if (!bookingId) {
    return NextResponse.json(
      { error: "bookingId is required" },
      { status: 400 }
    );
  }

  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // For "regenerate", clear existing room data so ensureDailyRoom creates fresh
    if (action === "regenerate") {
      await db.booking.update({
        where: { id: bookingId },
        data: { roomName: null, roomUrl: null },
      });
    }

    const roomUrl = await ensureDailyRoom(bookingId, "[admin/rooms]");

    if (!roomUrl) {
      return NextResponse.json(
        { error: "Failed to create room. Check DAILY_API_KEY or server logs." },
        { status: 500 }
      );
    }

    const updated = await db.booking.findUnique({
      where: { id: bookingId },
      select: { roomName: true, roomUrl: true },
    });

    return NextResponse.json({
      success: true,
      roomUrl: updated?.roomUrl || roomUrl,
      roomName: updated?.roomName || null,
    });
  } catch (error) {
    console.error("[Admin Rooms] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
