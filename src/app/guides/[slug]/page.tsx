import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import {
  GUIDES,
  GUIDE_BY_SLUG,
  getRelatedGuides,
  getGuideBySlug,
} from "@/lib/content/guides";
import { AUTHOR } from "@/lib/content/author";
import { ARTICLE_BY_SLUG } from "@/lib/content/articles";
import { SERVICE_BY_SLUG } from "@/lib/content/services";
import { renderMarkdown } from "@/lib/content/markdown";
import AudioPlayer from "@/components/astrokalki/audio-player";

/**
 * Guide page — long-form pillar article (3,000-5,000 words) with the
 * AI-search-optimization structure used across AstroKalki:
 *
 *   - <h1> = guide title
 *   - concise answer section (for Google AI Overviews / Perplexity)
 *   - key takeaways (for skimmers + AI citation)
 *   - table of contents (anchor links to body sections)
 *   - long-form markdown body (3000-5000 words, ## section headings)
 *   - related service CTA (soft, not pushy)
 *   - FAQs (with FAQPage JSON-LD schema)
 *   - references (for E-E-A-T)
 *   - author bio (for entity association)
 *   - continue reading (other guides)
 *   - related articles (cross-linking into insights clusters)
 *
 * Pre-rendered at build time for all known guide slugs.
 *
 * Body H2s are post-processed so each gets the matching id from
 * tableOfContents — this makes the TOC anchor links functional.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guide not found — AstroKalki" };

  const keywords = [guide.targetKeyword, ...guide.secondaryKeywords];

  // AI-generated social card endpoint — streams the AI PNG if one has been
  // generated for this slug, otherwise 307-redirects to /api/og which
  // renders the programmatic fallback poster.
  const socialImageUrl = `/api/ai/social-image/${slug}`;

  return {
    title: `${guide.title} — AstroKalki`,
    description: guide.metaDescription,
    alternates: { canonical: `https://astrokalki.com/guides/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      type: "article",
      url: `https://astrokalki.com/guides/${slug}`,
      siteName: "AstroKalki",
      images: [
        {
          url: socialImageUrl,
          width: 1344,
          height: 768,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.metaDescription,
      images: [socialImageUrl],
    },
    keywords,
    authors: [{ name: AUTHOR.name, url: `https://astrokalki.com/author/${AUTHOR.slug}` }],
    creator: AUTHOR.name,
    publisher: AUTHOR.name,
  };
}

/**
 * Inject id attributes into rendered <h2> tags based on the guide's
 * tableOfContents mapping (id <-> title). Uses split/join to avoid
 * regex special-character pitfalls in titles (em-dashes, apostrophes,
 * question marks). Titles that don't match a body H2 are silently skipped.
 */
function injectHeadingIds(
  html: string,
  toc: { id: string; title: string }[]
): string {
  // The exact opening <h2 ...> tag emitted by renderMarkdown for ## headings.
  const h2Open =
    '<h2 class="text-2xl sm:text-3xl font-serif text-[#c9a96e] mt-14 mb-6 font-light tracking-[-0.015em]">';
  let out = html;
  for (const entry of toc) {
    const target = `${h2Open}${entry.title}</h2>`;
    const replacement = `<h2 id="${entry.id}" class="text-2xl sm:text-3xl font-serif text-[#c9a96e] mt-14 mb-6 font-light tracking-[-0.015em] scroll-mt-24">${entry.title}</h2>`;
    out = out.split(target).join(replacement);
  }
  return out;
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const relatedGuides = getRelatedGuides(guide, 2);
  const relatedService = guide.relatedService
    ? SERVICE_BY_SLUG[guide.relatedService]
    : undefined;
  const relatedArticles = guide.relatedArticles
    .map((s) => ARTICLE_BY_SLUG[s])
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const bodyHtml = injectHeadingIds(renderMarkdown(guide.body), guide.tableOfContents);

  // Article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    keywords: [guide.targetKeyword, ...guide.secondaryKeywords].join(", "),
    articleSection: "Guide",
    inLanguage: "en",
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    wordCount: guide.body.split(/\s+/).length + guide.conciseAnswer.split(/\s+/).length,
    author: {
      "@type": "Person",
      name: AUTHOR.name,
      url: `https://astrokalki.com/author/${AUTHOR.slug}`,
      sameAs: AUTHOR.sameAs,
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
      "@id": `https://astrokalki.com/guides/${guide.slug}`,
    },
  };

  // FAQ schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

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

      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Guides", href: "/guides" },
                { label: guide.title },
              ]}
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c9a96e]" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/80 font-light">
              Guide · {guide.readTime} min read
            </p>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {guide.title}
          </h1>

          <p className="text-lg sm:text-xl text-[#cfcabf] font-serif italic leading-[1.6] max-w-2xl">
            {guide.headline}
          </p>

          <div className="mt-8 flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
            <span>
              By <span className="text-[#c9a96e]">{AUTHOR.name}</span>
            </span>
            <span>·</span>
            <time dateTime={guide.publishedAt}>
              {new Date(guide.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {guide.updatedAt && guide.updatedAt !== guide.publishedAt && (
              <>
                <span>·</span>
                <span>
                  Updated{" "}
                  <time dateTime={guide.updatedAt}>
                    {new Date(guide.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                    })}
                  </time>
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Audio narration player — auto-hides if no narration has been
          generated for this slug yet. Probes /api/tts/[slug] on mount. */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10">
          <AudioPlayer slug={slug} />
        </div>
      </section>

      {/* Concise answer — for AI search citation */}
      <section className="border-b border-white/[0.04] bg-white/[0.015]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10 sm:py-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Concise answer
          </p>
          <p className="text-base sm:text-lg text-[#dcdad4] font-light leading-[1.8]">
            {guide.conciseAnswer}
          </p>
        </div>
      </section>

      {/* Key takeaways */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10 sm:py-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Key takeaways
          </p>
          <ul className="list-none space-y-4">
            {guide.keyTakeaways.map((kt, idx) => (
              <li
                key={idx}
                className="text-[#cfcabf] text-base sm:text-lg leading-[1.7] font-light flex gap-4"
              >
                <span className="text-[#c9a96e] font-mono text-sm pt-1 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>{kt}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Table of contents */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10 sm:py-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Table of contents
          </p>
          <ol className="list-none space-y-2">
            {guide.tableOfContents.map((toc, idx) => (
              <li key={toc.id} className="flex gap-4">
                <span className="text-[#c9a96e]/50 font-mono text-xs pt-1 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <a
                  href={`#${toc.id}`}
                  className="text-[#cfcabf] text-sm sm:text-base font-light leading-[1.6] hover:text-[#c9a96e] transition-colors"
                >
                  {toc.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Body — long-form markdown */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        {/* Related service CTA — soft, not pushy */}
        {relatedService && (
          <div className="mt-20 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
              If this is your pattern
            </p>
            <Link
              href={`/services/${relatedService.slug}`}
              className="block group p-6 border border-white/[0.06] hover:border-[#c9a96e]/30 transition-colors"
            >
              <p className="text-[#c9a96e] text-sm font-serif italic mb-2">
                {relatedService.title}
              </p>
              <p className="text-[#f0eee9] text-xl font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
                {relatedService.headline}
              </p>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mt-4">
                Learn more →
              </p>
            </Link>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-6 font-light">
            Frequently asked questions
          </p>
          <div className="space-y-8">
            {guide.faqs.map((faq, idx) => (
              <div key={idx}>
                <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light mb-3 tracking-[-0.01em]">
                  {faq.q}
                </h3>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-6 font-light">
            References &amp; further reading
          </p>
          <ul className="list-none space-y-4">
            {guide.references.map((ref, idx) => (
              <li
                key={idx}
                className="text-[#9a9a9a] text-sm leading-[1.7] font-light flex gap-3"
              >
                <span className="text-[#c9a96e]/60 font-mono text-xs pt-1 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>
                  {ref.author && <span className="text-[#cfcabf]">{ref.author} </span>}
                  {ref.url ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="italic underline decoration-[#c9a96e]/30 hover:decoration-[#c9a96e] underline-offset-4 transition-colors"
                    >
                      {ref.title}
                    </a>
                  ) : (
                    <span className="italic">{ref.title}</span>
                  )}
                  {ref.year && <span> ({ref.year})</span>}
                  {ref.source && <span className="text-[#5a5a5a]"> — {ref.source}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Author bio */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-6 font-light">
            About the author
          </p>
          <Link href={`/author/${AUTHOR.slug}`} className="block group">
            <p className="text-[#c9a96e] text-sm font-serif italic mb-2">
              {AUTHOR.name}
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.7] font-light max-w-xl">
              {AUTHOR.bioShort}
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mt-4 group-hover:text-[#c9a96e] transition-colors">
              Read more →
            </p>
          </Link>
        </div>

        {/* Continue reading — related guides */}
        {relatedGuides.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
              Continue reading — more guides
            </p>
            <div className="space-y-6">
              {relatedGuides.map((rg) => (
                <Link
                  key={rg.slug}
                  href={`/guides/${rg.slug}`}
                  className="block group"
                >
                  <p className="text-[#c9a96e] text-xs font-serif italic mb-1">
                    Guide · {rg.readTime} min read
                  </p>
                  <p className="text-[#f0eee9] text-lg font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
                    {rg.title} →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related articles — cross-linking into insights clusters */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
              Related articles from the insights clusters
            </p>
            <div className="space-y-4">
              {relatedArticles.map((ra) => (
                <Link
                  key={ra.slug}
                  href={`/insights/${ra.slug}`}
                  className="block group"
                >
                  <p className="text-[#f0eee9] text-base font-serif font-light tracking-[-0.005em] group-hover:text-[#c9a96e] transition-colors">
                    {ra.title} →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
