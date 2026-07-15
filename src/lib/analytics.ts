/**
 * Server-side analytics helper for AstroKalki.
 *
 * Tracks funnel events from landing page → booking → payment → session.
 * All calls are non-blocking: failures are logged but never break the calling flow.
 *
 * Event taxonomy lives in src/lib/bookings/constants.ts (ANALYTICS_EVENTS).
 */

import { db } from "@/lib/db";

export interface TrackEventInput {
  /** Event type (use ANALYTICS_EVENTS constants). */
  type: string;
  /** Optional booking ID to link event to a booking. */
  bookingId?: string;
  /** Optional email for anonymous flow mapping. */
  email?: string;
  /** Optional session ID (browser fingerprint / cookie). */
  sessionId?: string;
  /** Arbitrary metadata payload. */
  metadata?: Record<string, unknown>;
}

/**
 * Track a generic analytics event.
 * Non-throwing — failures are logged but never block the caller.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        event: input.type,
        page: "/",
        sessionId: input.sessionId || "server",
        data: JSON.stringify({
          bookingId: input.bookingId,
          email: input.email,
          ...input.metadata,
        }),
      },
    });
  } catch (err) {
    console.error(
      `[Analytics] Failed to track event "${input.type}":`,
      err
    );
  }
}

/**
 * Convenience wrapper for booking-related analytics events.
 * Automatically includes bookingId and source metadata.
 */
export async function trackBookingEvent(
  type: string,
  bookingId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return trackEvent({
    type,
    bookingId,
    metadata: {
      ...metadata,
      trackedAt: new Date().toISOString(),
    },
  });
}

/**
 * Fire-and-forget version for use in .catch() chains or fire-and-forget contexts.
 */
export function trackEventSafe(
  type: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent({ type, metadata }).catch(() => {});
}
