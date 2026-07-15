/**
 * Bundle purchase service for AstroKalki.
 *
 * Handles creating PaymentIntents, fulfilling purchases from webhooks,
 * and linking bundles to bookings. Single source of truth for bundle logic.
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import {
  getBundleBySlug,
  getStripePriceId,
  type BundleCatalogItem,
} from "./bundle-pricing";

// ─── Stripe client ────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

// ─── Types ────────────────────────────────────────────────────────

export interface CreateBundlePaymentIntentInput {
  bundleSlug: string;
  email: string;
  name?: string;
  phone?: string;
  bookingId?: string;
}

export interface BundlePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  bundle: BundleCatalogItem;
  amount: number;
}

export interface FulfillBundleInput {
  paymentIntentId: string;
  source: "stripe-webhook" | "confirm-bundle-route";
  stripeEventId?: string;
}

export interface FulfillBundleResult {
  purchase: {
    id: string;
    email: string;
    bundleSlug: string;
    totalSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
  };
  created: boolean;
}

// ─── Create PaymentIntent ─────────────────────────────────────────

export async function createBundlePaymentIntent(
  input: CreateBundlePaymentIntentInput
): Promise<BundlePaymentIntentResult> {
  const bundle = getBundleBySlug(input.bundleSlug);
  if (!bundle) {
    throw new Error(`Unknown bundle slug: ${input.bundleSlug}`);
  }

  const priceId = getStripePriceId(bundle);
  if (!priceId) {
    throw new Error(
      `Stripe price not configured for bundle: ${bundle.slug}`
    );
  }

  const stripe = getStripe();

  const metadata: Record<string, string> = {
    bundleSlug: bundle.slug,
    sessionCount: String(bundle.sessionCount),
    customerEmail: input.email,
    source: "astrokalki-bundle",
  };
  if (input.bookingId) metadata.bookingId = input.bookingId;
  if (input.name) metadata.name = input.name;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: bundle.amountInINR * 100, // Stripe uses paise
    currency: "inr",
    automatic_payment_methods: { enabled: true },
    metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
    bundle,
    amount: bundle.amountInINR,
  };
}

// ─── Fulfill bundle purchase (idempotent) ─────────────────────────

export async function fulfillBundlePurchase(
  input: FulfillBundleInput
): Promise<FulfillBundleResult> {
  const { paymentIntentId, source, stripeEventId } = input;

  // 1. Check for existing purchase (idempotency)
  const existing = await db.bundlePurchase.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { bundleProduct: { select: { slug: true } } },
  });

  if (existing) {
    return {
      purchase: {
        id: existing.id,
        email: existing.email,
        bundleSlug: existing.bundleProduct?.slug || "unknown",
        totalSessions: existing.totalSessions,
        remainingSessions: existing.remainingSessions,
        expiresAt: existing.expiresAt?.toISOString() || null,
      },
      created: false,
    };
  }

  // 2. Verify PaymentIntent from Stripe
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (pi.status !== "succeeded") {
    throw new Error(
      `PaymentIntent status is ${pi.status}, expected 'succeeded'`
    );
  }

  // 3. Resolve bundle catalog
  const bundleSlug = pi.metadata?.bundleSlug || "";
  const bundle = getBundleBySlug(bundleSlug);
  if (!bundle) {
    throw new Error(`Unknown bundle slug in metadata: ${bundleSlug}`);
  }

  const email =
    pi.metadata?.customerEmail ||
    pi.receipt_email ||
    "";
  if (!email) {
    throw new Error("Cannot fulfill bundle: no email found");
  }

  const name = pi.metadata?.name || email.split("@")[0];
  const sessionCount = bundle.sessionCount;

  // 4. Resolve or create Stripe customer
  let stripeCustomerId: string | null = null;
  if (pi.customer) {
    stripeCustomerId =
      typeof pi.customer === "string" ? pi.customer : pi.customer.id;
  }

  // 5. Find or create BundleProduct row
  let bundleProduct = await db.bundleProduct.findUnique({
    where: { slug: bundle.slug },
  });

  if (!bundleProduct) {
    bundleProduct = await db.bundleProduct.create({
      data: {
        slug: bundle.slug,
        title: bundle.title,
        description: bundle.description,
        sessionCount: bundle.sessionCount,
        validityDays: bundle.validityDays || null,
        stripePriceId: getStripePriceId(bundle),
      },
    });
  }

  // 6. Create purchase record
  const now = new Date();
  const expiresAt = bundle.validityDays
    ? new Date(now.getTime() + bundle.validityDays * 24 * 60 * 60 * 1000)
    : null;

  const purchase = await db.bundlePurchase.create({
    data: {
      email,
      name,
      stripeCustomerId,
      stripePaymentIntentId: paymentIntentId,
      bundleProductId: bundleProduct.id,
      status: "paid",
      totalSessions: sessionCount,
      remainingSessions: sessionCount,
      startsAt: now,
      expiresAt,
      metadataJson: JSON.stringify({
        stripeEventId,
        source,
        piAmount: pi.amount,
      }),
    },
  });

  // 7. Log activity
  await db.portalActivity.create({
    data: {
      bundlePurchaseId: purchase.id,
      eventType: "bundle_purchase_confirmed",
      eventSource: source,
      payloadJson: JSON.stringify({
        bundleSlug,
        sessionCount,
        amount: pi.amount,
      }),
    },
  });

  return {
    purchase: {
      id: purchase.id,
      email: purchase.email,
      bundleSlug: bundle.slug,
      totalSessions: purchase.totalSessions,
      remainingSessions: purchase.remainingSessions,
      expiresAt: purchase.expiresAt?.toISOString() || null,
    },
    created: true,
  };
}

// ─── Link bundle to booking ───────────────────────────────────────

export async function linkBundleToBooking(
  bundlePurchaseId: string,
  bookingId: string
): Promise<void> {
  const purchase = await db.bundlePurchase.findUnique({
    where: { id: bundlePurchaseId },
  });
  if (!purchase) throw new Error("Bundle purchase not found");
  if (purchase.remainingSessions <= 0) {
    throw new Error("Bundle has no remaining sessions");
  }

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { bundlePurchaseId },
    }),
    db.bundlePurchase.update({
      where: { id: bundlePurchaseId },
      data: { remainingSessions: { decrement: 1 } },
    }),
  ]);

  await db.portalActivity.create({
    data: {
      bundlePurchaseId,
      bookingId,
      eventType: "bundle_linked_to_booking",
      eventSource: "system",
    },
  });
}
