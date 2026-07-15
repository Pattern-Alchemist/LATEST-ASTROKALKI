import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Free Tools — AstroKalki',
  description: 'Interactive astrology tools to understand your birth chart, patterns, and relationships.',
  keywords: ['astrology tools', 'birth chart calculator', 'compatibility', 'free tools'],
};

export default function ToolsPage() {
  const tools = [
    {
      id: 'birth-chart',
      title: 'Birth Chart Calculator',
      description: 'Get your sun, moon, and rising signs instantly',
      time: '2 minutes',
      icon: '🌙',
      color: 'from-indigo-500 to-purple-600',
      href: '/tools/birth-chart',
      features: [
        'Sun sign (core identity)',
        'Moon sign (emotional nature)',
        'Rising sign (how others see you)',
        'Full planetary placements',
      ],
      tag: 'Most Popular',
    },
    {
      id: 'compatibility',
      title: 'Astrological Compatibility',
      description: 'Check chart alignment with another person',
      time: '3 minutes',
      icon: '💫',
      color: 'from-pink-500 to-rose-600',
      href: '/tools/compatibility',
      features: [
        'Sun sign compatibility',
        'Moon sign connection',
        'Venus (love) compatibility',
        'Overall harmony score',
      ],
      tag: 'Popular',
    },
    {
      id: 'pattern-finder',
      title: 'Pattern Finder',
      description: 'Identify your emotional pattern from your chart',
      time: '2 minutes',
      icon: '🔄',
      color: 'from-orange-500 to-amber-600',
      href: '/tools/pattern-finder',
      features: [
        '12 karmic patterns identified',
        'Chart-based analysis',
        'Life area patterns',
        'Integration suggestions',
      ],
    },
    {
      id: 'shadow-self',
      title: 'Shadow Self Identifier',
      description: 'Discover your disowned self and what you project',
      time: '3 minutes',
      icon: '🌑',
      color: 'from-slate-600 to-slate-800',
      href: '/tools/shadow-self',
      features: [
        'Shadow archetype identification',
        'Projection patterns',
        'What you attract in others',
        'Reclamation steps',
      ],
    },
    {
      id: 'transit-forecast',
      title: 'Transit Forecast',
      description: 'See upcoming planetary transits',
      time: '1 minute',
      icon: '⭐',
      color: 'from-yellow-500 to-orange-500',
      href: '/tools/transits',
      features: [
        'Major transits',
        'Current season overview',
        'Upcoming shifts',
        'What to expect',
      ],
    },
    {
      id: 'saturn-return',
      title: 'Saturn Return Guide',
      description: 'Is your Saturn return happening now?',
      time: '2 minutes',
      icon: '⏰',
      color: 'from-gray-500 to-slate-600',
      href: '/tools/saturn-return',
      features: [
        'Saturn return dates',
        'Life cycle phase',
        'What to expect',
        'Integration guide',
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-5xl font-light mb-4 text-white tracking-tight">
          Free Astrology Tools
        </h1>
        <p className="text-lg text-slate-300 mb-2">
          Understand your chart. Recognize your patterns. Choose consciously.
        </p>
        <p className="text-sm text-slate-400">
          No signup required. Get instant results for free.
        </p>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {tools.map((tool) => (
          <Card key={tool.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg group overflow-hidden">
            <div className={`h-24 bg-gradient-to-br ${tool.color} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 backdrop-blur-sm" />
              </div>
              <div className="relative h-full flex items-center justify-between px-6">
                <span className="text-4xl">{tool.icon}</span>
                {tool.tag && (
                  <span className="text-xs font-semibold text-white bg-white/20 px-3 py-1 rounded-full backdrop-blur">
                    {tool.tag}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                {tool.title}
              </h2>
              <p className="text-slate-400 text-sm mb-4">{tool.description}</p>

              {/* Time */}
              <p className="text-xs text-slate-500 mb-4">Takes {tool.time}</p>

              {/* Features */}
              <ul className="space-y-1 mb-6">
                {tool.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-400 mt-1">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                asChild
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium text-sm"
              >
                <a href={tool.href}>Open Tool</a>
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="max-w-2xl mx-auto bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-white mb-3">All Tools Are Free</h2>
        <p className="text-slate-300 mb-6">
          No credit card. No signup required. See your chart and patterns instantly.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
            <a href="/tools/birth-chart">Start with Birth Chart</a>
          </Button>
          <Button asChild variant="outline" className="border-amber-500 text-amber-400 hover:bg-amber-500/10">
            <a href="/free-resources">Get Resources</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
