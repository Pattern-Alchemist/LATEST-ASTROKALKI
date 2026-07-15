import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. Fetch all micro-readings (for emotionalPattern + relationshipFrustration analysis)
    const microReadings = await db.microReading.findMany({
      select: { emotionalPattern: true, relationshipFrustration: true, createdAt: true },
    });

    // 2. Fetch all bookings (for contexts analysis + service/duration analysis)
    const bookings = await db.booking.findMany({
      select: { contexts: true, duration: true, price: true, status: true, createdAt: true },
    });

    // 3. Aggregate: count by emotionalPattern
    const patternCounts: Record<string, number> = {};
    microReadings.forEach((r) => {
      patternCounts[r.emotionalPattern] = (patternCounts[r.emotionalPattern] || 0) + 1;
    });

    // 4. Aggregate: count by relationshipFrustration
    const frustrationCounts: Record<string, number> = {};
    microReadings.forEach((r) => {
      frustrationCounts[r.relationshipFrustration] =
        (frustrationCounts[r.relationshipFrustration] || 0) + 1;
    });

    // 5. Aggregate: count by booking contexts (contexts is a JSON-stringified array)
    const contextCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      try {
        const ctxs = JSON.parse(b.contexts) as string[];
        if (Array.isArray(ctxs)) {
          ctxs.forEach((c) => {
            contextCounts[c] = (contextCounts[c] || 0) + 1;
          });
        }
      } catch {
        /* malformed contexts JSON — skip this row */
      }
    });

    // 6. Aggregate: count by booking duration (30/60/90 — proxy for service tier)
    const durationCounts: Record<number, number> = {};
    bookings.forEach((b) => {
      durationCounts[b.duration] = (durationCounts[b.duration] || 0) + 1;
    });

    // 7. Compute total samples + recent (last 30 days) samples
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMicroReadings = microReadings.filter((r) => r.createdAt >= thirtyDaysAgo).length;
    const recentBookings = bookings.filter((b) => b.createdAt >= thirtyDaysAgo).length;

    // 8. Sort each aggregate by count descending and return as arrays of {label, count}
    const sortByCount = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totals: {
        microReadings: microReadings.length,
        bookings: bookings.length,
        recentMicroReadings,
        recentBookings,
      },
      emotionalPatterns: sortByCount(patternCounts),
      relationshipFrustrations: sortByCount(frustrationCounts),
      bookingContexts: sortByCount(contextCounts),
      bookingDurations: sortByCount(durationCounts as Record<string, number>),
    });
  } catch (error) {
    console.error('Admin patterns error:', error);
    return NextResponse.json({ error: 'Failed to fetch pattern data' }, { status: 500 });
  }
}
