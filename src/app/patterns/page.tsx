import Link from "next/link";
import { PILLAR_ARTICLES } from "@/lib/pillar-seed";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patterns — AstroKalki",
  description:
    "The AstroKalki pattern library — a structured Atlas of ten psychological patterns, plus six long-form essays on the deeper internal loops (abandonment, control, people-pleasing, emotional numbness, overthinking, self-doubt).",
  alternates: { canonical: "https://astrokalki.com/patterns" },
  openGraph: {
    title: "Patterns — AstroKalki",
    description:
      "The structured Pattern Atlas (ten patterns) plus six long-form essays on the deeper internal loops.",
    type: "website",
    url: "https://astrokalki.com/patterns",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "AstroKalki — Patterns" }],
  },
};

const PATTERN_NUMBERS: Record<string, string> = {
  abandonment: "4",
  control: "8",
  "people-pleasing": "2",
  "emotional-numbness": "7",
  overthinking: "5",
  "self-doubt": "3",
};

export default function PatternsIndex() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Patterns" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            The Pattern Library
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Same pain.<br/>
            <span className="text-[#7a7a7a]">Different face.</span><br/>
            <span className="text-[#c9a96e] italic">Same pattern.</span>
          </h1>
          <p className="text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Two layers of the same work. The structured <Link href="/patterns/atlas" className="text-[#c9a96e] underline decoration-[#c9a96e]/40 underline-offset-4">Pattern Atlas</Link> —
            ten archetypal patterns with the same nine-field diagnostic structure. And the
            six long-form <em className="text-[#cfcabf]">essays</em> — the interior of the
            internal loops, written as a single piece each.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16">
        {/* Atlas section — primary */}
        <section className="mb-20">
          <div className="flex items-baseline justify-between mb-8">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 font-light">
              The Pattern Atlas
            </p>
            <Link
              href="/patterns/atlas"
              className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors"
            >
              View all {ATLAS_PATTERNS.length} →
            </Link>
          </div>
          <ul className="border-t border-white/[0.06]">
            {ATLAS_PATTERNS.slice(0, 5).map((p) => (
              <li key={p.slug} className="border-b border-white/[0.06]">
                <Link
                  href={`/patterns/atlas/${p.slug}`}
                  className="block py-6 group hover:bg-white/[0.01] transition-colors -mx-4 px-4"
                >
                  <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-1 group-hover:text-[#c9a96e] transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-sm text-[#9a9a9a] font-serif italic font-light leading-[1.6]">
                    {p.tagline}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Long-form essays section */}
        <section>
          <div className="flex items-baseline justify-between mb-8">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 font-light">
              The Long-Form Essays
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
              {PILLAR_ARTICLES.length} essays
            </p>
          </div>
          <ul className="border-t border-white/[0.06]">
            {PILLAR_ARTICLES.map((a) => (
              <li key={a.slug} className="border-b border-white/[0.06]">
                <Link
                  href={`/patterns/${a.slug}`}
                  className="block py-8 group grid grid-cols-12 gap-6 items-baseline hover:bg-white/[0.01] transition-colors -mx-4 px-4"
                >
                  <span className="col-span-2 sm:col-span-1 text-[#c9a96e] font-serif font-light text-3xl leading-none italic">
                    {PATTERN_NUMBERS[a.patternKey]}
                  </span>
                  <div className="col-span-10 sm:col-span-11">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 font-light">
                      {a.targetKeyword}
                    </p>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-light tracking-[-0.015em] text-[#f0eee9] group-hover:text-[#c9a96e] transition-colors mb-2 leading-tight">
                      {a.title}
                    </h2>
                    <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-xl">
                      {a.subtitle}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-20 pt-10 border-t border-white/[0.06] text-center">
          <p className="text-[#9a9a9a] text-base leading-[1.8] font-light mb-8 max-w-md mx-auto">
            Don't know which pattern is yours? The micro-reading will tell you, in 60 seconds.
          </p>
          <Link
            href="/#micro-reading"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Take the micro-reading
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
