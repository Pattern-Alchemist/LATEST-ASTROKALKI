/**
 * Section Engagement Tracking
 * 
 * Tracks which dashboard sections users interact with most.
 * Uses localStorage to persist engagement data across sessions.
 * Reorders dashboard content based on engagement scores.
 */

export type SectionId = 
  | 'mood-trends'
  | 'pattern-timeline'
  | 'pattern-calendar'
  | 'client-dashboard'
  | 'insights'
  | 'sessions'
  | 'community';

interface SectionEngagement {
  id: SectionId;
  clicks: number;
  views: number;
  timeSpent: number; // seconds
  lastInteractedAt: number; // timestamp
}

const STORAGE_KEY = 'astrokalki_section_engagement';
const ENGAGEMENT_DECAY = 0.95; // Daily decay factor for older interactions

export function initializeSectionEngagement(): Map<SectionId, SectionEngagement> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return new Map(Object.entries(data) as [SectionId, SectionEngagement][]);
    } catch {
      return getDefaultEngagement();
    }
  }
  return getDefaultEngagement();
}

function getDefaultEngagement(): Map<SectionId, SectionEngagement> {
  const sections: SectionId[] = [
    'mood-trends',
    'pattern-timeline',
    'pattern-calendar',
    'client-dashboard',
  ];

  const map = new Map<SectionId, SectionEngagement>();
  sections.forEach(id => {
    map.set(id, {
      id,
      clicks: 0,
      views: 0,
      timeSpent: 0,
      lastInteractedAt: 0,
    });
  });

  return map;
}

export function trackSectionView(sectionId: SectionId): void {
  const engagement = initializeSectionEngagement();
  const section = engagement.get(sectionId) || { 
    id: sectionId, 
    clicks: 0, 
    views: 0, 
    timeSpent: 0, 
    lastInteractedAt: 0 
  };

  section.views += 1;
  section.lastInteractedAt = Date.now();

  engagement.set(sectionId, section);
  saveSectionEngagement(engagement);
}

export function trackSectionClick(sectionId: SectionId): void {
  const engagement = initializeSectionEngagement();
  const section = engagement.get(sectionId) || { 
    id: sectionId, 
    clicks: 0, 
    views: 0, 
    timeSpent: 0, 
    lastInteractedAt: 0 
  };

  section.clicks += 1;
  section.lastInteractedAt = Date.now();

  engagement.set(sectionId, section);
  saveSectionEngagement(engagement);
}

export function trackSectionTimeSpent(sectionId: SectionId, seconds: number): void {
  const engagement = initializeSectionEngagement();
  const section = engagement.get(sectionId) || { 
    id: sectionId, 
    clicks: 0, 
    views: 0, 
    timeSpent: 0, 
    lastInteractedAt: 0 
  };

  section.timeSpent += seconds;
  section.lastInteractedAt = Date.now();

  engagement.set(sectionId, section);
  saveSectionEngagement(engagement);
}

function saveSectionEngagement(engagement: Map<SectionId, SectionEngagement>): void {
  const obj = Object.fromEntries(engagement);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

export function calculateEngagementScore(section: SectionEngagement): number {
  // Weighted score based on multiple factors
  const clickScore = section.clicks * 10;
  const viewScore = section.views * 2;
  const timeScore = Math.min(section.timeSpent / 60, 50); // Cap at 50 points for 1+ hour

  // Apply recency decay — recent interactions weighted higher
  const now = Date.now();
  const daysSinceInteraction = (now - section.lastInteractedAt) / (1000 * 60 * 60 * 24);
  const recencyMultiplier = Math.pow(ENGAGEMENT_DECAY, daysSinceInteraction);

  const baseScore = clickScore + viewScore + timeScore;
  return baseScore * recencyMultiplier;
}

export function getSortedSectionsByEngagement(): SectionEngagement[] {
  const engagement = initializeSectionEngagement();
  const sections = Array.from(engagement.values());

  return sections.sort((a, b) => {
    const scoreA = calculateEngagementScore(a);
    const scoreB = calculateEngagementScore(b);
    return scoreB - scoreA;
  });
}

export function getEngagementStats(): { 
  totalInteractions: number; 
  mostEngaged: SectionId | null; 
  averageScore: number 
} {
  const engagement = initializeSectionEngagement();
  const sections = Array.from(engagement.values());
  const scores = sections.map(calculateEngagementScore);

  const totalInteractions = sections.reduce((sum, s) => sum + s.clicks + s.views, 0);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
  const mostEngaged = sections.length > 0 
    ? sections.reduce((max, s) => 
        calculateEngagementScore(s) > calculateEngagementScore(max) ? s : max
      ).id 
    : null;

  return { totalInteractions, mostEngaged, averageScore };
}

export function clearEngagementData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
