/**
 * GET /api/portal/bundles/[id]
 *
 * Returns one bundle purchase summary and session usage state.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const bundle = await db.bundlePurchase.findUnique({
      where: { id },
      include: {
        bundleProduct: {
          select: { slug: true, title: true, description: true },
        },
        bookings: {
          select: {
            id: true,
            name: true,
            status: true,
            scheduledAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!bundle) {
      return NextResponse.json(
        { error: "Bundle purchase not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: bundle.id,
      email: bundle.email,
      bundle: bundle.bundleProduct,
      totalSessions: bundle.totalSessions,
      remainingSessions: bundle.remainingSessions,
      startsAt: bundle.startsAt?.toISOString() || null,
      expiresAt: bundle.expiresAt?.toISOString() || null,
      status: bundle.status,
      sessionsUsed: bundle.bookings.length,
      bookings: bundle.bookings,
    });
  } catch (err) {
    console.error("[PortalBundle] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bundle details" },
      { status: 500 }
    );
  }
}
