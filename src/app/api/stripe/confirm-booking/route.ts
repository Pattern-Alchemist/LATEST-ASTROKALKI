/**
 * POST /api/stripe/confirm-booking
 *
 * Called client-side after Stripe PaymentIntent confirmation succeeds.
 * Delegates to the shared confirmBookingFromPaymentIntent() helper.
 *
 * The webhook at /api/stripe/webhook is the PRIMARY fulfillment path for
 * redirect-based payments (UPI/netbanking). This route handles the
 * client-side return flow for card payments that complete inline.
 *
 * Idempotent: calling twice with the same paymentIntentId returns the
 * existing booking (does not create a duplicate).
 *
 * Security:
 *   - Rate-limited: 10/hour per IP
 *   - Verifies PaymentIntent status before creating booking
 *   - Body size cap: 8 KB
 */

import { NextRequest, NextResponse } from "next/server";
import { confirmBookingFromPaymentIntent } from "@/lib/bookings/confirm-from-payment";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`cb:${ip}`, RATE_LIMITS.newsletter);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 8 * 1024) return NextResponse.json({ error: "Body too large" }, { status: 413 });
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const paymentIntentId = body.paymentIntentId as string | undefined;
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
  }

  const selectedSlot = body.selectedSlot as { id: string; start: string } | undefined;

  try {
    const result = await confirmBookingFromPaymentIntent({
      paymentIntentId,
      source: "confirm-booking-route",
      fallbackPayload: {
        name: (body.name as string) || "",
        email: (body.email as string) || "",
        duration: parseInt(body.duration as string) as 30 | 60 | 90,
        price: (body.price as string) || "",
        phone: body.phone as string | undefined,
        contexts: body.contexts as string[] | undefined,
        message: body.message as string | undefined,
        referredBy: body.referredBy as string | undefined,
        slotId: selectedSlot?.id || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        booking: result.booking,
        created: result.created,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Confirm Booking] Error:", err);
    return NextResponse.json(
      { error: `Failed to confirm booking: ${message}. Please contact us via WhatsApp.` },
      { status: 400 }
    );
  }
}
