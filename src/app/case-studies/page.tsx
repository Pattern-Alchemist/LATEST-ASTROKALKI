import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { db } from "@/lib/db";
import { CASE_STUDY_SEEDS } from "@/lib/content/case-study-seed";
import { ATLAS_PATTERNS, getAtlasPattern } from "@/lib/content/patterns/atlas";

/**
 * /case-studies — public case studies index.
 *
 * Long-form anonymised client journeys, structured as
 *   Problem → Pattern → Session → Shift.
 *
 * These are deep trust signals. They demonstrate the AstroKalki method in
 * practice — not through vague praise ("life-changing!") but through the
 * specificity of the recognition.
 *
 * Server component. Reads published case studies from the DB. If the DB is
 * empty (first run), seeds the 3 initial case studies from
 * /src/lib/content/case-study-seed.ts.
 *
 * Design matches /insights hub: dark editorial, cluster-style cards, gold
 * accent, Playfair Display headings.
 */

export const metadata: Metadata = {
  title: "Case Studies — AstroKalki",
  description:
    "Anonymised long-form client journeys — Problem, Pattern, Session, Shift. The specificity is the evidence. The pattern, named, is the work.",
  alternates: { canonical: "https://astrokalki.com/case-studies" },
  openGraph: {
    title: "AstroKalki Case Studies — The Method in Practice",
    description:
      "Long-form anonymised client journeys. Each one walks through the problem, the pattern the chart named, the session, and the shift that followed.",
    type: "website",
    url: "https://astrokalki.com/case-studies",
    siteName: "AstroKalki",
  },
  keywords: [
    "astrology case study",
    "pattern recognition astrology",
    "birth chart reading example",
    "emotional pattern work",
    "karmic relationship reading",
    "shadow work session",
    "astrology psychology session",
  ],
};

// Pattern label lookup — falls back to the raw slug.
const PATTERN_LABELS: Record<string, string> = Object.fromEntries(
  ATLAS_PATTERNS.map((p) => [p.slug, p.name])
);

interface CaseStudyListItem {
  id: string;
  slug: string;
  title: string;
  pattern: string;
  clientInitials: string;
  clientAge: number | null;
  consentGiven: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  excerpt: string;
}

async function getPublishedCaseStudies(): Promise<CaseStudyListItem[]> {
  // First access — if the DB has no case studies at all, seed the 3 initial
  // ones. Idempotent: if any case study already exists, skip seeding.
  try {
    const count = await db.caseStudy.count();
    if (count === 0) {
      await Promise.all(
        CASE_STUDY_SEEDS.map((seed) =>
          db.caseStudy.create({
            data: {
              slug: seed.slug,
              title: seed.title,
              pattern: seed.pattern,
              clientInitials: seed.clientInitials,
              clientAge: seed.clientAge,
              consentGiven: seed.consentGiven,
              problem: seed.problem,
              patternSection: seed.patternSection,
              session: seed.session,
              shift: seed.shift,
              published: true,
            },
          })
        )
      );
      console.log("[case-studies] Seeded %d initial case studies", CASE_STUDY_SEEDS.length);
    }
  } catch (err) {
    // Seeding failure is non-fatal — fall through to the read query, which
    // will simply return an empty list.
    console.error("[case-studies] Seeding failed:", err);
  }

  const rows = await db.caseStudy.findMany({
    where: { published: true },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      pattern: true,
      clientInitials: true,
      clientAge: true,
      consentGiven: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      problem: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    excerpt: r.problem.slice(0, 240).trim() + (r.problem.length > 240 ? "…" : ""),
  }));
}

export default async function CaseStudiesHub() {
  let caseStudies: CaseStudyListItem[] = [];
  try {
    caseStudies = await getPublishedCaseStudies();
  } catch (err) {
    console.error("[case-studies] Hub query failed:", err);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Case Studies" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Case Studies
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            The method, in practice.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Anonymised long-form client journeys. Each one walks through the
            problem the client arrived with, the pattern the chart named, the
            session itself, and the shift that followed. Specificity is the
            only evidence that matters in this work — vague praise means
            nothing. The pattern, named, means everything.
          </p>
        </div>
      </header>

      {/* Cards */}
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {caseStudies.length === 0 ? (
          <div className="border border-white/[0.04] py-20 text-center">
            <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
              No case studies published yet. New anonymised journeys will appear
              here once they are reviewed and shared with client consent.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {caseStudies.map((cs, idx) => {
              const patternName = PATTERN_LABELS[cs.pattern] || cs.pattern;
              const patternMeta = getAtlasPattern(cs.pattern);
              return (
                <Link
                  key={cs.id}
                  href={`/case-studies/${cs.slug}`}
                  className="block group p-6 sm:p-8 border border-white/[0.05] hover:border-[#c9a96e]/25 transition-colors"
                >
                  <div className="flex items-start gap-6">
                    <span
                      className="text-[#c9a96e]/50 font-mono text-xs pt-1 shrink-0 hidden sm:block"
                      style={{ fontFamily: "Cinzel, Georgia, serif" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      {/* Pattern tag + initials row */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 font-light">
                          {patternName}
                        </span>
                        <span className="text-[#3a3a3a]">·</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
                          {cs.clientInitials}
                          {cs.clientAge !== null ? `, ${cs.clientAge}` : ""}
                        </span>
                        {patternMeta && (
                          <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] italic font-serif">
                            {patternMeta.tagline}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
                        {cs.title}
                      </h2>

                      <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] mb-4 line-clamp-3">
                        {cs.excerpt}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                        <span>Problem · Pattern · Session · Shift</span>
                        <span>·</span>
                        <time dateTime={cs.createdAt.toISOString()}>
                          {cs.createdAt.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Honesty note — same tone as /testimonials */}
        <div className="mt-16 pt-10 border-t border-white/[0.04]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            A note on these journeys
          </p>
          <p className="text-sm text-[#9a9a9a] font-light leading-[1.8] max-w-2xl">
            Every case study here is from a real session. Names are reduced to
            first-initial + age. Identifying details have been changed. Each
            journey is shared with the client&apos;s explicit consent — and only
            because the pattern it names is one that other people are likely
            living inside of without naming it. If you recognise your own
            pattern in one of these, that recognition is the beginning of the
            work — not the end.
          </p>
        </div>

        {/* CTA — book a session */}
        <div className="mt-16 pt-10 border-t border-white/[0.04] text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            If a pattern here is yours
          </p>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            The next move is naming it in your own chart — and in your own
            history. That is what a session is.
          </p>
          <Link
            href="/#booking"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Book a session
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
