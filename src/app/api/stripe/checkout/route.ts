import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  isHoneypotTriggered,
} from '@/lib/security';

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for an AstroKalki membership subscription
 * (monthly or yearly) and returns the hosted Checkout URL.
 *
 * The frontend then navigates the browser to that URL via window.location.
 * After payment, Stripe redirects the user to:
 *   success_url = /account?status=success
 *   cancel_url   = /membership?status=cancelled
 *
 * Security layers:
 *   1. Rate limit — 5/hour per IP (reuses the `bookings` preset — same
 *      conversion-sensitive cadence, and keeps the rate-limit map small).
 *   2. Zod validation — plan must be 'monthly' | 'yearly', email is the
 *      standard email primitive, honeypot must be empty.
 *   3. Honeypot — bots silently get a fake-success 200 with a fake URL.
 *   4. Env-var guard — if STRIPE_SECRET_KEY or the price IDs aren't set,
 *      we return a clear 503 so the operator notices immediately (rather
 *      than silently 500-ing on Stripe's SDK call).
 *
 * Body contract:
 *   { plan: 'monthly' | 'yearly', email?: string, website?: '' }
 */

const checkoutInputSchema = z.object({
  plan: z.enum(['monthly', 'yearly'], {
    message: "plan must be 'monthly' or 'yearly'",
  }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email('Invalid email format')
    .refine((e) => !e.endsWith('.con'), 'Did you mean .com?')
    .refine((e) => !e.endsWith('.cm'), 'Did you mean .com?')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // Honeypot — must be empty for the request to be valid.
  website: z
    .string()
    .max(0, 'Honeypot must be empty')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  // No apiVersion pin — the SDK uses its own default (the latest version the
  // installed stripe package was generated from), which keeps the TypeScript
  // types in lockstep with the API responses we receive.
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  // ─── 1. Rate limit (5/hour per IP — reuses bookings preset) ────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`checkout:${ip}`, RATE_LIMITS.bookings);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many checkout attempts. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── 2. Parse + size-cap body (4 KB — the payload is tiny) ─────────────
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ─── 3. Honeypot — silently succeed for bots ───────────────────────────
  if (isHoneypotTriggered(raw)) {
    // Return a plausible-looking checkout URL so the bot thinks it won.
    // The URL points back to /membership so even if a human accidentally
    // hits it, nothing harmful happens.
    return NextResponse.json(
      { url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/membership` },
      { status: 200 }
    );
  }

  // ─── 4. Zod validation ─────────────────────────────────────────────────
  const parsed = validateInput(checkoutInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { plan, email } = parsed.data;

  // ─── 5. Env-var guard ───────────────────────────────────────────────────
  const priceId =
    plan === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY;
  if (!priceId) {
    console.error(
      `[stripe/checkout] Missing STRIPE_PRICE_${plan.toUpperCase()} env var`
    );
    return NextResponse.json(
      { error: 'Membership pricing is not configured. Please try again later.' },
      { status: 503 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';

  // ─── 6. Create the Checkout Session ────────────────────────────────────
  try {
    const stripe = getStripe();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Re-strip the trailing slash so success_url/cancel_url are clean.
      success_url: `${siteUrl.replace(/\/$/, '')}/account?status=success`,
      cancel_url: `${siteUrl.replace(/\/$/, '')}/membership?status=cancelled`,
      // Pre-fill the email so the Stripe Checkout form is one field shorter
      // for returning members. If they're not signed in, this is the email
      // they entered on the pricing page.
      ...(email ? { customer_email: email } : {}),
      metadata: {
        ...(email ? { email } : {}),
        plan,
        source: 'astrokalki-membership',
      },
      // Branding on the Stripe-hosted Checkout page — subtle, matches the
      // dark editorial site.
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      consent_collection: {
        terms_of_service: 'none',
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      console.error('[stripe/checkout] Stripe returned a session with no URL');
      return NextResponse.json(
        { error: 'Checkout session could not be created.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error('[stripe/checkout] create session failed:', err);
    return NextResponse.json(
      { error: 'Failed to start checkout. Please try again.' },
      { status: 500 }
    );
  }
}
