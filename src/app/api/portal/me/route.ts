/**
 * GET /api/portal/me
 *
 * Returns portal identity, current bookings, bundles, and lightweight summary data.
 * Requires email-based access (signed link or verified session).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch bookings
    const bookings = await db.booking.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        duration: true,
        price: true,
        status: true,
        scheduledAt: true,
        roomUrl: true,
        createdAt: true,
      },
    });

    // Fetch active bundles
    const bundles = await db.bundlePurchase.findMany({
      where: {
        email,
        status: "paid",
        remainingSessions: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalSessions: true,
        remainingSessions: true,
        expiresAt: true,
        bundleProduct: {
          select: { slug: true, title: true },
        },
      },
    });

    // Fetch Stripe customer ID for portal billing
    const latestBundle = await db.bundlePurchase.findFirst({
      where: { email, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { stripeCustomerId: true },
    });

    // Summary counts
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(
      (b) => b.status === "completed"
    ).length;
    const activeBundles = bundles.length;

    return NextResponse.json({
      email,
      summary: {
        totalBookings,
        completedBookings,
        activeBundles,
      },
      bookings,
      bundles,
      stripeCustomerId: latestBundle?.stripeCustomerId || null,
    });
  } catch (err) {
    console.error("[PortalMe] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch portal data" },
      { status: 500 }
    );
  }
}
