/**
 * Dashboard Home
 * 
 * Central hub for AstroKalki pattern analytics and tracking.
 * Features adaptive content ordering based on user engagement.
 */

import { AdaptiveDashboardGrid } from '@/components/adaptive-dashboard-grid';
import { JourneyExportDialog } from '@/components/journey-export-dialog';

export const metadata = {
  title: 'Dashboard - AstroKalki',
  description: 'Track your pattern activations and mood trends',
};

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 sm:px-10 lg:px-16 py-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-20">
          <div className="flex items-start justify-between gap-8 mb-6">
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-4 font-light">
                Your Pattern Journey
              </p>
              <h1 className="text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif text-[#f0eee9]">
                Dashboard
              </h1>
            </div>
            <div className="pt-2">
              <JourneyExportDialog />
            </div>
          </div>
          <p className="text-[#9a9a9a] text-base leading-[1.8] max-w-2xl font-light">
            Track your psychological patterns across time. Understand when they activate, how intensely, and what planetary influences shape their appearance.
          </p>
        </div>

        {/* Adaptive Dashboard Grid */}
        <AdaptiveDashboardGrid />

        {/* Info Section */}
        <div className="border-t border-white/[0.06] pt-20">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            About These Tools
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Real-time Data</h3>
              <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                All visualizations pull live transit and pattern activation data. Your patterns update automatically as planetary positions change.
              </p>
            </div>
            
            <div>
              <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Personal Insights</h3>
              <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                The deeper your chart data, the more personalized these insights become. Birth chart activations are more precise than general transits alone.
              </p>
            </div>
            
            <div>
              <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Track Progress</h3>
              <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                Over time, you&apos;ll see how your conscious work with patterns changes their intensity and your response to their activation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
