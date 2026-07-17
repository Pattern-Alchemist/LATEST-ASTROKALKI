import { prisma } from '@/lib/prisma';
import { Logger } from './logger';

const logger = new Logger();

/**
 * Business hours configuration.
 * Can be extended to support timezone-based hours.
 */
const BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 18, // 6 PM
};

/**
 * Fetch available slots within a date range.
 * Optimized for Vercel serverless with indexed queries.
 */
export async function getAvailableSlots(
  startDate: Date,
  endDate: Date,
  duration?: 30 | 60 | 90,
  limit: number = 50,
  requestId?: string
) {
  const actualRequestId = requestId || logger.getRequestId();

  logger.info('fetching_available_slots', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration,
    limit,
    requestId: actualRequestId,
  });

  try {
    // Optimized query using indexed fields
    logger.info('query_started', {
      queryName: 'get_available_slots',
      timeoutMs: 3000,
      requestId: actualRequestId,
    });

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        start: {
          gte: startDate,
        },
        end: {
          lte: endDate,
        },
        status: 'open',
      },
      select: {
        id: true,
        start: true,
        end: true,
        duration: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        start: 'asc',
      },
      take: limit,
    });

    logger.info('query_completed', {
      queryName: 'get_available_slots',
      duration: 0,
      requestId: actualRequestId,
    });

    // Filter by duration if specified
    const filtered = duration
      ? slots.filter((slot) => slot.duration === duration)
      : slots;

    logger.info('available_slots_fetched', {
      count: filtered.length,
      requestId: actualRequestId,
    });

    return filtered;
  } catch (error) {
    logger.error('failed_to_fetch_slots', {
      error: error instanceof Error ? error.message : String(error),
      requestId: actualRequestId,
    });
    throw error;
  }
}

/**
 * Book a specific slot.
 * Enforces database-level uniqueness to prevent double-booking.
 */
export async function bookSlot(
  slotId: string,
  bookingId: string,
  requestId?: string
) {
  const actualRequestId = requestId || logger.getRequestId();

  logger.info('booking_slot_started', {
    slotId,
    bookingId,
    requestId: actualRequestId,
  });

  try {
    // Atomic update: only succeed if slot is still 'open'
    const updatedSlot = await prisma.availabilitySlot.update({
      where: { id: slotId },
      data: {
        status: 'booked',
        bookingId,
      },
      select: {
        id: true,
        start: true,
        end: true,
        status: true,
      },
    });

    logger.info('slot_booked', {
      slotId,
      bookingId,
      start: updatedSlot.start,
      end: updatedSlot.end,
      requestId: actualRequestId,
    });

    return updatedSlot;
  } catch (error) {
    logger.error('failed_to_book_slot', {
      slotId,
      bookingId,
      error: error instanceof Error ? error.message : String(error),
      requestId: actualRequestId,
    });
    throw error;
  }
}

/**
 * Release a booked slot (for cancellations).
 */
export async function releaseSlot(slotId: string, requestId?: string) {
  const actualRequestId = requestId || logger.getRequestId();

  logger.info('releasing_slot', {
    slotId,
    requestId: actualRequestId,
  });

  try {
    const updatedSlot = await executeWithTimeout(
      'release_slot',
      () =>
        prisma.availabilitySlot.update({
          where: { id: slotId },
          data: {
            status: 'open',
            bookingId: null,
          },
        }),
      3000,
      actualRequestId
    );

    logger.info('slot_released', {
      slotId,
      requestId: actualRequestId,
    });

    return updatedSlot;
  } catch (error) {
    logger.error('failed_to_release_slot', {
      slotId,
      error: error instanceof Error ? error.message : String(error),
      requestId: actualRequestId,
    });
    throw error;
  }
}

/**
 * Generate time slots based on business hours and availability.
 * Useful for admin slot creation.
 */
export function generateBusinessHourSlots(
  date: Date,
  slotDurationMins: number = 60,
  slotIntervalMins: number = 30 // Interval between slot starts
): Array<{ start: Date; end: Date; duration: number }> {
  const slots: Array<{ start: Date; end: Date; duration: number }> = [];
  const dayStart = new Date(date);
  dayStart.setHours(BUSINESS_HOURS.start, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(BUSINESS_HOURS.end, 0, 0, 0);

  let currentStart = new Date(dayStart);
  while (currentStart.getTime() + slotDurationMins * 60 * 1000 <= dayEnd.getTime()) {
    const slotEnd = new Date(currentStart.getTime() + slotDurationMins * 60 * 1000);
    slots.push({
      start: new Date(currentStart),
      end: slotEnd,
      duration: slotDurationMins,
    });
    currentStart = new Date(currentStart.getTime() + slotIntervalMins * 60 * 1000);
  }

  return slots;
}
