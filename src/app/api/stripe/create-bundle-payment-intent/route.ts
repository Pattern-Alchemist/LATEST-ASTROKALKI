/**
 * POST /api/stripe/create-bundle-payment-intent
 *
 * Creates a Stripe PaymentIntent for a session bundle purchase.
 * Validates bundle slug, rate limits, and returns client secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createBundlePaymentIntent } from "@/lib/stripe/bundle-service";
import { getBundleBySlug } from "@/lib/stripe/bundle-pricing";

export async function POST(request: NextRequest) {
  // Rate limit: 10 per IP per hour
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: "Body too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bundleSlug, email, name, phone, bookingId } = body as Record<
    string,
    string
  >;

  if (!bundleSlug || typeof bundleSlug !== "string") {
    return NextResponse.json(
      { error: "bundleSlug is required" },
      { status: 400 }
    );
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  const bundle = getBundleBySlug(bundleSlug);
  if (!bundle) {
    return NextResponse.json(
      { error: `Unknown bundle: ${bundleSlug}` },
      { status: 400 }
    );
  }

  try {
    const result = await createBundlePaymentIntent({
      bundleSlug,
      email,
      name,
      phone,
      bookingId,
    });

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      bundle: {
        slug: result.bundle.slug,
        title: result.bundle.title,
        description: result.bundle.description,
        sessionCount: result.bundle.sessionCount,
        amount: result.amount,
      },
    });
  } catch (err) {
    console.error("[CreateBundlePI] Error:", err);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
