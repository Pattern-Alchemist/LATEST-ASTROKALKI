import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { confirmBookingFromPaymentIntent } from '@/lib/bookings/confirm-from-payment';
import { fulfillBundlePurchase } from '@/lib/stripe/bundle-service';
import { logBookingEvent } from '@/lib/bookings/events';
import { BOOKING_EVENTS, EVENT_SOURCES } from '@/lib/bookings/constants';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key);
}

function asSubscription(obj: unknown): Stripe.Subscription | null {
  if (!obj || typeof obj !== 'object') return null;
  const s = obj as Stripe.Subscription;
  if (typeof s.id !== 'string') return null;
  return s;
}

function mapStatus(stripeStatus: string): 'active' | 'expired' | 'cancelled' {
  if (stripeStatus === 'active' || stripeStatus === 'trialing' || stripeStatus === 'past_due') return 'active';
  if (stripeStatus === 'canceled') return 'expired';
  return 'expired';
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  const v = (item as { current_period_end?: number }).current_period_end;
  return typeof v === 'number' ? v : null;
}

function getInterval(subscription: Stripe.Subscription): 'day' | 'week' | 'month' | 'year' | null {
  const recurring = subscription.items.data[0]?.price?.recurring;
  if (!recurring) return null;
  return recurring.interval;
}

async function upsertMembership(params: {
  email: string;
  name?: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  stripeSessionId?: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  userId?: string | null;
}) {
  const { email, name, plan, status, stripeSessionId, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, cancelAtPeriodEnd, userId } = params;

  const existing = await db.membership.findFirst({
    where: { OR: [{ stripeSubscriptionId }, { stripeCustomerId }, { email }] },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return db.membership.update({
      where: { id: existing.id },
      data: { email, ...(name ? { name } : {}), plan, status, stripeSessionId: stripeSessionId ?? existing.stripeSessionId, stripeCustomerId, stripeSubscriptionId, ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}), ...(cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd } : {}), ...(userId ? { userId } : {}) },
    });
  }

  return db.membership.create({
    data: { email, name: name || email.split('@')[0], plan, status, stripeSessionId: stripeSessionId || null, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd: currentPeriodEnd || null, cancelAtPeriodEnd: cancelAtPeriodEnd ?? false, userId: userId || null },
  });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown signature error';
    console.error(`[stripe/webhook] signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  // Dedup: skip if we've already processed this event
  if (event.id) {
    const alreadyProcessed = await db.booking.findFirst({
      where: { stripeEventId: event.id },
      select: { id: true },
    });
    if (alreadyProcessed) {
      return NextResponse.json({ received: true, deduped: true });
    }
    // Also check BundlePurchase for bundle webhook dedup
    const bundleDedup = await db.bundlePurchase.findFirst({
      where: { metadataJson: { contains: event.id } },
      select: { id: true },
    });
    if (bundleDedup) {
      return NextResponse.json({ received: true, deduped: true });
    }
  }

  try {
    switch (event.type) {
      // ─── Phase 12: One-time booking payment ───────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[stripe/webhook] payment_intent.succeeded: ${pi.id}`);

        // Route to booking or bundle fulfillment based on metadata source
        if (pi.metadata?.source === 'astrokalki-booking' || pi.metadata?.source === 'astrokalki-booking-flow') {
          try {
            const result = await confirmBookingFromPaymentIntent({
              paymentIntentId: pi.id,
              source: 'stripe-webhook',
              stripeEventId: event.id,
            });
            console.log(`[stripe/webhook] Booking ${result.created ? 'created' : 'already existed'}: ${result.booking.id}`);
          } catch (err) {
            console.error(`[stripe/webhook] Failed to confirm booking for PI ${pi.id}:`, err);
          }
        } else if (pi.metadata?.source === 'astrokalki-bundle') {
          try {
            const result = await fulfillBundlePurchase({
              paymentIntentId: pi.id,
              source: 'stripe-webhook',
              stripeEventId: event.id,
            });
            console.log(`[stripe/webhook] Bundle ${result.created ? 'created' : 'already existed'}: ${result.purchase.id}`);
          } catch (err) {
            console.error(`[stripe/webhook] Failed to fulfill bundle for PI ${pi.id}:`, err);
          }
        } else {
          console.log(`[stripe/webhook] Ignoring unrecognized PaymentIntent: ${pi.id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`[stripe/webhook] payment_intent.payment_failed: ${pi.id}`, pi.last_payment_error?.message);
        // Log for monitoring — no booking to create
        break;
      }

      // ─── Membership subscription events (existing) ────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (!subscriptionId || !customerId) {
          console.warn(`[stripe/webhook] checkout.session.completed missing subscription/customer`, { id: session.id });
          return NextResponse.json({ received: true });
        }
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const interval = getInterval(subscription);
        const plan: 'monthly' | 'yearly' = interval === 'year' ? 'yearly' : 'monthly';
        let email: string = session.metadata?.email || session.customer_email || session.customer_details?.email || '';
        if (!email && typeof session.customer === 'string') {
          try { const customer = (await stripe.customers.retrieve(session.customer)) as Stripe.Customer; email = customer.email || ''; } catch { /* */ }
        }
        let userId: string | null = null;
        if (email) { const user = await db.user.findUnique({ where: { email } }); if (user) userId = user.id; }
        const currentPeriodEndSec = getCurrentPeriodEnd(subscription);
        await upsertMembership({
          email, name: session.customer_details?.name || undefined, plan, status: mapStatus(subscription.status),
          stripeSessionId: session.id, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
          currentPeriodEnd: currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end, userId,
        });
        console.log(`[stripe/webhook] checkout.session.completed → membership activated`, { email, plan, customerId, subscriptionId });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = asSubscription(event.data.object);
        if (!subscription) { console.warn('[stripe/webhook] subscription.updated: malformed object'); break; }
        const interval = getInterval(subscription);
        const plan: 'monthly' | 'yearly' = interval === 'year' ? 'yearly' : 'monthly';
        let email = ''; let name: string | undefined;
        if (typeof subscription.customer === 'string') {
          try { const customer = (await stripe.customers.retrieve(subscription.customer)) as Stripe.Customer; email = customer.email || ''; name = customer.name || undefined; } catch { /* */ }
        }
        const existing = await db.membership.findFirst({
          where: { OR: [{ stripeSubscriptionId: subscription.id }, ...(subscription.customer ? [{ stripeCustomerId: subscription.customer as string }] : [])] },
          orderBy: { createdAt: 'desc' },
        });
        if (!existing) {
          if (email) {
            const currentPeriodEndSec = getCurrentPeriodEnd(subscription);
            await upsertMembership({ email, name, plan, status: mapStatus(subscription.status), stripeCustomerId: subscription.customer as string, stripeSubscriptionId: subscription.id, currentPeriodEnd: currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end });
          }
          break;
        }
        const currentPeriodEndSec = getCurrentPeriodEnd(subscription);
        await db.membership.update({
          where: { id: existing.id },
          data: { ...(email ? { email } : {}), ...(name ? { name } : {}), plan, status: mapStatus(subscription.status), stripeSubscriptionId: subscription.id, ...(subscription.customer ? { stripeCustomerId: subscription.customer as string } : {}), currentPeriodEnd: currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = asSubscription(event.data.object);
        if (!subscription) { console.warn('[stripe/webhook] subscription.deleted: malformed object'); break; }
        const currentPeriodEndSec = getCurrentPeriodEnd(subscription);
        const endedAtSec = subscription.ended_at;
        await db.membership.updateMany({
          where: { OR: [{ stripeSubscriptionId: subscription.id }, ...(subscription.customer ? [{ stripeCustomerId: subscription.customer as string }] : [])] },
          data: { status: 'expired', cancelAtPeriodEnd: false, currentPeriodEnd: endedAtSec ? new Date(endedAtSec * 1000) : currentPeriodEndSec ? new Date(currentPeriodEndSec * 1000) : null },
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error(`[stripe/webhook] handler failed for event ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
