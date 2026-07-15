import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Free Resources — AstroKalki',
  description: 'Download free guides, quizzes, and tools for understanding your emotional patterns and karmic cycles.',
  keywords: ['free astrology guide', 'pattern recognition quiz', 'free resources'],
};

export default function FreeResourcesPage() {
  const resources = [
    {
      id: 'pattern-guide',
      title: 'The Complete Pattern Recognition Guide',
      description: 'Understand the 7 karmic loops running your relationships and choices.',
      format: 'PDF',
      pages: 24,
      icon: '📖',
      color: 'from-amber-500 to-orange-600',
      cta: 'Download Now',
      highlights: [
        'The 7 karmic patterns explained',
        'How to recognize them in your life',
        'Integration practices',
        'Chart references',
      ],
    },
    {
      id: 'shadow-quiz',
      title: 'Which Shadow Pattern Quiz',
      description: 'Discover which disowned part of yourself you project onto partners and relationships.',
      format: 'Interactive Quiz',
      questions: 15,
      time: '2 minutes',
      icon: '✨',
      color: 'from-purple-500 to-pink-600',
      cta: 'Take the Quiz',
      highlights: [
        '15 targeted questions',
        'Instant results',
        'Download personalized report',
        'See your shadow pattern clearly',
      ],
    },
    {
      id: 'karmic-loop-quiz',
      title: 'What Karmic Loop Are You Repeating?',
      description: 'Identify the inherited pattern or karma you&apos;re unconsciously cycling through.',
      format: 'Interactive Quiz',
      questions: 18,
      time: '3 minutes',
      icon: '♻️',
      color: 'from-teal-500 to-cyan-600',
      cta: 'Identify Your Loop',
      highlights: [
        '18 deep questions',
        'Karmic pattern analysis',
        'What you came to learn',
        'PDF report included',
      ],
    },
    {
      id: 'checklist',
      title: 'Pattern Recognition Checklist',
      description: '20 signs that reveal the unconscious pattern beneath your repeating situations.',
      format: 'PDF Checklist',
      items: 20,
      icon: '✓',
      color: 'from-green-500 to-emerald-600',
      cta: 'Download Checklist',
      highlights: [
        '20 pattern recognition signs',
        'Print-friendly format',
        'Daily reference guide',
        'Integration workbook',
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-5xl font-light mb-4 text-white tracking-tight">
          Free Pattern Recognition Resources
        </h1>
        <p className="text-lg text-slate-300 mb-2">
          See the pattern running you. Break the cycle. Choose consciously.
        </p>
        <p className="text-sm text-slate-400">
          All resources are completely free. Just your email to download.
        </p>
      </section>

      {/* Resources Grid */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 mb-20">
        {resources.map((resource) => (
          <Card key={resource.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors overflow-hidden">
            <div className={`h-32 bg-gradient-to-br ${resource.color} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 backdrop-blur-sm" />
              </div>
              <div className="relative h-full flex items-center justify-center">
                <span className="text-6xl">{resource.icon}</span>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-2">{resource.title}</h2>
              <p className="text-slate-400 text-sm mb-4">{resource.description}</p>

              {/* Metadata */}
              <div className="flex gap-3 mb-4 text-xs text-slate-400">
                <span className="bg-slate-700/50 px-2 py-1 rounded">{resource.format}</span>
                {resource.pages && <span className="bg-slate-700/50 px-2 py-1 rounded">{resource.pages} pages</span>}
                {resource.questions && <span className="bg-slate-700/50 px-2 py-1 rounded">{resource.questions} questions</span>}
                {resource.items && <span className="bg-slate-700/50 px-2 py-1 rounded">{resource.items} items</span>}
                {resource.time && <span className="bg-slate-700/50 px-2 py-1 rounded">{resource.time}</span>}
              </div>

              {/* Highlights */}
              <ul className="space-y-2 mb-6">
                {resource.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-amber-400 mt-0.5">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                asChild
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium"
              >
                <a href={`/free-resources/${resource.id}`}>{resource.cta}</a>
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="max-w-2xl mx-auto bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-white mb-3">Ready to Go Deeper?</h2>
        <p className="text-slate-300 mb-6">
          These free resources reveal the pattern. Ready to understand it completely?
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
            <a href="/email-course">Get 5-Day Email Course</a>
          </Button>
          <Button asChild variant="outline" className="border-amber-500 text-amber-400 hover:bg-amber-500/10">
            <a href="/ask-astrokalki">Chat with AstroKalki</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
