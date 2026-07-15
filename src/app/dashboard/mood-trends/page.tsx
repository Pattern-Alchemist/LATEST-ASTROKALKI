/**
 * Mood Trends Dashboard Page
 * 
 * Displays pattern activations and mood trends over time.
 * Shows which patterns have been most active and how intensity varies
 * across the calendar period.
 */

import { MoodTrends } from '@/components/astrokalki/mood-trends';
import { getPatternActivation } from '@/lib/astrology/pattern-activation';
import { calculateTransits } from '@/lib/astrology/transits';
import { db } from '@/lib/db';

// Generate sample mood trend data
function generateSampleMoodData() {
  const data: Array<{ date: string; patterns: Record<string, number>; dominant: string }> = [];
  const today = new Date();
  
  for (let i = -30; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    
    // Generate synthetic pattern activations with varying intensity
    const patterns: Record<string, number> = {
      'the-abandonment': Math.max(0.3, Math.sin(i * 0.3) * 0.4 + 0.5),
      'the-performer': Math.max(0.3, Math.cos(i * 0.2) * 0.3 + 0.5),
      'the-self-sabotage': Math.max(0.3, Math.sin(i * 0.15) * 0.35 + 0.45),
      'the-emotional-caretaker': Math.max(0.3, Math.cos(i * 0.25) * 0.25 + 0.5),
      'the-overthinker': Math.max(0.3, Math.sin(i * 0.1) * 0.3 + 0.55),
    };
    
    // Find dominant pattern
    const dominant = Object.entries(patterns).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];
    
    data.push({
      date: dateStr,
      patterns,
      dominant,
    });
  }
  
  return data;
}

export default async function MoodTrendsDashboard() {
  const moodData = generateSampleMoodData();

  return (
    <main className="min-h-screen bg-[#050505] px-6 sm:px-10 lg:px-16 py-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Pattern Analytics
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif text-[#f0eee9] mb-4">
            Your Mood Patterns
          </h1>
          <p className="text-[#9a9a9a] text-base leading-[1.8] max-w-2xl font-light">
            Track which psychological patterns are most active in your life. See how pattern intensity ebbs and flows across time, and identify which patterns need the most attention.
          </p>
        </div>

        {/* Mood Trends Visualization */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-8">
          <MoodTrends 
            data={moodData}
            title="Your 60-Day Pattern Timeline"
            timeRange="30d"
          />
        </div>

        {/* Context Section */}
        <div className="mt-20 space-y-12">
          <section>
            <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              What This Means
            </p>
            <h2 className="text-2xl font-serif text-[#f0eee9] mb-6">
              Understanding Your Pattern Activations
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
                <h3 className="text-[#c9a96e] font-serif text-lg mb-3">High Intensity</h3>
                <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                  When a pattern reaches 0.8-1.0 intensity, it&apos;s strongly activated in your transits. This is the time to be most aware of its tendencies — emotional reactivity, relational patterns, or behavioral loops.
                </p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
                <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Medium Intensity</h3>
                <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                  At 0.5-0.7, a pattern is present but not overwhelming. This is an ideal time to work with that pattern consciously — to observe it, understand its roots, and practice new responses.
                </p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
                <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Low Intensity</h3>
                <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                  Below 0.4, the pattern is dormant. This doesn&apos;t mean it&apos;s gone — it means the transit pressure easing. A useful time for integration and consolidation of insights.
                </p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
                <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Pattern Trends</h3>
                <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                  Watch for recurring patterns across weeks. A pattern that spikes every 7-10 days suggests a rhythm to its activation — usually tied to lunar or weekly planetary cycles.
                </p>
              </div>
            </div>
          </section>

          {/* How to Use */}
          <section>
            <h2 className="text-2xl font-serif text-[#f0eee9] mb-6">
              How to Use This
            </h2>
            <div className="space-y-4 text-[#9a9a9a] text-sm leading-[1.8] font-light">
              <p>
                <span className="text-[#c9a96e] font-serif">1. Identify Your Top Patterns</span> — The chart shows your five most active patterns. These are the ones with the strongest transits right now.
              </p>
              <p>
                <span className="text-[#c9a96e] font-serif">2. Notice the Rhythm</span> — Do certain patterns spike at the same time each month? This often indicates a natal planet returning to a key transit date.
              </p>
              <p>
                <span className="text-[#c9a96e] font-serif">3. Track Your Inner Work</span> — When a pattern is active, it shows up in your relationships, choices, and emotional state. Notice how your awareness of the pattern changes its intensity.
              </p>
              <p>
                <span className="text-[#c9a96e] font-serif">4. Plan Your Deep Work</span> — High-intensity periods are ideal for pattern sessions. You&apos;re more aware of the wound and how it operates.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
