'use client';

import { useEffect, useRef } from 'react';
import { 
  trackSectionView, 
  trackSectionClick, 
  trackSectionTimeSpent,
  SectionId 
} from '@/lib/section-engagement';

/**
 * Hook to track section engagement automatically
 * 
 * Usage:
 * const ref = useSectionEngagement('mood-trends');
 * <div ref={ref}>...</div>
 */
export function useSectionEngagement(sectionId: SectionId) {
  const ref = useRef<HTMLDivElement>(null);
  const timeTrackerRef = useRef<NodeJS.Timeout | null>(null);
  const clickHandlerRef = useRef<EventListener | null>(null);

  useEffect(() => {
    // Track view on mount
    trackSectionView(sectionId);

    const element = ref.current;
    if (!element) return;

    // Track time spent
    let accumulatedSeconds = 0;
    const startTime = Date.now();

    const trackTime = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed > accumulatedSeconds) {
        accumulatedSeconds = elapsed;
        trackSectionTimeSpent(sectionId, 1); // Track 1 second at a time
      }
    };

    timeTrackerRef.current = setInterval(trackTime, 5000); // Check every 5 seconds

    // Track clicks within the section
    const handleClick = () => {
      trackSectionClick(sectionId);
    };

    clickHandlerRef.current = handleClick;
    element.addEventListener('click', handleClick);

    return () => {
      if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
      if (clickHandlerRef.current) {
        element.removeEventListener('click', clickHandlerRef.current);
      }

      // Track remaining time on unmount
      const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
      if (totalElapsed > accumulatedSeconds) {
        trackSectionTimeSpent(sectionId, totalElapsed - accumulatedSeconds);
      }
    };
  }, [sectionId]);

  return ref;
}
