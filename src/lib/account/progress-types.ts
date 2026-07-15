/**
 * Shared types for the member-facing progress dashboard.
 *
 * Lives in /src/lib/account/ (not in the route.ts) so it can be imported by
 * both the API route handler and the client components without tripping
 * Next.js App Router's route-file export rules.
 */

export interface PatternIdentified {
  pattern: string;
  date: string;
  source: 'micro-reading' | 'chart-analysis';
}

export interface JournalMoodDay {
  /** YYYY-MM-DD local date key */
  date: string;
  mood: string | null;
  energy: number | null;
}

export interface MonthlyActivityPoint {
  /** 'YYYY-MM' */
  month: string;
  /** Short month label, e.g. 'Jul' */
  label: string;
  sessions: number;
  journals: number;
  readings: number;
}

export interface PatternDistributionPoint {
  /** normalized pattern slug */
  pattern: string;
  count: number;
}

export type RecentActivityType =
  | 'session-completed'
  | 'session-booked'
  | 'micro-reading'
  | 'chart-analysis'
  | 'portrait'
  | 'journal-entry'
  | 'course-enrolled'
  | 'course-completed'
  | 'ai-conversation';

export interface RecentActivityItem {
  type: RecentActivityType;
  date: string;
  description: string;
  href?: string;
}

export interface MilestoneOutput {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

export interface ProgressData {
  user: { email: string; name: string | null };
  sessionsCompleted: number;
  sessionsTotal: number;
  nextSession: {
    scheduledAt: string;
    duration: number;
    status: string;
  } | null;
  patternsIdentified: PatternIdentified[];
  journalStreak: number;
  longestJournalStreak: number;
  journalTotal: number;
  journalLast30: number;
  journalMood30: JournalMoodDay[];
  chartAnalyses: number;
  portraits: number;
  courseProgress: {
    enrolled: boolean;
    stage: number;
    completed: boolean;
    completedAt: string | null;
  } | null;
  aiConversations: number;
  memberSince: string | null;
  memberDays: number;
  firstMicroReadingAt: string | null;
  firstBookingCompletedAt: string | null;
  firstChartAnalysisAt: string | null;
  firstPortraitAt: string | null;
  microReadingsTotal: number;
  distinctPatternsIdentified: number;
  monthlyActivity: MonthlyActivityPoint[];
  patternDistribution: PatternDistributionPoint[];
  recentActivity: RecentActivityItem[];
  milestones: MilestoneOutput[];
}
