/**
 * Membership pricing configuration for AstroKalki.
 * 
 * Each plan includes session count, archive access, priority booking, and atlas access.
 * Stripe price IDs are loaded from environment variables for security.
 */

export interface MembershipPlan {
  id: 'monthly' | 'yearly';
  name: string;
  price: number; // in INR
  currency: 'INR';
  billingCycle: 'month' | 'year';
  description: string;
  benefits: string[];
  savings?: number; // annual savings vs monthly
  stripeEnvKey: string;
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 999,
    currency: 'INR',
    billingCycle: 'month',
    description: 'Most chosen for testing this is yours',
    benefits: [
      'One 60-minute session per month, priority booked',
      'Recording archive access — every past session, replayable',
      'Full Pattern Atlas access — all 10 structured patterns',
      'Priority booking ahead of public queue',
      'Member-only reflections — short written pieces between sessions',
    ],
    stripeEnvKey: 'STRIPE_PRICE_MONTHLY',
  },
  {
    id: 'yearly',
    name: 'Annual',
    price: 9999,
    currency: 'INR',
    billingCycle: 'year',
    description: 'For those who already know the pattern is theirs',
    benefits: [
      'Everything in Monthly, for 12 months',
      '12 sessions — one per month, transferable if you skip a month',
      'Annual chart review — a longer reading of how the year\'s pattern is shifting',
      'Birthday reading — a focused session timed to your solar return',
      'Direct message support between sessions',
      'Early access to new essays, Atlas patterns, and offerings',
    ],
    savings: (999 * 12) - 9999, // 2 months free
  },
];

/**
 * Get membership plan by ID
 */
export function getMembershipPlan(id: 'monthly' | 'yearly'): MembershipPlan {
  const plan = MEMBERSHIP_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown membership plan: ${id}`);
  return plan;
}

/**
 * Get Stripe price ID from environment
 */
export function getStripePriceId(plan: MembershipPlan): string | null {
  return process.env[plan.stripeEnvKey] || null;
}

/**
 * Calculate price per session for comparison
 */
export function getPricePerSession(plan: MembershipPlan): number {
  const sessionsPerYear =
    plan.billingCycle === 'month'
      ? 12 // monthly plan: 1 session/month = 12 sessions/year
      : 12; // yearly plan: 12 sessions/year
  
  const pricePerYear =
    plan.billingCycle === 'month'
      ? plan.price * 12
      : plan.price;
  
  return Math.round((pricePerYear / sessionsPerYear) * 100) / 100;
}
