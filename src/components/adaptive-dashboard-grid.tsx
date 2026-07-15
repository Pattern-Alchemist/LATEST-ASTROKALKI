'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getSortedSectionsByEngagement,
  calculateEngagementScore,
  SectionId,
} from '@/lib/section-engagement';
import { useSectionEngagement } from '@/hooks/use-section-engagement';

interface DashboardCard {
  id: SectionId;
  label: string;
  category: string;
  title: string;
  description: string;
  href?: string;
  isAvailable: boolean;
  icon?: string;
}

const DASHBOARD_CARDS: Record<SectionId, DashboardCard> = {
  'mood-trends': {
    id: 'mood-trends',
    label: 'Analytics',
    category: 'Mood Trends',
    title: 'Mood Trends',
    description:
      'Visualize which patterns are most active. See intensity curves, distribution across time, and identify your top recurring patterns.',
    href: '/dashboard/mood-trends',
    isAvailable: true,
  },
  'pattern-timeline': {
    id: 'pattern-timeline',
    label: 'Visualization',
    category: 'Pattern Timeline',
    title: 'Pattern Timeline',
    description:
      'An interactive D3.js timeline of your pattern journey. See sessions, insights, journal entries, and milestones mapped to your patterns.',
    href: '/dashboard/timeline',
    isAvailable: true,
  },
  'pattern-calendar': {
    id: 'pattern-calendar',
    label: 'Calendar',
    category: 'Pattern Calendar',
    title: 'Pattern Calendar',
    description:
      'A visual calendar of your activations. Each day shows which pattern dominates and at what intensity.',
    isAvailable: false,
  },
  'client-dashboard': {
    id: 'client-dashboard',
    label: 'Practitioners',
    category: 'Client Dashboard',
    title: 'Client Dashboard',
    description:
      'For practitioners: Track clients, manage bookings, view session notes, and monitor pattern work progress.',
    isAvailable: false,
  },
  'insights': {
    id: 'insights',
    label: 'Intelligence',
    category: 'Insights',
    title: 'Insights',
    description: 'AI-powered pattern insights and recommendations based on your data.',
    isAvailable: false,
  },
  'sessions': {
    id: 'sessions',
    label: 'Sessions',
    category: 'Sessions',
    title: 'Sessions',
    description: 'Track your practice sessions and pattern work.',
    isAvailable: false,
  },
  'community': {
    id: 'community',
    label: 'Community',
    category: 'Community',
    title: 'Community Circles',
    description: 'Connect with others exploring similar patterns.',
    isAvailable: false,
  },
};

export function AdaptiveDashboardGrid() {
  const [sortedSections, setSortedSections] = useState<SectionId[]>([]);
  const [isClient, setIsClient] = useState(false);
  const ref = useSectionEngagement('mood-trends'); // Track overall grid engagement

  useEffect(() => {
    setIsClient(true);
    const sorted = getSortedSectionsByEngagement().map((s) => s.id);
    setSortedSections(sorted);
  }, []);

  if (!isClient || sortedSections.length === 0) {
    // Render default order while loading
    return <DefaultDashboardGrid />;
  }

  // Reorder cards: available first (sorted by engagement), then coming soon
  const availableSorted = sortedSections
    .filter((id) => DASHBOARD_CARDS[id]?.isAvailable)
    .slice(0, 2);

  const comingSoon = Object.values(DASHBOARD_CARDS)
    .filter((card) => !card.isAvailable)
    .slice(0, 2);

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
      {/* Available Cards - Sorted by Engagement */}
      {availableSorted.map((sectionId) => {
        const card = DASHBOARD_CARDS[sectionId];
        if (!card) return null;

        const engagement = getSortedSectionsByEngagement();
        const section = engagement.find((s) => s.id === sectionId);
        const score = section ? calculateEngagementScore(section) : 0;
        const isHighlyEngaged = score > 10;

        return (
          <Link
            key={card.id}
            href={card.href || '#'}
            className={`group glass-card ${
              isHighlyEngaged
                ? 'border-[#c9a96e]/30 hover:border-[#c9a96e]/50 hover:shadow-lg hover:shadow-[#c9a96e]/10'
                : 'hover:border-[#c9a96e]/25'
            }`}
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 font-light">
                  {card.label}
                </p>
                {isHighlyEngaged && (
                  <span className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e] font-light bg-[#c9a96e]/10 px-2 py-1 rounded">
                    Most Active
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-serif text-[#f0eee9] group-hover:text-[#c9a96e] transition-colors duration-300">
                {card.title}
              </h2>
            </div>

            <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 font-light">
              {card.description}
            </p>

            <div className="flex items-center gap-2 text-[#c9a96e] text-xs tracking-[0.3em] uppercase font-light group-hover:gap-3 transition-all duration-300">
              <span>View {card.title}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        );
      })}

      {/* Coming Soon Cards */}
      {comingSoon.map((card) => (
        <div
          key={card.id}
          className="glass-card opacity-40"
        >
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-3 font-light">
              Coming Soon
            </p>
            <h2 className="text-2xl font-serif text-[#f0eee9]">{card.title}</h2>
          </div>

          <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 font-light">
            {card.description}
          </p>

          <div className="flex items-center gap-2 text-[#5a5a5a] text-xs tracking-[0.3em] uppercase font-light">
            <span>Coming Soon</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultDashboardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
      <Link
        href="/dashboard/mood-trends"
        className="group glass-card"
      >
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-3 font-light">
            Analytics
          </p>
          <h2 className="text-2xl font-serif text-[#f0eee9] group-hover:text-[#c9a96e] transition-colors duration-300">
            Mood Trends
          </h2>
        </div>

        <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 font-light">
          Visualize which patterns are most active. See intensity curves, distribution across time,
          and identify your top recurring patterns.
        </p>

        <div className="flex items-center gap-2 text-[#c9a96e] text-xs tracking-[0.3em] uppercase font-light group-hover:gap-3 transition-all duration-300">
          <span>View Trends</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>

      <div className="glass-card opacity-40">
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-3 font-light">
            Coming Soon
          </p>
          <h2 className="text-2xl font-serif text-[#f0eee9]">Pattern Calendar</h2>
        </div>

        <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 font-light">
          A visual calendar of your activations. Each day shows which pattern dominates and at what
          intensity.
        </p>

        <div className="flex items-center gap-2 text-[#5a5a5a] text-xs tracking-[0.3em] uppercase font-light">
          <span>Coming Soon</span>
        </div>
      </div>

      <Link
        href="/dashboard/timeline"
        className="group glass-card"
      >
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-3 font-light">
            Visualization
          </p>
          <h2 className="text-2xl font-serif text-[#f0eee9] group-hover:text-[#c9a96e] transition-colors duration-300">
            Pattern Timeline
          </h2>
        </div>

        <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 font-light">
          An interactive D3.js timeline of your pattern journey. See sessions, insights, journal
          entries, and milestones mapped to your patterns.
        </p>

        <div className="flex items-center gap-2 text-[#c9a96e] text-xs tracking-[0.3em] uppercase font-light group-hover:gap-3 transition-all duration-300">
          <span>View Timeline</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-8 opacity-50">
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-3 font-light">
            Coming Soon
          </p>
          <h2 className="text-2xl font-serif text-[#f0eee9]">Client Dashboard</h2>
        </div>

        <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 font-light">
          For practitioners: Track clients, manage bookings, view session notes, and monitor pattern
          work progress.
        </p>

        <div className="flex items-center gap-2 text-[#5a5a5a] text-xs tracking-[0.3em] uppercase font-light">
          <span>Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
