import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { getAvailableSlots } from '@/lib/slots-service';
import { slotsQuerySchema, validateRequest } from '@/lib/validators';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/slots
 *
 * Public endpoint. Returns availability slots that are currently open
 * (status='open') and start in the future.
 *
 * Optimized for Vercel serverless with:
 * - Indexed queries (start, status)
 * - 30-day default window (configurable via startDate/endDate)
 * - Structured logging with correlation IDs
 * - Hard 5s timeout guard
 * - Fallback to empty array on timeout (graceful degradation)
 *
 * Query params:
 *   - duration: '30' | '60' | '90' (optional)
 *   - startDate: ISO datetime (optional, defaults to now)
 *   - endDate: ISO datetime (optional, defaults to now + 30 days)
 *   - limit: max 100 (optional, default 50)
 */
export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const logger = new Logger(requestId);

  logger.info('slots_request_received', {
    url: request.url,
    headers: {
      userAgent: request.headers.get('user-agent'),
    },
  });

  try {
    const { searchParams } = new URL(request.url);

    // Validate and parse query parameters
    const queryParams = {
      duration: searchParams.get('duration'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
    };

    const validationResult = validateRequest(slotsQuerySchema, queryParams);
    if (!validationResult.success) {
      logger.warn('invalid_slot_params', {
        errors: validationResult.errors.format(),
      });
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validationResult.errors.format(),
        },
        { status: 400 }
      );
    }

    const { duration, startDate, endDate, limit } = validationResult.data;

    // Determine date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days default

    logger.info('fetching_slots_params', {
      duration,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit,
    });

    // Fetch slots with timeout and correlation ID
    const slots = await Promise.race([
      getAvailableSlots(
        start,
        end,
        duration as 30 | 60 | 90 | undefined,
        limit,
        requestId
      ),
      // Hard 5s timeout guard
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Slots query timeout (5s)')), 5000)
      ),
    ]);

    logger.info('slots_fetched_successfully', {
      count: slots.length,
    });

    return NextResponse.json(
      {
        slots,
        count: slots.length,
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Check if this was a timeout
    if (errorMessage.includes('timeout')) {
      logger.warn('slots_query_timeout', {
        error: errorMessage,
      });
      // Return empty slots array with message on timeout (graceful degradation)
      return NextResponse.json(
        {
          slots: [],
          count: 0,
          message: 'Request timeout. Please try again.',
          timestamp: new Date().toISOString(),
          requestId,
        },
        { status: 200 } // 200 to signal client to retry, not error
      );
    }

    logger.error('slots_fetch_failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch slots',
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
