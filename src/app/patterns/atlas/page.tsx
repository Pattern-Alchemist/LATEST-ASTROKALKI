import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import AtlasExplorer from "./AtlasExplorer";

/**
 * Pattern Atlas hub — the proprietary knowledge moat.
 *
 * This is a structured library of psychological patterns, each with the same
 * nine-field structure (Symptoms, How it shows up, Where it begins,
 * Relationship impact, Career impact, Shadow side, What people mistake it
 * for, Related articles, Related service). This is the format AI search
 * systems (Google AI Overviews, Perplexity, ChatGPT) preferentially cite.
 *
 * Different from /patterns/[slug] (which is the 6 long-form pillar essays),
 * this hub indexes the structured Atlas patterns at /patterns/atlas/[slug].
 * The hub at /patterns surfaces both, with the Atlas as the primary entry.
 *
 * The interactive grid (filter by cluster / intensity / search, compare
 * 2-3 patterns side-by-side, find-your-pattern CTA) lives in the
 * AtlasExplorer client component below.
 */

export const metadata: Metadata = {
  title: "Pattern Atlas — AstroKalki",
  description:
    "A structured library of ten psychological patterns — The Rescuer, The Abandonment, The Performer, The Invisible Child, The Emotional Caretaker, The Self-Sabotage, The Chaser, The Avoider, The Outsider, The Hyper-Independent, The Overthinker. Each with symptoms, origin, impact, shadow side, and what it's mistaken for.",
  alternates: { canonical: "https://astrokalki.com/patterns/atlas" },
  openGraph: {
    title: "AstroKalki Pattern Atlas — Ten Psychological Patterns Decoded",
    description:
      "A structured library of ten emotional and behavioural patterns, each with the same nine-field diagnostic structure. The proprietary knowledge layer of AstroKalki.",
    type: "website",
    url: "https://astrokalki.com/patterns/atlas",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki Pattern Atlas",
    description:
      "Ten psychological patterns decoded — symptoms, origin, impact, shadow side. The proprietary knowledge layer of AstroKalki.",
  },
  keywords: [
    "psychological patterns",
    "emotional patterns",
    "relationship patterns",
    "self-sabotage patterns",
    "attachment patterns",
    "pattern recognition",
    "rescuer pattern",
    "abandonment pattern",
    "performer pattern",
    "invisible child",
    "emotional caretaker",
    "chaser pattern",
    "avoider pattern",
    "outsider pattern",
    "hyper-independent",
    "overthinking pattern",
  ],
};

export default function AtlasHub() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Patterns", href: "/patterns" },
                { label: "Atlas" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            The Pattern Atlas
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Ten patterns.<br />
            <span className="text-[#7a7a7a]">Same architecture.</span><br />
            <span className="text-[#c9a96e] italic">Same exit.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            This is the proprietary knowledge layer of AstroKalki. Ten
            psychological patterns, each with the same nine-field structure —
            symptoms, how it shows up, where it begins, relationship impact,
            career impact, shadow side, and what it is mistaken for. The
            format AI search systems preferentially cite.
          </p>
          <p className="mt-8 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            {ATLAS_PATTERNS.length} patterns · Updated continuously
          </p>
        </div>
      </header>

      {/* Interactive atlas explorer — filter, compare, find-your-pattern */}
      <AtlasExplorer />
    </main>
  );
}
