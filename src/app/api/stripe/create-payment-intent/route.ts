/**
 * POST /api/stripe/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for a one-time session booking.
 *
 * Why a PaymentIntent (not Checkout Session):
 *   The booking flow embeds Stripe Elements inline (PaymentElement) so the
 *   user never leaves the AstroKalki site. Checkout Sessions redirect to a
 *   Stripe-hosted page; PaymentElements render inside our own form.
 *
 * Flow:
 *   1. Client sends { duration, price, contexts, email, name }
 *   2. Server validates, creates a PaymentIntent with metadata
 *   3. Returns { clientSecret } — the frontend uses this to mount Elements
 *   4. Client confirms payment → calls /api/stripe/confirm-booking
 *
 * Security:
 *   - Rate-limited: 10/hour per IP
 *   - Body size cap: 4 KB
 *   - Email required in metadata for post-payment booking lookup
 *
 * Env vars:
 *   STRIPE_SECRET_KEY       — required
 *   STRIPE_PUBLISHABLE_KEY  — required for the frontend
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
} from "@/lib/security";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  // Rate limit — 10/hour per IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`pi:${ip}`, RATE_LIMITS.newsletter);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: "Body too large" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const duration = body.duration as string | undefined;
  const price = body.price as string | undefined;
  const email = body.email as string | undefined;
  const name = body.name as string | undefined;

  if (!email || !duration || !price) {
    return NextResponse.json(
      { error: "Missing required fields: email, duration, price" },
      { status: 400 }
    );
  }

  // Map duration to amount in paise (INR)
  const priceMap: Record<string, number> = {
    "30": 1499, // ₹1,499
    "60": 1999, // ₹1,999
    "90": 2999, // ₹2,999
  };

  const amount = priceMap[duration];
  if (!amount) {
    return NextResponse.json(
      { error: `Invalid duration: ${duration}` },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // already in paise (smallest currency unit for INR)
      currency: "inr",
      // Stripe supports UPI, cards, netbanking, wallets in India
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: email,
      metadata: {
        email,
        name: name || "Booking",
        duration,
        price,
        slotId: (body.slotId as string) || "",
        source: "astrokalki-booking-flow",
      },
      description: `AstroKalki Session — ${duration} min`,
    });

    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Stripe PaymentIntent] Error:", err);
    return NextResponse.json(
      { error: "Failed to create payment. Please try again." },
      { status: 500 }
    );
  }
}
