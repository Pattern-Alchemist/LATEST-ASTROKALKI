import React from 'react';
import { Metadata } from 'next';
import { PatternTimeline } from '@/components/astrokalki/pattern-timeline';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pattern Timeline — AstroKalki',
  description: 'Interactive D3.js visualization of your pattern journey. Track sessions, insights, milestones, and breakthroughs over time.',
};

export default function TimelinePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground/80 mb-4"
          >
            <span>←</span> Back to dashboard
          </Link>
          <h1 className="text-4xl font-serif text-balance mb-2">Your Pattern Timeline</h1>
          <p className="text-foreground/70 max-w-2xl">
            An interactive visualization of your pattern recognition journey. Each dot represents a significant moment — a session, insight, journal entry, or milestone. Hover to explore, click to get details.
          </p>
        </div>

        {/* Timeline visualization */}
        <div className="mb-12">
          <PatternTimeline height={600} />
        </div>

        {/* Legend and info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-lg border border-border bg-card/50 p-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">How to Use</h2>
            <ul className="space-y-3 text-sm text-foreground/70">
              <li className="flex gap-3">
                <span className="text-pattern-accent flex-shrink-0">•</span>
                <span><strong>Hover</strong> over any dot to see the event details</span>
              </li>
              <li className="flex gap-3">
                <span className="text-pattern-accent flex-shrink-0">•</span>
                <span><strong>Click</strong> on a dot to expand and read the full description</span>
              </li>
              <li className="flex gap-3">
                <span className="text-pattern-accent flex-shrink-0">•</span>
                <span>The <strong>horizontal axis</strong> shows time (past to present)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-pattern-accent flex-shrink-0">•</span>
                <span>The <strong>vertical axis</strong> shows which pattern was active</span>
              </li>
              <li className="flex gap-3">
                <span className="text-pattern-accent flex-shrink-0">•</span>
                <span><strong>Color</strong> indicates the specific pattern (matches your theme color)</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Event Types</h2>
            <div className="space-y-3 text-sm text-foreground/70">
              <div className="flex gap-3">
                <span className="text-lg">📍</span>
                <span><strong>Session:</strong> A formal booking or consultation where patterns were explored</span>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">💡</span>
                <span><strong>Insight:</strong> A moment of recognition or realization about a pattern</span>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">✍️</span>
                <span><strong>Journal:</strong> A personal reflection or note about your patterns</span>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">⭐</span>
                <span><strong>Milestone:</strong> A breakthrough, shift, or significant moment in your pattern work</span>
              </div>
            </div>
          </div>
        </div>

        {/* Context info */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-lg font-semibold mb-4">Understanding Your Timeline</h2>
          <div className="prose prose-invert max-w-none text-sm text-foreground/70">
            <p>
              Your pattern timeline maps your journey of self-discovery. Each event represents a moment when you became more conscious of how you operate — whether through a formal session with AstroKalki, a personal insight, or a moment when you chose differently.
            </p>
            <p className="mt-3">
              The timeline is not meant to judge the frequency or intensity of your patterns. Instead, it&apos;s a record of your awareness. The more events on your timeline, the more deeply you&apos;ve engaged with your own architecture. The goal is not to have fewer activations, but to respond to them with greater freedom.
            </p>
            <p className="mt-3">
              Over time, the nature of events shifts. Early on, you might see many sessions and insights. Later, you&apos;ll see more milestones — moments when the pattern activated but you responded differently. That shift is the whole point.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
