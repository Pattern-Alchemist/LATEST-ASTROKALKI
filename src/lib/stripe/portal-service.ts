/**
 * Stripe Billing Portal service for AstroKalki.
 *
 * Creates Stripe-hosted portal sessions for invoice/payment method management.
 * Domain-specific content (notes, bundle usage) stays in the app portal.
 */

import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export interface CreatePortalSessionInput {
  stripeCustomerId: string;
  returnUrl?: string;
}

export interface PortalSessionResult {
  url: string;
}

/**
 * Create a Stripe Billing Portal session for a known customer.
 * Returns the hosted portal URL where the customer can manage
 * invoices, payment methods, and billing details.
 */
export async function createCustomerPortalSession(
  input: CreatePortalSessionInput
): Promise<PortalSessionResult> {
  const stripe = getStripe();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl || `${siteUrl}/portal`,
  });

  if (!session.url) {
    throw new Error("Stripe returned a portal session with no URL");
  }

  return { url: session.url };
}
