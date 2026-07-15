/**
 * POST /api/video/create-room
 *
 * Creates a Daily.co room for a confirmed booking.
 * Called automatically after booking confirmation, or manually from admin panel.
 *
 * Body: { bookingId: string, email?: string, name?: string }
 *
 * Security: This endpoint requires a valid booking ID to exist.
 *           Rate-limited at 30/hour per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDailyRoom, isDailyConfigured, getMeetingUrl } from "@/lib/daily";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security";

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(`video:room:${ip}`, RATE_LIMITS.api);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 2 * 1024) {
      return NextResponse.json({ error: "Body too large" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const bookingId = body.bookingId as string | undefined;

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  try {
    // Verify the booking exists
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, name: true, email: true, roomUrl: true, roomName: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // If a room already exists, return it
    if (booking.roomUrl) {
      return NextResponse.json({
        roomUrl: booking.roomUrl,
        roomName: booking.roomName,
      });
    }

    // Create the Daily.co room
    if (isDailyConfigured()) {
      const room = await createDailyRoom({
        name: `session-${booking.id.slice(0, 8)}`,
        maxParticipants: 2,
        enableChat: true,
        enablePrejoinUI: true,
        expiryMinutes: 48 * 60, // 48 hours — covers the session + buffer
      });

      // Store the room URL on the booking
      await db.booking.update({
        where: { id: booking.id },
        data: {
          roomName: room.name,
          roomUrl: room.url,
        },
      });

      return NextResponse.json({
        roomUrl: room.url,
        roomName: room.name,
      });
    }

    // Fallback: generate a URL without creating an actual room
    // (useful for dev when DAILY_API_KEY is not configured)
    const fallbackUrl = getMeetingUrl(booking.id);

    await db.booking.update({
      where: { id: booking.id },
      data: {
        roomName: `session-${booking.id.slice(0, 8)}`,
        roomUrl: fallbackUrl,
      },
    });

    return NextResponse.json({
      roomUrl: fallbackUrl,
      roomName: `session-${booking.id.slice(0, 8)}`,
      note: "Daily.co not configured — this is a placeholder URL. Set DAILY_API_KEY to create real rooms.",
    });
  } catch (error) {
    console.error("[Video] Room creation error:", error);
    return NextResponse.json(
      { error: "Failed to create video room" },
      { status: 500 }
    );
  }
}
