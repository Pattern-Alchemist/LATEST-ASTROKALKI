import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/stripe/portal
 *
 * Auth-gated. Creates a Stripe Billing Portal session for the signed-in
 * member so they can manage their own subscription (update card, change
 * plan, cancel, view invoices) without us having to build that UI.
 *
 * Returns: { url } — the browser should navigate to this URL (top-level
 * navigation, not an iframe — Stripe blocks iframing).
 *
 * Flow:
 *   1. Verify the user is signed in (getServerSession).
 *   2. Look up their Membership row by userId or email.
 *   3. If no membership or no stripeCustomerId → 404 with a helpful message.
 *   4. Create the portal session with return_url=/account.
 *   5. Return the URL.
 *
 * Security:
 *   - Auth-gated by NextAuth session. Middleware does not block this path
 *     (it's not in the public-POST-API list), but our session check enforces
 *     identity anyway.
 *   - CSRF: NextAuth database sessions use SameSite=Lax cookies, so a
 *     cross-origin POST can't ride the session cookie.
 */

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  // No apiVersion pin — uses the SDK's default, matching the TS types.
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  // ─── 1. Auth gate ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to manage your subscription.' },
      { status: 401 }
    );
  }

  // ─── 2. Look up the member's active membership ─────────────────────────
  // Prefer matching by userId (deterministic — the membership record was
  // linked to the NextAuth user at checkout time when possible), fall back
  // to email match.
  const userId = (session.user as { id?: string }).id;
  const membership = await db.membership.findFirst({
    where: {
      OR: [
        ...(userId ? [{ userId }] : []),
        { email: session.user.email },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!membership || !membership.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          'No active subscription found on your account. If you recently subscribed, please refresh this page in a moment.',
      },
      { status: 404 }
    );
  }

  // ─── 3. Create the Billing Portal session ──────────────────────────────
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: membership.stripeCustomerId,
      return_url: `${siteUrl.replace(/\/$/, '')}/account?status=portal`,
    });

    return NextResponse.json({ url: portalSession.url }, { status: 200 });
  } catch (err) {
    console.error('[stripe/portal] session create failed:', err);
    return NextResponse.json(
      {
        error:
          'Could not open the billing portal. Please try again or contact support.',
      },
      { status: 500 }
    );
  }
}
