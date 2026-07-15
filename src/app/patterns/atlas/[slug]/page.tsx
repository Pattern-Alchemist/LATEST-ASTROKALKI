import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { ATLAS_PATTERNS, getAtlasPattern } from "@/lib/content/patterns/atlas";
import { ARTICLE_BY_SLUG } from "@/lib/content/articles";
import { SERVICES } from "@/lib/content/services";

/**
 * Atlas pattern page — renders the structured nine-field format.
 *
 * SEO structure:
 *   - <h1> = pattern.name
 *   - First 100-150 words = conciseAnswer (AI Overview optimisation)
 *   - <h2> = each of the nine structured fields
 *   - Article schema JSON-LD with author = AstroKalki
 *   - DefinedTerm schema JSON-LD (the pattern as a defined concept — this is
 *     what helps AI systems cite the pattern as a recognised term)
 *   - Internal links to related articles + related service
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ATLAS_PATTERNS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pattern = getAtlasPattern(slug);
  if (!pattern) return { title: "Pattern not found — AstroKalki" };

  // AI-generated social card endpoint — streams the AI PNG if one has been
  // generated for this slug, otherwise 307-redirects to /api/og which
  // renders the programmatic fallback poster.
  const socialImageUrl = `/api/ai/social-image/${slug}`;

  return {
    title: `${pattern.name} — AstroKalki`,
    description: pattern.metaDescription,
    alternates: { canonical: `https://astrokalki.com/patterns/atlas/${slug}` },
    openGraph: {
      title: `${pattern.name} — AstroKalki`,
      description: pattern.metaDescription,
      type: "article",
      url: `https://astrokalki.com/patterns/atlas/${slug}`,
      siteName: "AstroKalki",
      images: [
        { url: socialImageUrl, width: 1344, height: 768, alt: pattern.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pattern.name,
      description: pattern.metaDescription,
      images: [socialImageUrl],
    },
    keywords: [
      pattern.targetKeyword,
      pattern.name.toLowerCase(),
      "emotional pattern",
      "psychological pattern",
      "astrology",
      "pattern recognition",
    ],
  };
}

const SECTION_FIELDS: {
  key:
    | "symptoms"
    | "howItShowsUp"
    | "whereItBegins"
    | "relationshipImpact"
    | "careerImpact"
    | "shadowSide"
    | "whatPeopleMistakeItFor";
  label: string;
  type: "list" | "paragraph";
}[] = [
  { key: "symptoms", label: "Symptoms", type: "list" },
  { key: "howItShowsUp", label: "How it shows up", type: "list" },
  { key: "whereItBegins", label: "Where it begins", type: "paragraph" },
  { key: "relationshipImpact", label: "Relationship impact", type: "paragraph" },
  { key: "careerImpact", label: "Career impact", type: "paragraph" },
  { key: "shadowSide", label: "Shadow side", type: "paragraph" },
  { key: "whatPeopleMistakeItFor", label: "What people mistake it for", type: "paragraph" },
];

export default async function AtlasPatternPage({ params }: PageProps) {
  const { slug } = await params;
  const pattern = getAtlasPattern(slug);
  if (!pattern) notFound();

  // Resolve internal links
  const relatedArticles = pattern.relatedArticles
    .map((s) => ARTICLE_BY_SLUG[s])
    .filter(Boolean);
  const relatedService = SERVICES.find((s) => s.slug === pattern.relatedService);

  // Find next pattern for "Continue reading" CTA
  const idx = ATLAS_PATTERNS.findIndex((p) => p.slug === slug);
  const next = ATLAS_PATTERNS[(idx + 1) % ATLAS_PATTERNS.length];

  // Article schema for AI / search
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pattern.name,
    description: pattern.metaDescription,
    author: { "@type": "Organization", name: "AstroKalki", url: "https://astrokalki.com" },
    publisher: { "@type": "Organization", name: "AstroKalki" },
    keywords: [pattern.targetKeyword, pattern.name, "psychological pattern"].join(", "),
    articleSection: "Psychology",
    inLanguage: "en",
    url: `https://astrokalki.com/patterns/atlas/${slug}`,
  };

  // DefinedTerm schema — this signals to AI systems that this pattern is a
  // recognised, defined concept (not just an article). This is what helps
  // the pattern become a citable entity in AI Overviews / Perplexity.
  const definedTermSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: pattern.name,
    description: pattern.conciseAnswer,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "AstroKalki Pattern Atlas",
      url: "https://astrokalki.com/patterns/atlas",
    },
    url: `https://astrokalki.com/patterns/atlas/${slug}`,
  };

  return (
    <article className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }}
      />

      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Pattern Atlas", href: "/patterns/atlas" },
                { label: pattern.name },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Pattern Atlas · {pattern.readTime} min read
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {pattern.name}
          </h1>
          <p className="text-lg sm:text-xl text-[#cfcabf] font-serif italic font-light leading-[1.5] mb-8">
            {pattern.tagline}
          </p>
          <div className="pt-6 border-t border-white/[0.04]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              Chart signature
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
              {pattern.chartSignature}
            </p>
          </div>
        </div>
      </header>

      {/* Body — concise answer (AI Overview bait) */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        <section className="mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Quick answer
          </p>
          <p className="text-lg sm:text-xl text-[#f0eee9] font-serif font-light leading-[1.7]">
            {pattern.conciseAnswer}
          </p>
        </section>

        {/* Nine structured sections */}
        {SECTION_FIELDS.map((section) => (
          <section key={section.key} className="mb-14 pt-10 border-t border-white/[0.06]">
            <h2 className="text-xl sm:text-2xl font-serif text-[#c9a96e] font-light tracking-[-0.01em] mb-6">
              {section.label}
            </h2>
            {section.type === "list" ? (
              <ul className="space-y-4">
                {(pattern[section.key] as string[]).map((item, i) => (
                  <li
                    key={i}
                    className="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light flex gap-3"
                  >
                    <span className="text-[#c9a96e] shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
                {pattern[section.key] as string}
              </p>
            )}
          </section>
        ))}

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="mb-14 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              Related articles
            </p>
            <ul className="space-y-4">
              {relatedArticles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/insights/${article.slug}`}
                    className="text-[#cfcabf] hover:text-[#c9a96e] transition-colors text-base sm:text-lg font-serif font-light leading-[1.6] block group"
                  >
                    <span className="text-[#c9a96e]/40 font-mono text-xs mr-3">→</span>
                    <span className="group-hover:underline decoration-[#c9a96e]/40 underline-offset-4">
                      {article.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Related service */}
        {relatedService && (
          <section className="mb-14 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              The session for this pattern
            </p>
            <Link
              href={`/services/${relatedService.slug}`}
              className="block group p-6 border border-white/[0.06] hover:border-[#c9a96e]/30 transition-colors"
            >
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2 font-light">
                {relatedService.targetKeyword}
              </p>
              <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
                {relatedService.title}
              </h3>
              <p className="text-[#cfcabf] font-serif italic font-light leading-[1.6] mb-3">
                {relatedService.headline}
              </p>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
                From {relatedService.pricing[0]?.price} · {relatedService.pricing[0]?.duration}
              </p>
            </Link>
          </section>
        )}

        {/* Method CTA */}
        <section className="mb-14 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            How this pattern is decoded
          </p>
          <p className="text-[#cfcabf] text-base leading-[1.85] font-light mb-6">
            Every pattern in the Atlas is decoded through the same five-step
            framework — pattern recognition, emotional origin, karmic
            reinforcement, behavioural expression, conscious intervention.
            This is the Mirror Method.
          </p>
          <Link
            href="/method"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
          >
            The Mirror Method
            <span>→</span>
          </Link>
        </section>

        {/* Continue reading */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
            Continue through the Atlas
          </p>
          <Link href={`/patterns/atlas/${next.slug}`} className="block group">
            <p className="text-[#c9a96e] text-sm font-serif font-light italic mb-1">
              {String(idx + 2).padStart(2, "0")} / {ATLAS_PATTERNS.length}
            </p>
            <p className="text-[#f0eee9] text-xl font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
              {next.name} →
            </p>
          </Link>
        </div>
      </div>
    </article>
  );
}
