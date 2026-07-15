'use client';

import { ReactNode } from 'react';
import { useSectionEngagement } from '@/hooks/use-section-engagement';

export function MoodTrendsPageWrapper({ children }: { children: ReactNode }) {
  const ref = useSectionEngagement('mood-trends');

  return <div ref={ref}>{children}</div>;
}
