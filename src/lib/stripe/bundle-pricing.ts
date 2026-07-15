/**
 * Bundle pricing catalog for AstroKalki session packages.
 *
 * Each bundle defines a slug, INR amount, session count, and optional validity.
 * Stripe product/price IDs are mapped via environment variables.
 */

export interface BundleCatalogItem {
  slug: string;
  title: string;
  description: string;
  amountInINR: number;
  sessionCount: number;
  validityDays?: number; // undefined = no expiry
  stripeEnvKey: string; // env var name for the Stripe price ID
}

export const BUNDLE_CATALOG: BundleCatalogItem[] = [
  {
    slug: "single-session",
    title: "Single Session",
    description: "One 60-minute pattern reading session.",
    amountInINR: 1999,
    sessionCount: 1,
    stripeEnvKey: "STRIPE_PRICE_SINGLE_SESSION",
  },
  {
    slug: "three-session-pack",
    title: "Three Session Pack",
    description: "Three 60-minute sessions — ideal for an initial deep dive.",
    amountInINR: 4999,
    sessionCount: 3,
    validityDays: 90,
    stripeEnvKey: "STRIPE_PRICE_THREE_SESSION_PACK",
  },
  {
    slug: "five-session-pack",
    title: "Five Session Pack",
    description: "Five 60-minute sessions — complete pattern work over 3 months.",
    amountInINR: 7499,
    sessionCount: 5,
    validityDays: 120,
    stripeEnvKey: "STRIPE_PRICE_FIVE_SESSION_PACK",
  },
];

/**
 * Look up a bundle by slug.
 * Returns undefined if the slug is not in the catalog.
 */
export function getBundleBySlug(
  slug: string
): BundleCatalogItem | undefined {
  return BUNDLE_CATALOG.find((b) => b.slug === slug);
}

/**
 * Get the Stripe price ID for a bundle from environment variables.
 * Returns null if the env var is not set.
 */
export function getStripePriceId(
  bundle: BundleCatalogItem
): string | null {
  return process.env[bundle.stripeEnvKey] || null;
}


