import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/revenue?days=30
 *
 * Business-intelligence layer for the AstroKalki admin. Auth-gated by
 * the central middleware (see /src/middleware.ts) — any caller without
 * a valid admin session cookie is rejected with 401 before this
 * handler runs.
 *
 * Response shape:
 *   {
 *     range: { days, from, to },
 *     mrr: number,                       // monthly recurring revenue (₹)
 *     arr: number,                       // annual recurring revenue (₹) = mrr * 12
 *     revenue30d: number,                // sum of booking prices, last 30 days
 *     ltv: number,                       // lifetime value per member (₹)
 *     churnRate: number,                 // % of members churned in last 30 days
 *     revenueByMonth: [ { month, revenue, bookings, memberships } ],   // last 12 months
 *     conversionFunnel: {
 *       visitors, microReadings, bookings, completedSessions, memberships,
 *       steps: [ { step, label, count, conversionRate, stepRate, dropoffRate } ]
 *     },
 *     cohorts: [ { cohortMonth, size, retention30d, retention60d, retention90d } ],
 *     membershipGrowth: [ { month, newMembers, cancelledMembers, netGrowth } ]
 *   }
 *
 * All time-bucketing is done in JS using Date methods so we avoid the
 * SQLite/Prisma date-function quirks across versions. The Booking.price
 * column is a formatted string ("₹1,999"); we strip non-digits with
 * `parseInt(price.replace(/[^0-9]/g, ''))` per the documented contract.
 */

// ─── Types ───────────────────────────────────────────────────────────

interface RevenueByMonth {
  month: string; // "MMM yyyy" (e.g. "Jan 2025")
  revenue: number;
  bookings: number;
  memberships: number;
}

interface FunnelStepOut {
  step: string;
  label: string;
  count: number;
  conversionRate: number; // % of step 0
  stepRate: number; // % of previous step
  dropoffRate: number; // 100 - stepRate
}

interface ConversionFunnel {
  visitors: number;
  microReadings: number;
  bookings: number;
  completedSessions: number;
  memberships: number;
  steps: FunnelStepOut[];
}

interface Cohort {
  cohortMonth: string; // "MMM yyyy"
  size: number;
  retention30d: number | null; // % retained at 30 days (null = cohort too young)
  retention60d: number | null;
  retention90d: number | null;
}

interface MembershipGrowth {
  month: string;
  newMembers: number;
  cancelledMembers: number;
  netGrowth: number;
}

interface RevenueResponse {
  range: { days: number; from: string; to: string };
  mrr: number;
  arr: number;
  revenue30d: number;
  ltv: number;
  churnRate: number;
  revenueByMonth: RevenueByMonth[];
  conversionFunnel: ConversionFunnel;
  cohorts: Cohort[];
  membershipGrowth: MembershipGrowth[];
}

// ─── Pricing constants ──────────────────────────────────────────────
// Pulled from the /membership page (₹999/mo, ₹9999/yr). Hard-coded
// here because Stripe holds only the price *ID* in env vars; the
// display amounts are public knowledge from the membership page.

const MONTHLY_PRICE_INR = 999;
const YEARLY_PRICE_INR = 9999;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Parse a Booking.price string ("₹1,999") to a numeric INR amount. */
function parsePrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/** "MMM yyyy" formatted label for a Date (system TZ). */
function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** yyyy-mm key for grouping by month. */
function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Build a list of the last `n` calendar months (oldest → newest), each
 *  represented by a Date pointing at the 1st of that month. */
function lastNMonths(n: number, ending: Date): Date[] {
  const months: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ending.getFullYear(), ending.getMonth() - i, 1);
    months.push(d);
  }
  return months;
}

// ─── Route handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Parse ?days= param — clamp to 1..365, default 30
    const daysParam = request.nextUrl.searchParams.get('days');
    let days = 30;
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 365) {
        days = parsed;
      }
    }

    const now = new Date();
    const from = new Date(now.getTime() - days * MS_PER_DAY);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);

    // ─── Pull raw rows in parallel ──────────────────────────────────
    // We pull a generous historical window (12 months) so monthly
    // buckets and 90-day retention have data to chew on.
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );

    const [
      allBookings,
      allMemberships,
      microReadingsInWindow,
      analyticsInWindow,
    ] = await Promise.all([
      db.booking.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: {
          price: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.membership.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: {
          plan: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.microReading.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      db.analyticsEvent.findMany({
        where: { timestamp: { gte: from } },
        select: { sessionId: true, timestamp: true },
      }),
    ]);

    // ─── MRR / ARR ──────────────────────────────────────────────────
    // Active monthly subs contribute MONTHLY_PRICE_INR each per month.
    // Active yearly subs contribute YEARLY_PRICE_INR / 12 per month.
    // We compute this from the live Membership table directly (the
    // status field is kept in sync by the Stripe webhook handler).
    const activeMembershipsAll = await db.membership.findMany({
      where: { status: 'active' },
      select: { plan: true },
    });
    let monthlyActive = 0;
    let yearlyActive = 0;
    for (const m of activeMembershipsAll) {
      if (m.plan === 'yearly') yearlyActive += 1;
      else monthlyActive += 1;
    }
    const mrr =
      monthlyActive * MONTHLY_PRICE_INR +
      Math.round((yearlyActive * YEARLY_PRICE_INR) / 12);
    const arr = mrr * 12;

    // ─── revenue30d — sum of booking prices, last 30 days ───────────
    let revenue30d = 0;
    for (const b of allBookings) {
      if (b.createdAt >= thirtyDaysAgo) {
        revenue30d += parsePrice(b.price);
      }
    }

    // ─── LTV — lifetime value per member ────────────────────────────
    // Total revenue / total members ever. Total revenue = lifetime
    // booking revenue + lifetime membership revenue (estimated by plan
    // — each membership row contributes its plan's annual price once;
    // this is a conservative estimate since renewals would add more).
    const [allTimeBookings, allTimeMemberships] = await Promise.all([
      db.booking.findMany({ select: { price: true } }),
      db.membership.findMany({ select: { plan: true } }),
    ]);
    const lifetimeBookingRevenue = allTimeBookings.reduce(
      (sum, b) => sum + parsePrice(b.price),
      0
    );
    const lifetimeMembershipRevenue = allTimeMemberships.reduce(
      (sum, m) =>
        sum + (m.plan === 'yearly' ? YEARLY_PRICE_INR : MONTHLY_PRICE_INR),
      0
    );
    const totalMembersEver = allTimeMemberships.length;
    const ltv =
      totalMembersEver > 0
        ? Math.round(
            (lifetimeBookingRevenue + lifetimeMembershipRevenue) /
              totalMembersEver
          )
        : 0;

    // ─── Churn rate — last 30 days ──────────────────────────────────
    // # of memberships that transitioned to cancelled/expired in last
    // 30 days (proxy: updatedAt in window + status in churned set) /
    // (# members at risk at start of window: active + churned in window).
    let churned = 0;
    for (const m of allMemberships) {
      if (
        (m.status === 'cancelled' || m.status === 'expired') &&
        m.updatedAt >= thirtyDaysAgo
      ) {
        churned += 1;
      }
    }
    // Active members today + churned in window ≈ the at-risk pool at
    // the start of the window. (Members who joined *during* the window
    // are excluded from churner numerator but included in denominator —
    // a small bias that's fine at AstroKalki's scale.)
    const atRiskPool = monthlyActive + yearlyActive + churned;
    const churnRate =
      atRiskPool > 0 ? Math.round((churned / atRiskPool) * 1000) / 10 : 0;

    // ─── revenueByMonth — last 12 months ────────────────────────────
    const monthBuckets = lastNMonths(12, now);
    const revenueByMonth: RevenueByMonth[] = monthBuckets.map((m) => {
      const label = monthLabel(m);
      const key = monthKey(m);
      let revenue = 0;
      let bookings = 0;
      for (const b of allBookings) {
        if (monthKey(b.createdAt) === key) {
          revenue += parsePrice(b.price);
          bookings += 1;
        }
      }
      let memberships = 0;
      for (const mship of allMemberships) {
        if (monthKey(mship.createdAt) === key) memberships += 1;
      }
      return { month: label, revenue, bookings, memberships };
    });

    // ─── Conversion funnel ──────────────────────────────────────────
    // visitors         = unique sessionIds in window
    // microReadings    = MicroReading rows created in window
    // bookings         = Booking rows created in window
    // completedSessions = Booking rows updated in window with status='completed'
    // memberships      = Membership rows created in window
    const visitorSessions = new Set<string>();
    for (const e of analyticsInWindow) {
      if (e.sessionId) visitorSessions.add(e.sessionId);
    }
    const visitors = visitorSessions.size;
    const microReadings = microReadingsInWindow.length;
    let bookingsInWindow = 0;
    let completedSessions = 0;
    for (const b of allBookings) {
      if (b.createdAt >= from) {
        bookingsInWindow += 1;
        if (b.status === 'completed' && b.updatedAt >= from) {
          completedSessions += 1;
        }
      }
    }
    let membershipsInWindow = 0;
    for (const m of allMemberships) {
      if (m.createdAt >= from) membershipsInWindow += 1;
    }

    const FUNNEL_DEFS: Array<{ step: string; label: string; value: number }> =
      [
        { step: 'visitors', label: 'Visitors', value: visitors },
        { step: 'microReadings', label: 'Micro-Readings', value: microReadings },
        { step: 'bookings', label: 'Bookings', value: bookingsInWindow },
        {
          step: 'completedSessions',
          label: 'Completed Sessions',
          value: completedSessions,
        },
        { step: 'memberships', label: 'Memberships', value: membershipsInWindow },
      ];
    const funnelTop = visitors || 1;
    const steps: FunnelStepOut[] = [];
    let prev = visitors;
    for (const def of FUNNEL_DEFS) {
      const conversionRate = (def.value / funnelTop) * 100;
      const stepRate = prev > 0 ? (def.value / prev) * 100 : 0;
      const dropoffRate = 100 - stepRate;
      steps.push({
        step: def.step,
        label: def.label,
        count: def.value,
        conversionRate: Math.round(conversionRate * 10) / 10,
        stepRate: Math.round(stepRate * 10) / 10,
        dropoffRate: Math.round(dropoffRate * 10) / 10,
      });
      prev = def.value;
    }

    const conversionFunnel: ConversionFunnel = {
      visitors,
      microReadings,
      bookings: bookingsInWindow,
      completedSessions,
      memberships: membershipsInWindow,
      steps,
    };

    // ─── Cohort retention ───────────────────────────────────────────
    // Cohort = memberships grouped by signup month. Retention Nd =
    // (# cohort members whose createdAt is at least Nd days ago AND
    // status is still 'active') / (# cohort members whose createdAt is
    // at least Nd days ago). Returns null when the cohort is too young
    // to have reached that mark yet.
    const cohortBuckets = lastNMonths(12, now);
    const cohorts: Cohort[] = cohortBuckets.map((m) => {
      const label = monthLabel(m);
      const key = monthKey(m);
      const cohortMembers = allMemberships.filter(
        (mship) => monthKey(mship.createdAt) === key
      );
      const size = cohortMembers.length;
      const aged30 = cohortMembers.filter(
        (mship) => now.getTime() - mship.createdAt.getTime() >= 30 * MS_PER_DAY
      );
      const aged60 = cohortMembers.filter(
        (mship) => now.getTime() - mship.createdAt.getTime() >= 60 * MS_PER_DAY
      );
      const aged90 = cohortMembers.filter(
        (mship) => now.getTime() - mship.createdAt.getTime() >= 90 * MS_PER_DAY
      );
      const retained30 = aged30.filter((m) => m.status === 'active').length;
      const retained60 = aged60.filter((m) => m.status === 'active').length;
      const retained90 = aged90.filter((m) => m.status === 'active').length;
      return {
        cohortMonth: label,
        size,
        retention30d:
          aged30.length > 0
            ? Math.round((retained30 / aged30.length) * 1000) / 10
            : null,
        retention60d:
          aged60.length > 0
            ? Math.round((retained60 / aged60.length) * 1000) / 10
            : null,
        retention90d:
          aged90.length > 0
            ? Math.round((retained90 / aged90.length) * 1000) / 10
            : null,
      };
    });

    // ─── Membership growth — last 12 months ─────────────────────────
    const membershipGrowth: MembershipGrowth[] = monthBuckets.map((m) => {
      const label = monthLabel(m);
      const key = monthKey(m);
      let newMembers = 0;
      let cancelledMembers = 0;
      for (const mship of allMemberships) {
        if (monthKey(mship.createdAt) === key) newMembers += 1;
        // Cancelled/expired proxies via updatedAt landing in this month.
        if (
          (mship.status === 'cancelled' || mship.status === 'expired') &&
          monthKey(mship.updatedAt) === key
        ) {
          cancelledMembers += 1;
        }
      }
      return {
        month: label,
        newMembers,
        cancelledMembers,
        netGrowth: newMembers - cancelledMembers,
      };
    });

    const response: RevenueResponse = {
      range: { days, from: from.toISOString(), to: now.toISOString() },
      mrr,
      arr,
      revenue30d,
      ltv,
      churnRate,
      revenueByMonth,
      conversionFunnel,
      cohorts,
      membershipGrowth,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin revenue analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to compute revenue analytics' },
      { status: 500 }
    );
  }
}
