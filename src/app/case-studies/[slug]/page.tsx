import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/content/markdown";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";
import { CASE_STUDY_SEEDS, CASE_STUDY_BY_SLUG } from "@/lib/content/case-study-seed";

/**
 * Individual case study page — long-form editorial narrative.
 *
 * Renders the 4 sections (Problem → Pattern → Session → Shift) with large
 * Playfair Display headings. Includes:
 *   - Breadcrumbs: Home → Case Studies → Title
 *   - Client initials + age + pattern tag header
 *   - "The pattern recognized" callout linking to the Atlas pattern page
 *   - "Book a session" CTA at the bottom
 *   - Article + FAQPage JSON-LD schema
 *   - Related case studies at the bottom (same pattern, excluding self)
 *   - Consent notice: "Shared with client consent. Identifying details changed."
 *
 * generateStaticParams pre-renders the seed slugs at build time. DB-added
 * case studies are rendered on demand (dynamicParams defaults to true).
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render the seed slugs at build time. DB-added slugs are rendered on
// demand at request time (default dynamicParams = true behaviour).
export async function generateStaticParams() {
  return CASE_STUDY_SEEDS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Try DB first (so admin edits reflect in metadata), fall back to seed.
  let title = "";
  let pattern = "";
  let problemExcerpt = "";
  try {
    const cs = await db.caseStudy.findUnique({ where: { slug } });
    if (cs && cs.published) {
      title = cs.title;
      pattern = cs.pattern;
      problemExcerpt = cs.problem.slice(0, 160);
    }
  } catch {
    // ignore — fall back to seed below
  }

  if (!title) {
    const seed = CASE_STUDY_BY_SLUG[slug];
    if (!seed) return { title: "Case study not found — AstroKalki" };
    title = seed.title;
    pattern = seed.pattern;
    problemExcerpt = seed.problem.slice(0, 160);
  }

  const patternMeta = getAtlasPattern(pattern);
  const description = `${title} — an anonymised AstroKalki case study. ${problemExcerpt}…`;

  return {
    title: `${title} — AstroKalki Case Study`,
    description,
    alternates: { canonical: `https://astrokalki.com/case-studies/${slug}` },
    openGraph: {
      title: `${title} — AstroKalki Case Study`,
      description,
      type: "article",
      url: `https://astrokalki.com/case-studies/${slug}`,
      siteName: "AstroKalki",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent("AstroKalki Case Study")}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — AstroKalki Case Study`,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent("AstroKalki Case Study")}`,
      ],
    },
    keywords: [
      "astrology case study",
      patternMeta?.name ?? pattern,
      "pattern recognition",
      "astrology psychology",
      "birth chart reading",
      "emotional pattern work",
    ],
  };
}

interface CaseStudyRecord {
  id: string;
  slug: string;
  title: string;
  pattern: string;
  clientInitials: string;
  clientAge: number | null;
  consentGiven: boolean;
  problem: string;
  patternSection: string;
  session: string;
  shift: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function getCaseStudy(slug: string): Promise<CaseStudyRecord | null> {
  // Try DB first.
  try {
    const cs = await db.caseStudy.findUnique({ where: { slug } });
    if (cs) {
      // Unpublished case studies are not viewable publicly.
      if (!cs.published) return null;
      return cs;
    }
  } catch (err) {
    console.error("[case-studies] Single-page DB query failed:", err);
  }

  // Fall back to seed (and seed the DB on first access so admin can edit
  // going forward).
  const seed = CASE_STUDY_BY_SLUG[slug];
  if (!seed) return null;

  try {
    const created = await db.caseStudy.create({
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
    });
    return created;
  } catch {
    // Race condition (another request seeded it first) — re-read.
    try {
      const cs = await db.caseStudy.findUnique({ where: { slug } });
      return cs && cs.published ? cs : null;
    } catch {
      return null;
    }
  }
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const caseStudy = await getCaseStudy(slug);
  if (!caseStudy) notFound();

  const patternMeta = getAtlasPattern(caseStudy.pattern);
  const patternName = patternMeta?.name ?? caseStudy.pattern;

  // Related case studies — same pattern, excluding self. Fall back to any
  // other published case study if none share the pattern.
  let related: { slug: string; title: string; pattern: string; clientInitials: string }[] = [];
  try {
    const samePattern = await db.caseStudy.findMany({
      where: {
        published: true,
        pattern: caseStudy.pattern,
        slug: { not: caseStudy.slug },
      },
      take: 3,
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true, pattern: true, clientInitials: true },
    });

    if (samePattern.length > 0) {
      related = samePattern;
    } else {
      const others = await db.caseStudy.findMany({
        where: {
          published: true,
          slug: { not: caseStudy.slug },
        },
        take: 3,
        orderBy: { createdAt: "asc" },
        select: { slug: true, title: true, pattern: true, clientInitials: true },
      });
      related = others;
    }
  } catch (err) {
    console.error("[case-studies] Related query failed:", err);
  }

  // Approximate word count for the readTime field.
  const totalWords =
    caseStudy.problem.split(/\s+/).length +
    caseStudy.patternSection.split(/\s+/).length +
    caseStudy.session.split(/\s+/).length +
    caseStudy.shift.split(/\s+/).length;
  const readTime = Math.max(5, Math.round(totalWords / 220));

  // ─── JSON-LD: Article ────────────────────────────────────────────────
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: caseStudy.title,
    description: caseStudy.problem.slice(0, 200),
    articleSection: "Case Study",
    inLanguage: "en",
    datePublished: caseStudy.createdAt.toISOString(),
    dateModified: caseStudy.updatedAt.toISOString(),
    wordCount: totalWords,
    author: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
    },
    publisher: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
      logo: {
        "@type": "ImageObject",
        url: "https://astrokalki.com/logo.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://astrokalki.com/case-studies/${caseStudy.slug}`,
    },
    about: patternMeta
      ? { "@type": "Thing", name: patternMeta.name }
      : undefined,
    keywords: [
      "astrology case study",
      patternName,
      "pattern recognition",
      "astrology psychology",
    ].join(", "),
  };

  // ─── JSON-LD: FAQPage ────────────────────────────────────────────────
  // Case studies answer implicit questions — surface them as FAQPage so
  // AI systems can cite the structured answers.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is the ${patternName} pattern in astrology?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: patternMeta?.conciseAnswer ?? `The ${patternName} is one of the patterns decoded through the AstroKalki Pattern Atlas.`,
        },
      },
      {
        "@type": "Question",
        name: `How does an AstroKalki session work with the ${patternName.toLowerCase()} pattern?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The session reads the pattern in the client's chart and in their history at the same time. In this case study, the client (${caseStudy.clientInitials}${caseStudy.clientAge !== null ? `, ${caseStudy.clientAge}` : ""}) arrived with a specific problem; the chart located the pattern's origin and architecture; the session named the structure; and a specific shift followed.`,
        },
      },
      {
        "@type": "Question",
        name: "Are these case studies real?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every case study is from a real session. Names are reduced to first-initial + age, identifying details have been changed, and each case study is shared with the client's explicit consent.",
        },
      },
    ],
  };

  // ─── Sections array (rendered in order) ──────────────────────────────
  const SECTIONS = [
    { num: "01", label: "Problem", body: caseStudy.problem },
    { num: "02", label: "The Pattern", body: caseStudy.patternSection },
    { num: "03", label: "The Session", body: caseStudy.session },
    { num: "04", label: "The Shift", body: caseStudy.shift },
  ] as const;

  return (
    <article className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Case Studies", href: "/case-studies" },
                { label: caseStudy.title },
              ]}
            />
          </div>

          {/* Pattern + initials row */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/80 font-light">
              {patternName}
            </span>
            <span className="text-[#3a3a3a]">·</span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#9a9a9a] font-light">
              {caseStudy.clientInitials}
              {caseStudy.clientAge !== null ? `, ${caseStudy.clientAge}` : ""}
            </span>
            <span className="text-[#3a3a3a]">·</span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light">
              {readTime} min read
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {caseStudy.title}
          </h1>

          {patternMeta && (
            <p className="text-base sm:text-lg text-[#cfcabf] font-serif italic font-light leading-[1.6] mb-8">
              {patternMeta.tagline}
            </p>
          )}

          {/* Consent notice */}
          <div className="pt-6 border-t border-white/[0.04]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light flex items-center gap-2">
              <span className="size-1 rounded-full bg-[#c9a96e]/60" />
              Shared with client consent. Identifying details changed.
            </p>
          </div>
        </div>
      </header>

      {/* ─── The 4 numbered sections ────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        {SECTIONS.map((section, idx) => (
          <section
            key={section.num}
            className={idx > 0 ? "mt-24 pt-16 border-t border-white/[0.04]" : ""}
          >
            {/* Section number — Cinzel, small caps, gold */}
            <p
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] mb-4 font-light"
              style={{ fontFamily: "Cinzel, Georgia, serif" }}
            >
              {section.num} — {section.label}
            </p>

            {/* Large Playfair heading — text-3xl */}
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-10">
              {section.label === "Problem" && "What brought them in."}
              {section.label === "The Pattern" && "What the chart named."}
              {section.label === "The Session" && "What happened in the room."}
              {section.label === "The Shift" && "What changed."}
            </h2>

            <div
              className="case-study-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }}
            />
          </section>
        ))}

        {/* ─── "The pattern recognized" callout ────────────────────────── */}
        {patternMeta && (
          <section className="mt-20 pt-10 border-t border-white/[0.06]">
            <div className="bg-white/[0.015] border-l-2 border-[#c9a96e]/30 p-6">
              <p
                className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-3 font-light"
                style={{ fontFamily: "Cinzel, Georgia, serif" }}
              >
                The pattern recognized
              </p>
              <p className="text-lg sm:text-xl text-[#f0eee9] font-serif font-light leading-[1.5] mb-3">
                {patternMeta.name}
              </p>
              <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] mb-5">
                {patternMeta.conciseAnswer}
              </p>
              <Link
                href={`/patterns/atlas/${patternMeta.slug}`}
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Read the full pattern in the Atlas
                <span>→</span>
              </Link>
            </div>
          </section>
        )}

        {/* ─── Methodology link ────────────────────────────────────────── */}
        <section className="mt-16 pt-10 border-t border-white/[0.06]">
          <p
            className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-3 font-light"
            style={{ fontFamily: "Cinzel, Georgia, serif" }}
          >
            How this work is done
          </p>
          <p className="text-[#9a9a9a] text-sm font-light leading-[1.7] mb-4 max-w-xl">
            AstroKalki uses the birth chart as a diagnostic instrument — not a
            forecast. The methodology names the pattern in your chart and your
            history at the same time. When both agree, the pattern stops being
            a story you tell about yourself and becomes a structure you can see
            from above.
          </p>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
          >
            Read the methodology
            <span>→</span>
          </Link>
        </section>

        {/* ─── "Book a session" CTA ────────────────────────────────────── */}
        <section className="mt-16 pt-10 border-t border-white/[0.06] text-center">
          <p
            className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light"
            style={{ fontFamily: "Cinzel, Georgia, serif" }}
          >
            If this is your pattern
          </p>
          <p className="text-base text-[#cfcabf] font-light leading-[1.8] mb-6 max-w-md mx-auto">
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
        </section>

        {/* ─── Related case studies ────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-20 pt-10 border-t border-white/[0.06]">
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-6 font-light"
              style={{ fontFamily: "Cinzel, Georgia, serif" }}
            >
              Continue reading
            </p>
            <div className="space-y-6">
              {related.map((r) => {
                const relPatternMeta = getAtlasPattern(r.pattern);
                return (
                  <Link
                    key={r.slug}
                    href={`/case-studies/${r.slug}`}
                    className="block group"
                  >
                    <p className="text-[#c9a96e] text-xs font-serif italic mb-1">
                      {relPatternMeta?.name ?? r.pattern} · {r.clientInitials}
                    </p>
                    <p className="text-[#f0eee9] text-lg font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
                      {r.title} →
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Back to all case studies ────────────────────────────────── */}
        <div className="mt-16 pt-10 border-t border-white/[0.06]">
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
          >
            <span>←</span>
            All case studies
          </Link>
        </div>
      </div>
    </article>
  );
}
