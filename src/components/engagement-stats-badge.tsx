'use client';

import { useEffect, useState } from 'react';
import { getEngagementStats } from '@/lib/section-engagement';

export function EngagementStatsBadge() {
  const [stats, setStats] = useState<{
    totalInteractions: number;
    mostEngaged: string | null;
    averageScore: number;
  } | null>(null);

  useEffect(() => {
    const stats = getEngagementStats();
    setStats(stats);
  }, []);

  if (!stats || stats.totalInteractions === 0) {
    return null;
  }

  return (
    <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg p-4 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e] font-light mb-1">
            Your Engagement Today
          </p>
          <p className="text-sm text-[#9a9a9a] font-light">
            {stats.totalInteractions} interactions across dashboard sections
          </p>
        </div>
        {stats.mostEngaged && (
          <div className="text-right">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] font-light mb-1">
              Most Active
            </p>
            <p className="text-sm text-[#f0eee9] font-serif capitalize">
              {stats.mostEngaged.replace(/-/g, ' ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
