import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Admin recordings API.
 *
 * Auth-gated by middleware (see /src/middleware.ts: any /api/admin/* path
 * requires a valid admin session cookie). The handlers below can assume the
 * caller is an authenticated admin.
 *
 *   GET  /api/admin/recordings
 *        Optional: ?bookingId=<id>  — filter to recordings attached to a booking
 *        Optional: ?page=1&limit=50 — pagination (capped at 100)
 *        Returns recordings with the related booking (name + email).
 *
 *   POST /api/admin/recordings
 *        Body: { title, duration, price, bookingId?, audioUrl }
 *        audioUrl is a relative path like /recordings/<uuid>.mp3 produced by
 *        the /api/admin/recordings/upload endpoint. Creates the
 *        RecordedReading row.
 */

// ─── Schemas ──────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title too long'),
  duration: z
    .number()
    .int('Duration must be an integer (minutes)')
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration must be at most 600 minutes'),
  price: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .max(50, 'Price too long'),
  bookingId: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .or(z.literal('').transform(() => null))
    .optional(),
  audioUrl: z
    .string()
    .trim()
    .min(1, 'audioUrl is required')
    .max(500, 'audioUrl too long')
    // Reject absolute URLs — recordings are always served from our own origin.
    .refine(
      (u) => u.startsWith('/recordings/'),
      'audioUrl must be a relative path like /recordings/<file>.mp3'
    ),
});

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10))
    );
    const skip = (page - 1) * limit;

    const where: { bookingId?: string } = {};
    if (bookingId) where.bookingId = bookingId;

    const [recordings, total] = await Promise.all([
      db.recordedReading.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              id: true,
              name: true,
              email: true,
              duration: true,
              price: true,
              status: true,
            },
          },
        },
      }),
      db.recordedReading.count({ where }),
    ]);

    return NextResponse.json({
      recordings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin recordings list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      const text = await request.text();
      // Admin create bodies are tiny metadata; cap is generous but bounded.
      if (text.length > 32 * 1024) {
        return NextResponse.json(
          { error: 'Body too large' },
          { status: 413 }
        );
      }
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue
            ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
            : 'Invalid input',
        },
        { status: 400 }
      );
    }

    const { title, duration, price, bookingId, audioUrl } = parsed.data;

    // If bookingId is provided, verify the booking exists before linking.
    // (Otherwise the FK constraint would throw — but we want a cleaner 400.)
    if (bookingId) {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      });
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }
    }

    const recording = await db.recordedReading.create({
      data: {
        title,
        duration,
        price,
        bookingId: bookingId || null,
        audioUrl,
      },
      include: {
        booking: {
          select: {
            id: true,
            name: true,
            email: true,
            duration: true,
            price: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ recording }, { status: 201 });
  } catch (error) {
    console.error('Admin recording create error:', error);
    return NextResponse.json(
      { error: 'Failed to create recording' },
      { status: 500 }
    );
  }
}
