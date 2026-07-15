import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { GUIDES } from "@/lib/content/guides";
import { AUTHOR } from "@/lib/content/author";

/**
 * Guides hub — landing page for the 3 monster pillar guides.
 *
 * These are the long-form (3,000-5,000 word), citation-magnet
 * canonical references that aggregate a cluster's knowledge into
 * a single deep dive. Every future article on the site should
 * eventually link back to one of these.
 *
 * Visual language mirrors /insights — dark bg #050505, gold accents
 * #c9a96e, serif headlines, monospace numbering, breadcrumbs component.
 */

export const metadata: Metadata = {
  title: "Guides — AstroKalki",
  description:
    "Three long-form, canonical references on relationship patterns, repeating emotional cycles, and trauma bonds / attachment / karmic relationships. The citation-magnet deep dives — every article on the site points back to one of these.",
  alternates: { canonical: "https://astrokalki.com/guides" },
  openGraph: {
    title: "AstroKalki Guides — The canonical references",
    description:
      "Long-form pillar guides on relationship patterns, repeating emotional cycles, and trauma bonds. The deep dives everything else on the site points back to.",
    type: "website",
    url: "https://astrokalki.com/guides",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki Guides — The canonical references",
    description:
      "Long-form pillar guides on relationship patterns, repeating emotional cycles, and trauma bonds. The deep dives everything else on the site points back to.",
  },
  keywords: [
    "relationship patterns guide",
    "repeating emotional cycles",
    "trauma bonds",
    "attachment styles",
    "karmic relationships",
    "astrology psychology",
    "pattern recognition",
    "shadow work",
  ],
};

export default function GuidesHub() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Guides" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Guides
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            The canonical references.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Three long-form deep dives — each 3,000 to 5,000 words, fully
            referenced, written to be the resource other sites cite and every
            article on AstroKalki points back to. These are not blog posts.
            They are the canonical reference for their topic: the mechanism, the
            variants, the signature moments, and the actual work of changing the
            pattern.
          </p>
          <p className="mt-8 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            {GUIDES.length} guides · {GUIDES.reduce((sum, g) => sum + g.readTime, 0)} minutes of reading
          </p>
        </div>
      </header>

      {/* Guide list */}
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="space-y-6">
          {GUIDES.map((guide, idx) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="block group p-6 sm:p-8 border border-white/[0.05] hover:border-[#c9a96e]/25 transition-colors"
            >
              <div className="flex items-start gap-6">
                <span className="text-[#c9a96e]/50 font-mono text-xs pt-1 shrink-0 hidden sm:block">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-base sm:text-lg text-[#cfcabf] font-serif italic leading-[1.6] mb-4">
                    {guide.headline}
                  </p>
                  <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] mb-4">
                    {guide.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                    <span>{guide.readTime} min read</span>
                    <span>·</span>
                    <time dateTime={guide.publishedAt}>
                      {new Date(guide.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                      })}
                    </time>
                    <span>·</span>
                    <span className="text-[#c9a96e]/60">
                      {guide.tableOfContents.length} sections
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-24 pt-12 border-t border-white/[0.04] text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
            About the work
          </p>
          <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] max-w-xl mx-auto mb-8">
            These guides consolidate what {AUTHOR.name} has written across the
            insights clusters into single canonical references. The method behind
            them is documented in full on the methodology page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] tracking-[0.3em] uppercase">
            <Link
              href="/methodology"
              className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              The methodology
            </Link>
            <Link
              href="/#booking"
              className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Book a session
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
