import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/admin/bookings
 *
 * Admin-only endpoint to fetch bookings with optional search and filtering.
 *
 * Query params:
 *   - search: search by name or email (case-insensitive)
 *   - status: filter by status (pending, confirmed, completed, etc.)
 *   - limit: max results (default 50, max 200)
 *   - offset: pagination offset (default 0)
 *   - sort: sort by field (createdAt, scheduledAt, status)
 *   - order: asc or desc (default desc)
 *
 * Used by admin booking picker/table. Returns core booking fields.
 * Auth-gated by middleware.
 */
export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const logger = new Logger(requestId);

  logger.info('admin_bookings_request_received');

  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status');
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10), 1),
      200
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const sort = searchParams.get('sort') || 'createdAt';
    const order =
      (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    logger.info('admin_bookings_query', {
      search,
      status,
      limit,
      offset,
      sort,
      order,
    });

    // Build where clause with search and filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Build sort clause
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (['createdAt', 'scheduledAt', 'status', 'updatedAt'].includes(sort)) {
      orderBy[sort] = order;
    } else {
      orderBy.createdAt = order;
    }

    // Fetch bookings and total count in parallel
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          duration: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          price: true,
          paymentIntentId: true,
          contexts: true,
          birthDate: true,
          birthPlace: true,
          message: true,
          liveKitRoom: {
            select: {
              id: true,
              roomName: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    logger.info('admin_bookings_fetched', {
      count: bookings.length,
      total,
    });

    return NextResponse.json(
      {
        bookings,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        requestId,
      },
      {
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error) {
    logger.error('admin_bookings_fetch_failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch bookings',
        requestId,
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
