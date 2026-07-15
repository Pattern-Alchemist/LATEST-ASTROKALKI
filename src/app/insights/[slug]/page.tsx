import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import {
  ALL_ARTICLES,
  ARTICLE_BY_SLUG,
  getRelatedArticles,
  getArticleBySlug,
} from "@/lib/content/articles";
import { CLUSTER_BY_SLUG } from "@/lib/content/clusters";
import { AUTHOR } from "@/lib/content/author";
import { SERVICES, SERVICE_BY_SLUG } from "@/lib/content/services";
import { renderMarkdown } from "@/lib/content/markdown";
import AudioPlayer from "@/components/astrokalki/audio-player";

/**
 * Article page — long-form cluster article with AI-search structure:
 *   - <h1> = article title
 *   - concise answer section (for Google AI Overviews / Perplexity)
 *   - key takeaways (for skimmers and AI citation)
 *   - long-form body (markdown, 1500+ words)
 *   - FAQs (with FAQPage JSON-LD schema)
 *   - references (for E-E-A-T signals)
 *   - author bio (for entity association)
 *   - Article + BreadcrumbList JSON-LD schema
 *
 * Pre-rendered at build time for all 20 known article slugs.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ALL_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article not found — AstroKalki" };

  const cluster = CLUSTER_BY_SLUG[article.cluster];

  // AI-generated social card endpoint — streams the AI PNG if one has been
  // generated for this slug, otherwise 307-redirects to /api/og which
  // renders the programmatic fallback poster. Either way, crawlers always
  // get a valid OG image.
  const socialImageUrl = `/api/ai/social-image/${slug}`;

  return {
    title: `${article.title} — AstroKalki`,
    description: article.metaDescription,
    alternates: { canonical: `https://astrokalki.com/insights/${slug}` },
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      type: "article",
      url: `https://astrokalki.com/insights/${slug}`,
      siteName: "AstroKalki",
      images: [
        {
          url: socialImageUrl,
          width: 1344,
          height: 768,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.metaDescription,
      images: [socialImageUrl],
    },
    keywords: [
      article.targetKeyword,
      cluster?.title ?? "",
      "emotional pattern",
      "astrology psychology",
      "pattern recognition",
    ],
    authors: [{ name: AUTHOR.name, url: `https://astrokalki.com/author/${AUTHOR.slug}` }],
    creator: AUTHOR.name,
    publisher: AUTHOR.name,
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const cluster = CLUSTER_BY_SLUG[article.cluster];
  const related = getRelatedArticles(article, 3);
  const relatedService = article.relatedService
    ? SERVICE_BY_SLUG[article.relatedService]
    : undefined;

  // Article schema — for Google's understanding of the content
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    keywords: article.targetKeyword,
    articleSection: cluster?.title,
    inLanguage: "en",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    wordCount: article.body.split(/\s+/).length + article.conciseAnswer.split(/\s+/).length,
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
      "@id": `https://astrokalki.com/insights/${article.slug}`,
    },
    about: cluster ? { "@type": "Thing", name: cluster.title } : undefined,
  };

  // FAQ schema — for rich results + AI citation
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((f) => ({
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
                { label: "Insights", href: "/insights" },
                { label: cluster?.title ?? "Article", href: `/insights#${cluster?.slug}` },
                { label: article.title },
              ]}
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: cluster?.accent ?? "#c9a96e" }}
            />
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/80 font-light">
              {cluster?.title} · {article.readTime} min read
            </p>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {article.title}
          </h1>

          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.6] max-w-2xl">
            {article.excerpt}
          </p>

          <div className="mt-8 flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
            <span>By <span className="text-[#c9a96e]">{AUTHOR.name}</span></span>
            <span>·</span>
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
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
            {article.conciseAnswer}
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
            {article.keyTakeaways.map((kt, idx) => (
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

      {/* Body — long-form markdown */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />

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

        {/* Methodology link — for in-body internal linking density per publisher directive */}
        <div className={relatedService ? "mt-6" : "mt-20 pt-10 border-t border-white/[0.06]"}>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-3 font-light">
            How this work is done
          </p>
          <p className="text-[#9a9a9a] text-sm font-light leading-[1.7] mb-4 max-w-xl">
            AstroKalki uses the birth chart as a diagnostic instrument — not a forecast. The methodology names the pattern in your chart and your history at the same time.
          </p>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
          >
            Read the methodology
            <span>→</span>
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-6 font-light">
            Frequently asked questions
          </p>
          <div className="space-y-8">
            {article.faqs.map((faq, idx) => (
              <div key={idx}>
                <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light mb-3 tracking-[-0.01em]">
                  {faq.q}
                </h3>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-6 font-light">
            References & further reading
          </p>
          <ul className="list-none space-y-4">
            {article.references.map((ref, idx) => (
              <li
                key={idx}
                className="text-[#9a9a9a] text-sm leading-[1.7] font-light flex gap-3"
              >
                <span className="text-[#c9a96e]/60 font-mono text-xs pt-1 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>
                  {ref.author && <span className="text-[#cfcabf]">{ref.author} </span>}
                  <span className="italic">{ref.title}</span>
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
          <Link
            href={`/author/${AUTHOR.slug}`}
            className="block group"
          >
            <p className="text-[#c9a96e] text-sm font-serif italic mb-2">{AUTHOR.name}</p>
            <p className="text-[#cfcabf] text-base leading-[1.7] font-light max-w-xl">
              {AUTHOR.bioShort}
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mt-4 group-hover:text-[#c9a96e] transition-colors">
              Read more →
            </p>
          </Link>
        </div>

        {/* Continue reading */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
              Continue reading
            </p>
            <div className="space-y-6">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/insights/${r.slug}`}
                  className="block group"
                >
                  <p className="text-[#c9a96e] text-xs font-serif italic mb-1">
                    {CLUSTER_BY_SLUG[r.cluster]?.title}
                  </p>
                  <p className="text-[#f0eee9] text-lg font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
                    {r.title} →
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
