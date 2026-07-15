/**
 * GET /api/admin/funnel-metrics
 *
 * Returns funnel conversion metrics from AnalyticsEvent:
 *   - Event counts by type
 *   - Conversion rates between stages
 *   - Payment method split (Stripe vs WhatsApp)
 *   - Revenue by duration tier
 *   - Drop-off counts per booking step
 *
 * Query params:
 *   - from / to  ISO date strings for date-range filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const hasDateFilter = from || to;

    // Build Prisma-compatible date filter
    const dateFilter: Prisma.DateTimeFilter | undefined =
      from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

    // ─── Event counts by type ────────────────────────────────────
    const eventWhere: Prisma.AnalyticsEventWhereInput = dateFilter
      ? { timestamp: dateFilter }
      : {};

    const eventTypeRows = await db.analyticsEvent.groupBy({
      by: ["event"],
      where: eventWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const eventCounts: Record<string, number> = {};
    for (const row of eventTypeRows) {
      eventCounts[row.event] = row._count.id;
    }

    // ─── Conversion rates between funnel stages ──────────────────
    const bookingStarted = eventCounts["booking_started"] || 0;
    const paymentIntentCreated = eventCounts["payment_intent_created"] || 0;
    const paymentCompleted = eventCounts["payment_completed"] || 0;
    const bookingConfirmed = eventCounts["booking_confirmed"] || eventCounts["booking_paid"] || 0;
    const sessionCompleted = eventCounts["session_completed"] || 0;

    const conversionRates = {
      started_to_payment:
        bookingStarted > 0
          ? ((paymentIntentCreated / bookingStarted) * 100).toFixed(1) + "%"
          : "—",
      payment_to_confirmed:
        paymentCompleted > 0
          ? ((bookingConfirmed / paymentCompleted) * 100).toFixed(1) + "%"
          : "—",
      confirmed_to_completed:
        bookingConfirmed > 0
          ? ((sessionCompleted / bookingConfirmed) * 100).toFixed(1) + "%"
          : "—",
      overall:
        bookingStarted > 0
          ? ((bookingConfirmed / bookingStarted) * 100).toFixed(1) + "%"
          : "—",
    };

    // ─── Payment method split ────────────────────────────────────
    const bookingWhereBase: Prisma.BookingWhereInput = dateFilter
      ? { createdAt: dateFilter }
      : {};

    const whatsappBookings = await db.booking.count({
      where: { paymentIntentId: null, ...bookingWhereBase },
    });
    const stripeBookings = await db.booking.count({
      where: { paymentIntentId: { not: null }, ...bookingWhereBase },
    });

    // ─── Revenue by duration tier ────────────────────────────────
    const revenueBookings = await db.booking.findMany({
      where: { status: { in: ["confirmed", "completed"] }, ...bookingWhereBase },
      select: { duration: true, price: true },
    });

    const revenueByDuration: Record<number, { count: number; revenue: number }> = {};
    for (const b of revenueBookings) {
      const tier = b.duration;
      if (!revenueByDuration[tier]) revenueByDuration[tier] = { count: 0, revenue: 0 };
      revenueByDuration[tier].count += 1;
      const num = parseFloat(b.price.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) revenueByDuration[tier].revenue += num;
    }

    // ─── Total bookings by status ────────────────────────────────
    const totalBookings = await db.booking.count({ where: bookingWhereBase });
    const confirmedBookings = await db.booking.count({
      where: { status: "confirmed", ...bookingWhereBase },
    });
    const completedBookings = await db.booking.count({
      where: { status: "completed", ...bookingWhereBase },
    });
    const cancelledBookings = await db.booking.count({
      where: { status: "cancelled", ...bookingWhereBase },
    });

    return NextResponse.json({
      eventCounts,
      funnel: {
        bookingStarted,
        paymentIntentCreated,
        paymentCompleted,
        bookingConfirmed,
        sessionCompleted,
      },
      conversionRates,
      paymentSplit: {
        stripe: stripeBookings,
        whatsapp: whatsappBookings,
      },
      revenueByDuration,
      bookingStatus: {
        total: totalBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
    });
  } catch (err) {
    console.error("[AdminFunnelMetrics] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch funnel metrics" },
      { status: 500 }
    );
  }
}
