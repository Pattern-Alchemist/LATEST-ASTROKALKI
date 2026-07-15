import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Admin bookings list + search API.
 *
 *   GET /api/admin/bookings?search=<query>&limit=20
 *
 * Used by the recording manager's booking picker (Combobox). Returns the
 * most recent bookings whose name OR email contains the search term
 * (case-insensitive), ordered by createdAt desc. Capped at 50 results.
 *
 * Auth-gated by middleware.
 *
 * We deliberately keep this endpoint narrow: only the fields the picker
 * needs (id, name, email, duration, price, status, scheduledAt, createdAt).
 * No phone numbers, no birth data — those stay on the booking detail page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    );

    // Build the WHERE clause. SQLite's contains() is case-insensitive but
    // only works on the same field; we OR across name and email so admins
    // can search either.
    const where =
      search.length === 0
        ? {}
        : {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          };

    const bookings = await db.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        duration: true,
        price: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Admin bookings search error:', error);
    return NextResponse.json(
      { error: 'Failed to search bookings' },
      { status: 500 }
    );
  }
}
