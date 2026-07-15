import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/analytics?days=30
 *
 * Aggregated analytics for the AstroKalki admin dashboard. Auth-gated by
 * middleware (see /src/middleware.ts) — only holders of a valid admin
 * session cookie can reach this handler.
 *
 * Response shape:
 *   {
 *     range: { days, from, to },
 *     funnel: [
 *       { step, label, count, conversionRate, stepRate, dropoffRate }
 *     ],
 *     timeseries: [ { date, section_view, booking_complete, micro_reading, newsletter_signup } ],
 *     topPages: [ { page, views, conversions } ],   // top 10
 *     topEvents: [ { event, count } ],                // all event types
 *     sessions: { total, unique, avgEventsPerSession },
 *     byHour: [ { hour, count } ]                     // 0-23
 *   }
 *
 * Notes:
 *   - The AnalyticsEvent.data column is JSON-encoded text. SQLite stores
 *     it as TEXT, so we parse it in JS (no JSON1 functions needed).
 *   - For "micro_reading_complete" we look at the data payload for a
 *     `complete: true` flag (the tracking layer attaches it when a user
 *     finishes the micro-reading flow rather than bailing at step 1).
 *   - All time-bucketing is done in JS using the timestamp field so we
 *     avoid SQLite/Prisma date-function quirks.
 */

// ─── Types ───────────────────────────────────────────────────────────

interface FunnelStep {
  step: string;
  label: string;
  count: number;
  conversionRate: number; // % of step 0 (overall conversion)
  stepRate: number;       // % of previous step
  dropoffRate: number;    // 100 - stepRate
}

interface TimeseriesPoint {
  date: string; // ISO yyyy-mm-dd
  section_view: number;
  booking_complete: number;
  micro_reading: number;
  newsletter_signup: number;
}

interface TopPage {
  page: string;
  views: number;
  conversions: number;
}

interface TopEvent {
  event: string;
  count: number;
}

interface SessionStats {
  total: number;
  unique: number;
  avgEventsPerSession: number;
}

interface ByHour {
  hour: number;
  count: number;
}

interface AnalyticsResponse {
  range: { days: number; from: string; to: string };
  funnel: FunnelStep[];
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topEvents: TopEvent[];
  sessions: SessionStats;
  byHour: ByHour[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

const FUNNEL_DEFS: Array<{ step: string; label: string }> = [
  { step: 'section_view', label: 'Section View' },
  { step: 'micro_reading', label: 'Micro-Reading Started' },
  { step: 'micro_reading_complete', label: 'Micro-Reading Complete' },
  { step: 'booking_start', label: 'Booking Started' },
  { step: 'booking_complete', label: 'Booking Complete' },
  { step: 'newsletter_signup', label: 'Newsletter Signup' },
];

const CONVERSION_EVENTS = new Set([
  'booking_complete',
  'newsletter_signup',
]);

/** Parse the JSON `data` field safely. Returns {} on any error. */
function parseData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Local-date key (yyyy-mm-dd) from a Date, using system TZ. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Route handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Parse ?days= param — clamp to 1..365, default 30
    const daysParam = request.nextUrl.searchParams.get('days');
    let days = 30;
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 365) {
        days = parsed;
      }
    }

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    // Pull every event in the window. We need raw rows to derive
    // micro_reading_complete from the data payload, and to compute
    // per-day timeseries in JS. For very high-traffic deployments
    // this should be replaced with a pre-aggregated rollup table,
    // but for AstroKalki's volume (~hundreds-thousands of events /
    // 90 days) this is fine and keeps the query surface simple.
    const events = await db.analyticsEvent.findMany({
      where: { timestamp: { gte: from, lte: to } },
      select: {
        event: true,
        data: true,
        page: true,
        timestamp: true,
        sessionId: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // ─── Per-event-type counts (used by funnel + topEvents) ─────────
    const eventCounts = new Map<string, number>();
    let microReadingCompleteCount = 0;

    for (const e of events) {
      eventCounts.set(e.event, (eventCounts.get(e.event) ?? 0) + 1);

      if (e.event === 'micro_reading') {
        const payload = parseData(e.data);
        // Treat `complete: true` OR `step: "complete"` as completed.
        const isComplete =
          payload.complete === true ||
          payload.completed === true ||
          payload.step === 'complete' ||
          payload.step === 'done';
        if (isComplete) microReadingCompleteCount += 1;
      }
    }

    // ─── Funnel ──────────────────────────────────────────────────────
    const stepCounts: Record<string, number> = {
      section_view: eventCounts.get('section_view') ?? 0,
      micro_reading: eventCounts.get('micro_reading') ?? 0,
      micro_reading_complete: microReadingCompleteCount,
      booking_start: eventCounts.get('booking_start') ?? 0,
      booking_complete: eventCounts.get('booking_complete') ?? 0,
      newsletter_signup: eventCounts.get('newsletter_signup') ?? 0,
    };

    const funnel: FunnelStep[] = [];
    const funnelTop = stepCounts.section_view || 1;
    let prev = stepCounts.section_view;
    for (const def of FUNNEL_DEFS) {
      const count = stepCounts[def.step] ?? 0;
      const conversionRate = (count / funnelTop) * 100;
      const stepRate = prev > 0 ? (count / prev) * 100 : 0;
      const dropoffRate = 100 - stepRate;
      funnel.push({
        step: def.step,
        label: def.label,
        count,
        conversionRate: Math.round(conversionRate * 10) / 10,
        stepRate: Math.round(stepRate * 10) / 10,
        dropoffRate: Math.round(dropoffRate * 10) / 10,
      });
      prev = count;
    }

    // ─── Timeseries (daily buckets) ──────────────────────────────────
    const seriesMap = new Map<string, TimeseriesPoint>();
    // Pre-seed every day in the range so charts don't collapse sparse
    // windows into a single bar.
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      seriesMap.set(dateKey(d), {
        date: dateKey(d),
        section_view: 0,
        booking_complete: 0,
        micro_reading: 0,
        newsletter_signup: 0,
      });
    }

    for (const e of events) {
      const key = dateKey(e.timestamp);
      const bucket = seriesMap.get(key);
      if (!bucket) continue;
      if (e.event === 'section_view') bucket.section_view += 1;
      else if (e.event === 'booking_complete') bucket.booking_complete += 1;
      else if (e.event === 'micro_reading') bucket.micro_reading += 1;
      else if (e.event === 'newsletter_signup') bucket.newsletter_signup += 1;
    }

    const timeseries: TimeseriesPoint[] = Array.from(seriesMap.values()).sort(
      (a, b) => (a.date < b.date ? -1 : 1)
    );

    // ─── Top pages (views + conversion events) ───────────────────────
    const pageStats = new Map<string, { views: number; conversions: number }>();
    for (const e of events) {
      const page = e.page || '/';
      const stat = pageStats.get(page) ?? { views: 0, conversions: 0 };
      if (e.event === 'section_view') stat.views += 1;
      if (CONVERSION_EVENTS.has(e.event)) stat.conversions += 1;
      pageStats.set(page, stat);
    }
    const topPages: TopPage[] = Array.from(pageStats.entries())
      .map(([page, s]) => ({ page, ...s }))
      .sort((a, b) => b.views - a.views || b.conversions - a.conversions)
      .slice(0, 10);

    // ─── Top events (all types, by count) ────────────────────────────
    const topEvents: TopEvent[] = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

    // ─── Session stats ───────────────────────────────────────────────
    const sessionEventCounts = new Map<string, number>();
    for (const e of events) {
      if (!e.sessionId) continue;
      sessionEventCounts.set(
        e.sessionId,
        (sessionEventCounts.get(e.sessionId) ?? 0) + 1
      );
    }
    const totalSessions = sessionEventCounts.size;
    // "total" = sum of events across all sessions (= events.length
    // filtered to those that had a sessionId). We expose both the
    // raw event count and the unique-session count.
    const sessionsWithEvents = events.filter((e) => e.sessionId).length;
    const avgEventsPerSession =
      totalSessions > 0
        ? Math.round((sessionsWithEvents / totalSessions) * 10) / 10
        : 0;

    const sessions: SessionStats = {
      total: sessionsWithEvents,
      unique: totalSessions,
      avgEventsPerSession,
    };

    // ─── By hour-of-day (0-23) ───────────────────────────────────────
    const hourBuckets: ByHour[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
    }));
    for (const e of events) {
      hourBuckets[e.timestamp.getHours()].count += 1;
    }

    const response: AnalyticsResponse = {
      range: {
        days,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      funnel,
      timeseries,
      topPages,
      topEvents,
      sessions,
      byHour: hourBuckets,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to compute analytics' },
      { status: 500 }
    );
  }
}
