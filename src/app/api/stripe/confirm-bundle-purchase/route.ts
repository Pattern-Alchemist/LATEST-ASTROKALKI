/**
 * POST /api/stripe/confirm-bundle-purchase
 *
 * Called client-side after Stripe PaymentIntent confirmation succeeds.
 * Delegates to the shared bundle fulfillment service (idempotent).
 */

import { NextRequest, NextResponse } from "next/server";
import { fulfillBundlePurchase } from "@/lib/stripe/bundle-service";

export async function POST(request: NextRequest) {
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

  const { paymentIntentId } = body as { paymentIntentId?: string };

  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    return NextResponse.json(
      { error: "paymentIntentId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await fulfillBundlePurchase({
      paymentIntentId,
      source: "confirm-bundle-route",
    });

    return NextResponse.json({
      success: true,
      purchase: result.purchase,
      created: result.created,
    });
  } catch (err) {
    console.error("[ConfirmBundlePurchase] Error:", err);
    return NextResponse.json(
      { error: "Failed to confirm bundle purchase" },
      { status: 500 }
    );
  }
}
