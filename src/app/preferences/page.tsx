import React from 'react';
import { Metadata } from 'next';
import { PatternSelector } from '@/components/pattern-selector';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Preferences — AstroKalki',
  description: 'Customize your AstroKalki experience. Choose your pattern theme, language, and notification settings.',
};

export default function PreferencesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground/80 mb-4"
          >
            <span>←</span> Back to home
          </Link>
          <h1 className="text-4xl font-serif text-balance mb-2">Your Preferences</h1>
          <p className="text-foreground/70">Personalize how AstroKalki appears and communicates with you.</p>
        </div>

        {/* Settings sections */}
        <div className="space-y-8">
          {/* Theme section */}
          <section className="rounded-lg border border-border bg-card/50 p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-pattern-accent">✨</span> Theme & Appearance
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/70 mb-3">
                  Select a pattern theme to customize the accent colors throughout your experience. Your choice will shift the site&apos;s primary accent from the default gold to the color of your chosen pattern.
                </p>
                <PatternSelector showDescription={true} />
              </div>
            </div>
          </section>

          {/* Language section */}
          <section className="rounded-lg border border-border bg-card/50 p-6">
            <h2 className="text-xl font-semibold mb-6">Language</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-border hover:bg-accent/50 transition-colors">
                <input type="radio" name="language" value="en" defaultChecked className="w-4 h-4" />
                <div>
                  <p className="font-medium">English</p>
                  <p className="text-sm text-foreground/60">All content in English</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-border hover:bg-accent/50 transition-colors">
                <input type="radio" name="language" value="hi" className="w-4 h-4" />
                <div>
                  <p className="font-medium">हिन्दी (Hindi)</p>
                  <p className="text-sm text-foreground/60">All content in Hindi</p>
                </div>
              </label>
            </div>
          </section>

          {/* Notifications section */}
          <section className="rounded-lg border border-border bg-card/50 p-6">
            <h2 className="text-xl font-semibold mb-6">Notifications</h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Booking confirmations</p>
                  <p className="text-sm text-foreground/60">Get notified when sessions are booked</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-border">
                <div>
                  <p className="font-medium">Insight emails</p>
                  <p className="text-sm text-foreground/60">Receive weekly pattern insights</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-border">
                <div>
                  <p className="font-medium">Newsletter</p>
                  <p className="text-sm text-foreground/60">Join the AstroKalki community</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </label>
            </div>
          </section>

          {/* Quick links */}
          <section className="rounded-lg border border-border bg-card/50 p-6">
            <h2 className="text-xl font-semibold mb-6">More</h2>
            <div className="space-y-2">
              <Link
                href="/about"
                className="flex items-center justify-between p-3 rounded hover:bg-accent/50 transition-colors group"
              >
                <span>About AstroKalki</span>
                <ChevronRight className="w-4 h-4 text-foreground/40 group-hover:text-foreground/60" />
              </Link>
              <Link
                href="/contact"
                className="flex items-center justify-between p-3 rounded hover:bg-accent/50 transition-colors group"
              >
                <span>Contact & Support</span>
                <ChevronRight className="w-4 h-4 text-foreground/40 group-hover:text-foreground/60" />
              </Link>
              <Link
                href="/privacy"
                className="flex items-center justify-between p-3 rounded hover:bg-accent/50 transition-colors group"
              >
                <span>Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-foreground/40 group-hover:text-foreground/60" />
              </Link>
            </div>
          </section>
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-6 border-t border-border/50 text-center text-sm text-foreground/60">
          <p>Your preferences are saved locally and will persist across sessions.</p>
        </div>
      </div>
    </main>
  );
}
