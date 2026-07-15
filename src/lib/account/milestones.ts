/**
 * Milestone logic for the member-facing progress dashboard.
 *
 * A milestone is a small, emotionally-resonant recognition of a member's
 * progress through the AstroKalki work. Earned milestones appear as gold
 * badges in the dashboard; unearned ones appear muted with a lock icon —
 * a quiet invitation, not a gamified nudge.
 *
 * `computeMilestones(progress)` is a pure function — no DB access, no I/O.
 * The progress API route assembles the ProgressData object (with all the
 * dates and counts), then calls this to attach the milestone list.
 *
 * Adding a milestone:
 *   1. Add an entry to MILESTONE_DEFS (id, title, description).
 *   2. Add the matching `earned` + `earnedAt` logic inside computeMilestones.
 *
 * Design notes:
 *   - "earnedAt" is the date the milestone was earned (ISO string) — used
 *     by the UI to show "Earned on …" or sort milestones chronologically.
 *   - The function never throws — every milestone resolves to either
 *     { earned: true, earnedAt } or { earned: false }. This makes the
 *     UI bullet-proof even if a future field is missing.
 */

export interface Milestone {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

/**
 * The progress-shape this function consumes. Mirrors the API response minus
 * the milestones array itself (we compute that here so the API doesn't have
 * to duplicate the logic).
 */
export interface MilestoneProgressInput {
  /** Earliest first-micro-reading date for this member (ISO or null). */
  firstMicroReadingAt?: string | null;
  /** Earliest completed-booking date for this member (ISO or null). */
  firstBookingCompletedAt?: string | null;
  /** Earliest chart-analysis date for this member (ISO or null). */
  firstChartAnalysisAt?: string | null;
  /** Earliest pattern-portrait date for this member (ISO or null). */
  firstPortraitAt?: string | null;
  /** Distinct atlas-pattern count identified across micro-readings + charts. */
  distinctPatternsIdentified: number;
  /** Total completed sessions. */
  sessionsCompleted: number;
  /** Total micro-readings captured. */
  microReadingsTotal: number;
  /** Longest run of consecutive days with a journal entry. */
  longestJournalStreak: number;
  /** Total journal entries ever written. */
  journalTotal: number;
  /** Total chart analyses. */
  chartAnalyses: number;
  /** Total pattern portraits generated. */
  portraits: number;
  /** Total AI chat conversations. */
  aiConversations: number;
  /** Whether the 5-day email course was completed. */
  courseCompleted: boolean;
  /** When the email course was completed (ISO or null). */
  courseCompletedAt?: string | null;
  /** Member-since date (earliest creation across all member rows, ISO or null). */
  memberSince?: string | null;
  /** Number of days the member has been with AstroKalki. */
  memberDays: number;
}

interface MilestoneDef {
  id: string;
  title: string;
  description: string;
}

const MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: "first-pattern",
    title: "First Pattern Identified",
    description:
      "You completed your first micro-reading. The pattern beneath your experience was named.",
  },
  {
    id: "week-one",
    title: "Week One",
    description: "Seven consecutive days of journaling. The practice has begun to take root.",
  },
  {
    id: "first-session",
    title: "First Session",
    description: "You completed your first AstroKalki session. The architecture is now visible.",
  },
  {
    id: "pattern-explorer",
    title: "Pattern Explorer",
    description: "Three or more distinct patterns identified. The web is showing itself.",
  },
  {
    id: "chart-mapped",
    title: "Chart Mapped",
    description: "Your birth chart was uploaded and read by the VLM. The map is yours now.",
  },
  {
    id: "portrait-created",
    title: "Portrait Created",
    description: "You generated your first Pattern Portrait — the pattern made visible.",
  },
  {
    id: "course-graduate",
    title: "Course Graduate",
    description: "You completed the five-day email course. The foundations are laid.",
  },
  {
    id: "deep-diver",
    title: "Deep Diver",
    description: "Ten or more conversations with the AI. You did not stop at the surface.",
  },
  {
    id: "month-one",
    title: "Month One",
    description: "Thirty days as a member. You stayed with the work.",
  },
  {
    id: "consistent",
    title: "Consistent",
    description: "Thirty journal entries. The practice is no longer occasional.",
  },
];

/**
 * Compute the full milestone list for a member, sorted: earned first
 * (most-recently-earned first), then unearned (in definition order).
 */
export function computeMilestones(
  progress: MilestoneProgressInput
): Milestone[] {
  const earned: Array<Milestone & { earnedAt?: string; sortTime: number }> = [];
  const unearned: Milestone[] = [];

  for (const def of MILESTONE_DEFS) {
    const result = evaluateMilestone(def, progress);
    if (result.earned) {
      const t = safeTime(result.earnedAt) || safeTime(progress.memberSince) || Date.now();
      earned.push({ ...result, sortTime: t });
    } else {
      unearned.push(result);
    }
  }

  // Earned: most-recently-earned first.
  earned.sort((a, b) => b.sortTime - a.sortTime);

  return [
    ...earned.map(({ sortTime: _sortTime, ...rest }) => rest),
    ...unearned,
  ];
}

function evaluateMilestone(
  def: MilestoneDef,
  p: MilestoneProgressInput
): Milestone {
  switch (def.id) {
    case "first-pattern": {
      const earned = p.microReadingsTotal >= 1;
      return {
        ...def,
        earned,
        earnedAt: earned ? (p.firstMicroReadingAt ?? undefined) : undefined,
      };
    }
    case "week-one": {
      const earned = p.longestJournalStreak >= 7;
      return { ...def, earned };
    }
    case "first-session": {
      const earned = p.sessionsCompleted >= 1;
      return {
        ...def,
        earned,
        earnedAt: earned
          ? (p.firstBookingCompletedAt ?? undefined)
          : undefined,
      };
    }
    case "pattern-explorer": {
      const earned = p.distinctPatternsIdentified >= 3;
      return { ...def, earned };
    }
    case "chart-mapped": {
      const earned = p.chartAnalyses >= 1;
      return {
        ...def,
        earned,
        earnedAt: earned ? (p.firstChartAnalysisAt ?? undefined) : undefined,
      };
    }
    case "portrait-created": {
      const earned = p.portraits >= 1;
      return {
        ...def,
        earned,
        earnedAt: earned ? (p.firstPortraitAt ?? undefined) : undefined,
      };
    }
    case "course-graduate": {
      const earned = p.courseCompleted;
      return {
        ...def,
        earned,
        earnedAt: earned ? (p.courseCompletedAt ?? undefined) : undefined,
      };
    }
    case "deep-diver": {
      const earned = p.aiConversations >= 10;
      return { ...def, earned };
    }
    case "month-one": {
      const earned = p.memberDays >= 30;
      return { ...def, earned };
    }
    case "consistent": {
      const earned = p.journalTotal >= 30;
      return { ...def, earned };
    }
    default:
      return { ...def, earned: false };
  }
}

function safeTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Total count of milestones defined — handy for "X / N earned" badges
 * in the UI without re-deriving the list.
 */
export const MILESTONE_TOTAL = MILESTONE_DEFS.length;
