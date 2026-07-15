import { PatternCircles } from '@/components/community/pattern-circles';

export const metadata = {
  title: 'Community - AstroKalki',
  description: 'Join pattern circles and connect with others on their journey',
};

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 sm:px-10 lg:px-16 py-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-20">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Connection & Insight
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif text-[#f0eee9] mb-6">
            Community
          </h1>
          <p className="text-[#9a9a9a] text-base leading-[1.8] max-w-2xl font-light">
            You are not alone in your patterns. Join communities of people exploring the same psychological patterns, share insights, and support each other&apos;s growth.
          </p>
        </div>

        {/* Benefits section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 pb-20 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Share Experience</h3>
            <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
              Post your insights, questions, and breakthroughs with people who understand your patterns deeply.
            </p>
          </div>
          
          <div>
            <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Learn Together</h3>
            <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
              Discover how others work with the same patterns. Gain new perspectives and strategies for integration.
            </p>
          </div>
          
          <div>
            <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Build Support</h3>
            <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
              Connect with practitioners, facilitators, and fellow explorers who can help you on your journey.
            </p>
          </div>
        </div>

        {/* Pattern Circles */}
        <PatternCircles />

        {/* Info section */}
        <div className="mt-20 pt-20 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Community Guidelines
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Respectful Dialogue</h3>
              <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                All circles maintain a culture of respect, openness, and psychological safety. We honor different perspectives and approaches to pattern work.
              </p>
            </div>
            
            <div>
              <h3 className="text-[#c9a96e] font-serif text-lg mb-3">Moderated Spaces</h3>
              <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
                Each circle has experienced moderators who ensure conversations remain supportive, on-topic, and free from harmful content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
