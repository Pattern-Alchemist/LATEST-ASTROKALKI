/**
 * Booking event logger — persists audit trail entries for every lifecycle event.
 *
 * All event names are centralised in ./constants.ts to prevent string drift.
 */

import { db } from "@/lib/db";

export interface LogBookingEventInput {
  bookingId: string;
  type: string;
  source?: string;
  payload?: Record<string, unknown>;
}

/**
 * Log a booking lifecycle event.
 * Non-throwing — failures are logged but never break the calling flow.
 */
export async function logBookingEvent(
  input: LogBookingEventInput
): Promise<void> {
  try {
    await db.bookingEvent.create({
      data: {
        bookingId: input.bookingId,
        type: input.type,
        source: input.source || "system",
        payload: input.payload ? JSON.stringify(input.payload) : null,
      },
    });
  } catch (err) {
    console.error(
      `[BookingEvent] Failed to log ${input.type} for ${input.bookingId}:`,
      err
    );
  }
}

/**
 * Safe convenience wrapper around logBookingEvent.
 * Can be used in fire-and-forget contexts (e.g. .catch(() => {})).
 */
export function logBookingEventSafe(
  bookingId: string,
  type: string,
  source?: string,
  payload?: Record<string, unknown>
): void {
  logBookingEvent({ bookingId, type, source, payload }).catch(() => {});
}
