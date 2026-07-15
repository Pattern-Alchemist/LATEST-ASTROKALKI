import { ForumQuestions } from '@/components/forum/forum-questions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Plus } from 'lucide-react';

export const metadata = {
  title: 'Forum - AstroKalki',
  description: 'Ask questions and share knowledge about pattern recognition',
};

export default function ForumPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 sm:px-10 lg:px-16 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-4 font-light">
                Knowledge & Support
              </p>
              <h1 className="text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif text-[#f0eee9]">
                Forum
              </h1>
            </div>
            <Link href="/forum/new">
              <Button className="gap-2 bg-[#c9a96e] hover:bg-[#d4b882] text-[#050505]">
                <Plus className="w-4 h-4" />
                Ask Question
              </Button>
            </Link>
          </div>

          <p className="text-[#9a9a9a] text-base leading-[1.8] max-w-2xl font-light">
            A moderated Q&A community where you can ask questions about pattern recognition, share insights, and learn from experienced practitioners and fellow explorers.
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 pb-12 border-b border-white/[0.06]">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <h3 className="text-[#c9a96e] text-sm font-semibold mb-2">
              Ask Anything
            </h3>
            <p className="text-[#7a7a7a] text-xs leading-relaxed">
              No question is too simple. Our community is here to help you understand patterns and integrate insights.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <h3 className="text-[#c9a96e] text-sm font-semibold mb-2">
              Get Answers
            </h3>
            <p className="text-[#7a7a7a] text-xs leading-relaxed">
              Experienced practitioners and community members provide thoughtful, nuanced answers based on real experience.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <h3 className="text-[#c9a96e] text-sm font-semibold mb-2">
              Moderated Space
            </h3>
            <p className="text-[#7a7a7a] text-xs leading-relaxed">
              All posts are reviewed to maintain respectful, on-topic discussions that honor psychological safety.
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-lg font-serif text-[#f0eee9] mb-6">
            Categories
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {[
              {
                id: '1',
                name: 'Pattern Recognition',
                description: 'Questions about identifying and understanding your psychological patterns',
              },
              {
                id: '2',
                name: 'Astrological Influences',
                description: 'How transits and natal chart placements activate your patterns',
              },
              {
                id: '3',
                name: 'Integration & Healing',
                description: 'Working with patterns to create lasting change and integration',
              },
              {
                id: '4',
                name: 'Practitioner Insights',
                description: 'Discussion for those working professionally with patterns',
              },
            ].map((category) => (
              <Link
                key={category.id}
                href={`/forum?category=${category.id}`}
                className="group bg-white/[0.02] border border-white/[0.06] hover:border-[#c9a96e]/30 rounded-lg p-4 transition-all"
              >
                <h3 className="text-[#f0eee9] font-medium group-hover:text-[#c9a96e] transition-colors mb-1">
                  {category.name}
                </h3>
                <p className="text-[#7a7a7a] text-sm">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest Questions */}
        <div>
          <h2 className="text-lg font-serif text-[#f0eee9] mb-6">
            Latest Questions
          </h2>
          <ForumQuestions limit={15} />
        </div>
      </div>
    </main>
  );
}
