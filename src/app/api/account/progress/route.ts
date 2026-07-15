import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  computeMilestones,
  type MilestoneProgressInput,
} from '@/lib/account/milestones';
import type {
  ProgressData,
  PatternIdentified,
  JournalMoodDay,
  MonthlyActivityPoint,
  PatternDistributionPoint,
  RecentActivityItem,
} from '@/lib/account/progress-types';

/**
 * GET /api/account/progress
 *
 * Aggregated progress data for the logged-in member's "your journey" dashboard.
 * Auth-gated via NextAuth session — returns 401 JSON if no session, and never
 * exposes other members' rows (every query is scoped by the session email).
 *
 * No new database models were needed — this aggregates from the existing
 * Booking, MicroReading, JournalEntry, ChartAnalysis, PatternPortrait,
 * EmailCourseEnrollment, and ChatConversation tables.
 *
 * Response shape (ProgressData):
 *   user: { email, name }
 *   sessionsCompleted, sessionsTotal, nextSession
 *   patternsIdentified: [{ pattern, date, source }]
 *   journalStreak, journalTotal, journalLast30, journalMood30
 *   chartAnalyses, portraits
 *   courseProgress: { enrolled, stage, completed, completedAt } | null
 *   aiConversations
 *   memberSince (ISO), memberDays
 *   firstMicroReadingAt, firstBookingCompletedAt, firstChartAnalysisAt,
 *     firstPortraitAt
 *   longestJournalStreak, microReadingsTotal, distinctPatternsIdentified
 *   monthlyActivity: [{ month, sessions, journals, readings }]
 *   patternDistribution: [{ pattern, count }]
 *   recentActivity: [{ type, date, description, href? }]
 *   milestones: [{ id, title, description, earned, earnedAt? }]
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Types ───────────────────────────────────────────────────────────

// All shared response types live in /src/lib/account/progress-types.ts
// so the route handler and the client components can import them
// without tripping Next.js App Router's route-file export rules.

interface MilestoneOutput {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Local YYYY-MM-DD key (no timezone shift). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local YYYY-MM key. */
function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function shortMonthLabel(monthKey: string): string {
  const [, mStr] = monthKey.split('-');
  const m = parseInt(mStr, 10);
  return (
    [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ][m - 1] || monthKey
  );
}

/** Build a 6-month window ending in the current month, pre-seeded with zeros. */
function build6MonthWindow(): MonthlyActivityPoint[] {
  const now = new Date();
  const points: MonthlyActivityPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    points.push({
      month: k,
      label: shortMonthLabel(k),
      sessions: 0,
      journals: 0,
      readings: 0,
    });
  }
  return points;
}

/**
 * Compute the current consecutive-day streak from a list of YYYY-MM-DD keys.
 * Streak counts back from today (or the most recent entry if today has none).
 * Returns 0 if the entries array is empty.
 */
function computeCurrentStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const set = new Set(dayKeys);
  // Walk back from today; if today has no entry, start from yesterday
  // (a streak is not broken by not having written yet today).
  let streak = 0;
  const cursor = new Date();
  // If today missing, step back one day so a streak that ended yesterday
  // is still counted as the current streak (not zeroed).
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Compute the LONGEST consecutive-day streak from a list of YYYY-MM-DD keys.
 */
function computeLongestStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const sorted = Array.from(new Set(dayKeys)).sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

/** Parse the ChartAnalysis.identifiedPatterns JSON-stringified array. */
function parseChartPatterns(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

/** Normalize a pattern string to lowercase slug-form for grouping. */
function normalizePatternKey(p: string): string {
  return p.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Best-effort parse of a Booking.contexts JSON string -> string[]. */
function parseContexts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

// ─── Handler ─────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required.' },
      { status: 401 }
    );
  }

  const email = session.user.email;
  const name = session.user.name || null;

  try {
    // ─── Parallel fetch across all 7 models ─────────────────────────
    const [
      bookings,
      microReadings,
      journalEntries,
      chartAnalyses,
      portraits,
      courseEnrollment,
      chatConversations,
      membership,
    ] = await Promise.all([
      db.booking.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          duration: true,
          scheduledAt: true,
          createdAt: true,
          contexts: true,
        },
      }),
      db.microReading.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          emotionalPattern: true,
          createdAt: true,
        },
      }),
      db.journalEntry.findMany({
        where: { email },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          mood: true,
          energy: true,
          pattern: true,
          createdAt: true,
        },
      }),
      db.chartAnalysis.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          identifiedPatterns: true,
          createdAt: true,
        },
      }),
      db.patternPortrait.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          pattern: true,
          createdAt: true,
        },
      }),
      db.emailCourseEnrollment.findUnique({
        where: { email },
        select: {
          stage: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      db.chatConversation.count({
        where: { email },
      }),
      db.membership.findFirst({
        where: { email },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    // ─── Sessions ────────────────────────────────────────────────────
    const sessionsCompleted = bookings.filter(
      (b) => b.status === 'completed'
    ).length;
    const sessionsTotal = bookings.length;

    // Next upcoming session: status confirmed|pending + scheduledAt in future.
    const now = new Date();
    const upcoming = bookings
      .filter(
        (b) =>
          (b.status === 'confirmed' || b.status === 'pending') &&
          b.scheduledAt &&
          b.scheduledAt > now
      )
      .sort((a, b) => {
        const aT = a.scheduledAt?.getTime() ?? 0;
        const bT = b.scheduledAt?.getTime() ?? 0;
        return aT - bT;
      });
    const nextSession = upcoming[0]
      ? {
          scheduledAt: upcoming[0].scheduledAt!.toISOString(),
          duration: upcoming[0].duration,
          status: upcoming[0].status,
        }
      : null;

    const firstBookingCompletedAt =
      bookings
        .filter((b) => b.status === 'completed')
        .map((b) => b.createdAt)
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString() ?? null;

    // ─── Patterns identified (micro-reading + chart-analysis) ────────
    const patternsIdentified: PatternIdentified[] = [
      ...microReadings
        .filter((m) => m.emotionalPattern)
        .map((m) => ({
          pattern: m.emotionalPattern,
          date: m.createdAt.toISOString(),
          source: 'micro-reading' as const,
        })),
      ...chartAnalyses.flatMap((c) =>
        parseChartPatterns(c.identifiedPatterns).map((p) => ({
          pattern: p,
          date: c.createdAt.toISOString(),
          source: 'chart-analysis' as const,
        }))
      ),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const distinctPatternKeys = new Set(
      patternsIdentified.map((p) => normalizePatternKey(p.pattern))
    );
    const distinctPatternsIdentified = distinctPatternKeys.size;

    const firstMicroReadingAt =
      microReadings
        .map((m) => m.createdAt)
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString() ?? null;

    // ─── Journal ─────────────────────────────────────────────────────
    const journalTotal = journalEntries.length;
    const last30Cutoff = new Date();
    last30Cutoff.setDate(last30Cutoff.getDate() - 29); // include today + 29 prior days
    last30Cutoff.setHours(0, 0, 0, 0);

    const last30Entries = journalEntries.filter((e) => {
      const d = new Date(e.date);
      return d >= last30Cutoff;
    });
    const journalLast30 = last30Entries.length;

    // Mood calendar: most-recent entry per day, last 30 days.
    // Build a 30-day window from today backwards.
    const moodByDay = new Map<string, JournalMoodDay>();
    for (const e of last30Entries) {
      const k = dayKey(new Date(e.date));
      // Entries are sorted desc by date, so the first occurrence per day
      // is the most recent. Skip if already filled.
      if (!moodByDay.has(k)) {
        moodByDay.set(k, {
          date: k,
          mood: e.mood || null,
          energy: typeof e.energy === 'number' ? e.energy : null,
        });
      }
    }
    const journalMood30: JournalMoodDay[] = [];
    const cursor = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      journalMood30.push(
        moodByDay.get(k) || { date: k, mood: null, energy: null }
      );
    }

    const journalDayKeys = journalEntries.map((e) => dayKey(new Date(e.date)));
    const journalStreak = computeCurrentStreak(journalDayKeys);
    const longestJournalStreak = computeLongestStreak(journalDayKeys);

    // ─── Chart analyses ──────────────────────────────────────────────
    const chartAnalysesCount = chartAnalyses.length;
    const firstChartAnalysisAt =
      chartAnalyses
        .map((c) => c.createdAt)
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString() ?? null;

    // ─── Portraits ───────────────────────────────────────────────────
    const portraitsCount = portraits.length;
    const firstPortraitAt =
      portraits
        .map((p) => p.createdAt)
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString() ?? null;

    // ─── Course ──────────────────────────────────────────────────────
    // stage 6 == complete per the schema comment.
    const courseProgress = courseEnrollment
      ? {
          enrolled: true,
          stage: courseEnrollment.stage,
          completed: courseEnrollment.stage >= 6 || !!courseEnrollment.completedAt,
          completedAt: courseEnrollment.completedAt?.toISOString() ?? null,
        }
      : null;

    // ─── AI conversations ────────────────────────────────────────────
    const aiConversations = chatConversations;

    // ─── Member since + days ─────────────────────────────────────────
    // Earliest createdAt across all member-related tables.
    const candidateDates: Date[] = [];
    if (membership?.createdAt) candidateDates.push(membership.createdAt);
    for (const b of bookings) candidateDates.push(b.createdAt);
    for (const m of microReadings) candidateDates.push(m.createdAt);
    for (const j of journalEntries) candidateDates.push(j.createdAt);
    for (const c of chartAnalyses) candidateDates.push(c.createdAt);
    for (const p of portraits) candidateDates.push(p.createdAt);
    if (courseEnrollment?.createdAt) candidateDates.push(courseEnrollment.createdAt);

    const memberSince = candidateDates.length
      ? new Date(
          candidateDates
            .map((d) => d.getTime())
            .sort((a, b) => a - b)[0]
        ).toISOString()
      : null;

    const memberDays = memberSince
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(memberSince).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    // ─── Monthly activity (last 6 months) ────────────────────────────
    const monthlyActivity = build6MonthWindow();
    const monthlyIndex = new Map(monthlyActivity.map((p, i) => [p.month, i]));

    function bumpMonth(d: Date, field: 'sessions' | 'journals' | 'readings') {
      const k = monthKey(d);
      const idx = monthlyIndex.get(k);
      if (idx !== undefined) monthlyActivity[idx][field] += 1;
    }

    for (const b of bookings) {
      if (b.status === 'completed') bumpMonth(b.createdAt, 'sessions');
    }
    for (const j of journalEntries) bumpMonth(new Date(j.date), 'journals');
    for (const m of microReadings) bumpMonth(m.createdAt, 'readings');

    // ─── Pattern distribution (donut chart) ──────────────────────────
    // Combine pattern occurrences from: micro-readings, chart analyses,
    // journal entries (where set), and pattern portraits.
    const patternCounts = new Map<string, number>();
    function bumpPattern(raw: string) {
      const k = normalizePatternKey(raw);
      if (!k) return;
      patternCounts.set(k, (patternCounts.get(k) || 0) + 1);
    }
    for (const m of microReadings) {
      if (m.emotionalPattern) bumpPattern(m.emotionalPattern);
    }
    for (const c of chartAnalyses) {
      for (const p of parseChartPatterns(c.identifiedPatterns)) bumpPattern(p);
    }
    for (const j of journalEntries) {
      if (j.pattern) bumpPattern(j.pattern);
    }
    for (const p of portraits) {
      if (p.pattern) bumpPattern(p.pattern);
    }
    const patternDistribution: PatternDistributionPoint[] = Array.from(
      patternCounts.entries()
    )
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // top 8 to keep the donut legible

    // ─── Recent activity timeline ────────────────────────────────────
    const recentActivity: RecentActivityItem[] = [];
    for (const b of bookings) {
      const isComplete = b.status === 'completed';
      recentActivity.push({
        type: isComplete ? 'session-completed' : 'session-booked',
        date: b.createdAt.toISOString(),
        description: isComplete
          ? `Completed ${b.duration}-minute session`
          : `Booked ${b.duration}-minute session`,
      });
    }
    for (const m of microReadings) {
      recentActivity.push({
        type: 'micro-reading',
        date: m.createdAt.toISOString(),
        description: m.emotionalPattern
          ? `Micro-reading identified: ${m.emotionalPattern}`
          : 'Completed a micro-reading',
        href: '/patterns/atlas',
      });
    }
    for (const c of chartAnalyses) {
      recentActivity.push({
        type: 'chart-analysis',
        date: c.createdAt.toISOString(),
        description: 'Birth chart uploaded and analyzed',
      });
    }
    for (const p of portraits) {
      recentActivity.push({
        type: 'portrait',
        date: p.createdAt.toISOString(),
        description: p.pattern
          ? `Pattern portrait generated: ${p.pattern}`
          : 'Pattern portrait generated',
      });
    }
    for (const j of journalEntries) {
      recentActivity.push({
        type: 'journal-entry',
        date: new Date(j.date).toISOString(),
        description: j.mood
          ? `Journal entry written — mood: ${j.mood}`
          : 'Journal entry written',
      });
    }
    if (courseEnrollment) {
      recentActivity.push({
        type: 'course-enrolled',
        date: courseEnrollment.createdAt.toISOString(),
        description: 'Enrolled in the 5-day email course',
      });
      if (courseEnrollment.completedAt) {
        recentActivity.push({
          type: 'course-completed',
          date: courseEnrollment.completedAt.toISOString(),
          description: 'Completed the 5-day email course',
        });
      }
    }
    // Sort by date desc, take 10.
    recentActivity.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const recentActivityTop = recentActivity.slice(0, 10);

    // ─── Milestones ──────────────────────────────────────────────────
    const milestoneInput: MilestoneProgressInput = {
      firstMicroReadingAt,
      firstBookingCompletedAt,
      firstChartAnalysisAt,
      firstPortraitAt,
      distinctPatternsIdentified,
      sessionsCompleted,
      microReadingsTotal: microReadings.length,
      longestJournalStreak,
      journalTotal,
      chartAnalyses: chartAnalysesCount,
      portraits: portraitsCount,
      aiConversations,
      courseCompleted: courseProgress?.completed ?? false,
      courseCompletedAt: courseProgress?.completedAt ?? null,
      memberSince,
      memberDays,
    };
    const milestones = computeMilestones(milestoneInput).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      earned: m.earned,
      ...(m.earnedAt ? { earnedAt: m.earnedAt } : {}),
    })) satisfies MilestoneOutput[];

    // ─── Assemble response ───────────────────────────────────────────
    const data: ProgressData = {
      user: { email, name },
      sessionsCompleted,
      sessionsTotal,
      nextSession,
      patternsIdentified,
      journalStreak,
      longestJournalStreak,
      journalTotal,
      journalLast30,
      journalMood30,
      chartAnalyses: chartAnalysesCount,
      portraits: portraitsCount,
      courseProgress,
      aiConversations,
      memberSince,
      memberDays,
      firstMicroReadingAt,
      firstBookingCompletedAt,
      firstChartAnalysisAt,
      firstPortraitAt,
      microReadingsTotal: microReadings.length,
      distinctPatternsIdentified,
      monthlyActivity,
      patternDistribution,
      recentActivity: recentActivityTop,
      milestones,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('[api/account/progress] aggregation failed:', err);
    return NextResponse.json(
      { error: 'Could not load your progress.' },
      { status: 500 }
    );
  }
}
