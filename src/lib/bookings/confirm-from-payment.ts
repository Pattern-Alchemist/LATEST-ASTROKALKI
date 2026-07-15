/**
 * Shared booking fulfillment helper.
 *
 * Used by both the Stripe webhook (payment_intent.succeeded) and the
 * client-side /api/stripe/confirm-booking route. Guarantees idempotency:
 * calling twice with the same paymentIntentId returns the existing booking.
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { ensureDailyRoom } from "@/lib/daily";
import { sendBookingConfirmation } from "@/lib/email/booking-confirmation";
import { logBookingEvent } from "@/lib/bookings/events";
import {
  BOOKING_EVENTS,
  EVENT_SOURCES,
} from "@/lib/bookings/constants";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export interface ConfirmBookingFromPaymentIntentInput {
  paymentIntentId: string;
  source: "stripe-webhook" | "confirm-booking-route";
  /** Optional stripe event ID for dedup webhook-level. */
  stripeEventId?: string;
  /** Fallback payload when metadata on PaymentIntent is insufficient. */
  fallbackPayload?: {
    name: string;
    email: string;
    duration: 30 | 60 | 90;
    price: string;
    phone?: string;
    contexts?: string[];
    message?: string;
    referredBy?: string;
    slotId?: string | null;
  };
}

export interface ConfirmBookingResult {
  booking: {
    id: string;
    name: string;
    email: string;
    duration: number;
    price: string;
    status: string;
    roomUrl: string | null;
    scheduledAt: string | null;
  };
  created: boolean;
}

/**
 * Confirm a booking from a successful Stripe PaymentIntent.
 *
 * Idempotent: if a booking already exists for this paymentIntentId,
 * returns it without creating a duplicate. Guarantees exactly-one booking
 * per PaymentIntent even if the webhook and the confirm-booking route
 * both fire for the same intent.
 */
export async function confirmBookingFromPaymentIntent(
  input: ConfirmBookingFromPaymentIntentInput
): Promise<ConfirmBookingResult> {
  const { paymentIntentId, source, stripeEventId, fallbackPayload } = input;

  // 1. Check for existing booking (idempotency)
  const existing = await db.booking.findUnique({
    where: { paymentIntentId },
  });

  if (existing) {
    return {
      booking: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        duration: existing.duration,
        price: existing.price,
        status: existing.status,
        roomUrl: existing.roomUrl,
        scheduledAt: existing.scheduledAt?.toISOString() || null,
      },
      created: false,
    };
  }

  // 2. Verify PaymentIntent from Stripe
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new Error(
      `PaymentIntent status is ${paymentIntent.status}, expected 'succeeded'`
    );
  }

  // 3. Reconstruct booking data from metadata + fallback
  const meta = paymentIntent.metadata || {};
  const name =
    meta.name || fallbackPayload?.name || meta.email?.split("@")[0] || "Guest";
  const email = meta.email || fallbackPayload?.email || "";
  const duration = parseInt(meta.duration || String(fallbackPayload?.duration || "60"));
  const priceValue = meta.price || fallbackPayload?.price || "₹1,999";
  const phone = fallbackPayload?.phone || null;
  const contexts = JSON.stringify(
    fallbackPayload?.contexts || []
  );
  const message = fallbackPayload?.message || null;
  const referredBy = fallbackPayload?.referredBy || null;
  const slotId = fallbackPayload?.slotId || null;

  if (!email) {
    throw new Error("Cannot confirm booking: no email in metadata or fallback");
  }

  // 4. Create booking in a transaction (with optional slot update)
  const booking = await db.$transaction(async (tx) => {
    // Create the booking
    const b = await tx.booking.create({
      data: {
        name,
        email,
        phone,
        duration,
        price: priceValue.replace(/[₹,]/g, ""),
        contexts,
        message,
        status: "confirmed",
        referredBy,
        paymentIntentId,
        stripeEventId: stripeEventId || null,
        scheduledAt: slotId ? null : new Date(), // marked now if no slot
        slotId: slotId || null,
      },
    });

    // If a slot was selected, mark it as booked
    if (slotId) {
      await tx.availabilitySlot.update({
        where: { id: slotId },
        data: { status: "booked", bookingId: b.id },
      }).catch(() => {
        // Non-fatal — the booking is still created
      });
    }

    return b;
  });

  // 5. Log events
  await logBookingEvent({
    bookingId: booking.id,
    type: BOOKING_EVENTS.BOOKING_CREATED,
    source,
    payload: { paymentIntentId, email, duration, price: priceValue },
  });

  if (slotId) {
    await logBookingEvent({
      bookingId: booking.id,
      type: BOOKING_EVENTS.SLOT_MARKED_BOOKED,
      source,
      payload: { slotId },
    });
  }

  // 6. Create Daily.co room (non-blocking)
  let roomUrl: string | null = null;
  try {
    roomUrl = await ensureDailyRoom(booking.id, `[${source}]`);
    if (roomUrl) {
      await logBookingEvent({
        bookingId: booking.id,
        type: BOOKING_EVENTS.DAILY_ROOM_CREATED,
        source,
        payload: { roomUrl },
      });
    }
  } catch (err) {
    console.error(`[Booking] Room creation failed for ${booking.id}:`, err);
  }

  // 7. Send confirmation email (non-blocking)
  sendBookingConfirmation({
    id: booking.id,
    name: booking.name,
    email: booking.email,
    duration: booking.duration,
    price: booking.price,
    scheduledAt: booking.scheduledAt,
    roomUrl: roomUrl || undefined,
  })
    .then((result) => {
      logBookingEvent({
        bookingId: booking.id,
        type: BOOKING_EVENTS.CONFIRMATION_EMAIL_SENT,
        source,
        payload: { delivered: result.delivered, messageId: result.messageId },
      });
    })
    .catch((err) => {
      logBookingEvent({
        bookingId: booking.id,
        type: BOOKING_EVENTS.CONFIRMATION_EMAIL_FAILED,
        source,
        payload: { error: String(err) },
      });
    });

  // 8. Track analytics
  db.analyticsEvent
    .create({
      data: {
        event: "booking_paid",
        page: "/",
        sessionId: paymentIntent.id,
        data: JSON.stringify({
          bookingId: booking.id,
          email,
          duration,
          price: priceValue,
          paymentIntentId,
        }),
      },
    })
    .catch(() => {});

  return {
    booking: {
      id: booking.id,
      name: booking.name,
      email: booking.email,
      duration: booking.duration,
      price: booking.price,
      status: booking.status,
      roomUrl: roomUrl || booking.roomUrl,
      scheduledAt: booking.scheduledAt?.toISOString() || null,
    },
    created: true,
  };
}
