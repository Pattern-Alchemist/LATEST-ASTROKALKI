/**
 * POST /api/stripe/customer-portal
 *
 * Creates a Stripe Billing Portal session for invoice/payment method management.
 * Requires an existing Stripe customer ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/stripe/portal-service";

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

  const { stripeCustomerId } = body as { stripeCustomerId?: string };

  if (!stripeCustomerId || typeof stripeCustomerId !== "string") {
    return NextResponse.json(
      { error: "stripeCustomerId is required" },
      { status: 400 }
    );
  }

  try {
    const { url } = await createCustomerPortalSession({ stripeCustomerId });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[CustomerPortal] Error:", err);
    return NextResponse.json(
      { error: "Failed to create portal session. Please contact support." },
      { status: 500 }
    );
  }
}
