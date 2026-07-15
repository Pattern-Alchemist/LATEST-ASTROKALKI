'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const resources: Record<string, any> = {
  'pattern-guide': {
    title: 'The Complete Pattern Recognition Guide',
    subtitle: 'Understand the 7 karmic loops running your relationships and choices',
    description: 'Your birth chart reveals the karmic architecture beneath your repeating patterns. This guide decodes what you cannot see because you are inside it.',
    pages: 24,
    format: 'PDF',
    color: 'from-amber-500 to-orange-600',
    icon: '📖',
    sections: [
      'The 7 Karmic Patterns',
      'How to Recognize Each Pattern',
      'Where It Lives in Your Chart',
      'How It Expresses in Relationships',
      'How It Appears in Career & Money',
      'Integration Practices',
      'Resources & Next Steps',
    ],
    benefits: [
      'See the pattern you&apos;re unconsciously living',
      'Understand why you keep attracting the same situations',
      'Learn where this pattern comes from in your chart',
      'Get specific integration practices',
      'Know when and how the pattern will shift',
    ],
  },
  'shadow-quiz': {
    title: 'Which Shadow Pattern Quiz',
    subtitle: 'Discover which disowned part of yourself you project onto partners',
    description: 'Carl Jung discovered that what we cannot accept in ourselves, we meet in others. This quiz reveals your shadow pattern.',
    questions: 15,
    format: 'Interactive Quiz',
    time: '2 minutes',
    color: 'from-purple-500 to-pink-600',
    icon: '✨',
    sections: [
      'Your Shadow Archetype',
      'How It Shows Up in Relationships',
      'Who You Keep Attracting',
      'The Healing Path',
    ],
    benefits: [
      'Understand your unconscious attractions',
      'See the pattern in your relationship choices',
      'Know what part of yourself to reclaim',
      'Get specific integration steps',
      'Transform projection into awareness',
    ],
  },
  'karmic-loop-quiz': {
    title: 'What Karmic Loop Are You Repeating?',
    subtitle: 'Identify the inherited pattern you are unconsciously cycling through',
    description: 'Your birth chart shows not just your psychological patterns, but your karmic inheritance. What did you come here to transcend?',
    questions: 18,
    format: 'Interactive Quiz',
    time: '3 minutes',
    color: 'from-teal-500 to-cyan-600',
    icon: '♻️',
    sections: [
      'Your Karmic Pattern',
      'What You Inherited',
      'What You Came to Learn',
      'The Lesson Hidden in This Loop',
    ],
    benefits: [
      'Understand your karmic inheritance',
      'See what you came here to transcend',
      'Know the soul lesson beneath the pattern',
      'Get clarity on your karmic purpose',
      'Learn how to break the cycle',
    ],
  },
  'checklist': {
    title: 'Pattern Recognition Checklist',
    subtitle: '20 signs that reveal the unconscious pattern beneath your situations',
    description: 'Your pattern is invisible to you because you are inside it. This checklist makes it visible.',
    items: 20,
    format: 'PDF Checklist',
    color: 'from-green-500 to-emerald-600',
    icon: '✓',
    sections: [
      'Relational Patterns',
      'Emotional Patterns',
      'Choice Patterns',
      'Behavioral Patterns',
      'Perception Patterns',
    ],
    benefits: [
      'Quickly identify your pattern',
      'Use daily for awareness',
      'Track pattern shifts over time',
      'Share with therapist or coach',
      'Integrate into your routine',
    ],
  },
};

export default function ResourcePage({ params }: { params: { id: string } }) {
  const resource = resources[params.id];
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!resource) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">Resource not found</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/lead-magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          leadMagnetType: params.id,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{resource.icon}</span>
            <div>
              <p className="text-sm text-amber-400 font-medium tracking-wider uppercase">{resource.format}</p>
              <h1 className="text-4xl font-light text-white mt-1">{resource.title}</h1>
            </div>
          </div>
          <p className="text-xl text-slate-300 mt-6">{resource.subtitle}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 grid lg:grid-cols-3 gap-8 py-12">
        {/* Left Column - Details */}
        <div className="lg:col-span-2">
          {/* Description */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-8">
            <p className="text-lg text-slate-200 leading-relaxed">{resource.description}</p>
          </div>

          {/* What&apos;s Included */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">What&apos;s Included</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {resource.sections.map((section: string, i: number) => (
                <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-400 text-xl mt-1">→</span>
                    <span className="text-slate-200">{section}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">Benefits</h2>
            <ul className="space-y-3">
              {resource.benefits.map((benefit: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-slate-200">
                  <span className="text-green-400 text-xl mt-0.5">✓</span>
                  <span className="text-base">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column - Signup Form */}
        <div className="lg:col-span-1">
          <div className={`sticky top-20 bg-gradient-to-br ${resource.color} rounded-lg p-1`}>
            <div className="bg-slate-800 rounded p-6">
              {!submitted ? (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">Get Instant Access</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Enter your email to download{" "}
                    <span className="text-amber-400 font-medium">instantly</span>
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Name (optional)</label>
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Email Address</label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
                    >
                      {loading ? 'Sending...' : 'Download Now'}
                    </Button>

                    <p className="text-xs text-slate-400 text-center">
                      We respect your privacy. No spam, unsubscribe anytime.
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">✓</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Check Your Email!</h3>
                  <p className="text-slate-300 text-sm mb-4">
                    Your download is on the way. Check your inbox (and spam folder).
                  </p>
                  <p className="text-xs text-slate-400">Look for: {email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 bg-slate-800/30 border-t border-slate-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-white mb-3">Ready to Go Deeper?</h2>
          <p className="text-slate-300 mb-6">This resource reveals the pattern. Ready to understand and transform it?</p>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
            <a href="/services">Book a Session</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
