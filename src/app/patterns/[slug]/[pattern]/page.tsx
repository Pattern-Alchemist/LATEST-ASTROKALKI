import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/content/markdown";
import {
  ATLAS_PATTERNS,
  getAtlasPattern,
  type AtlasPattern,
} from "@/lib/content/patterns/atlas";
import { SEO_CITIES, getCity, buildProgrammaticSlug } from "@/lib/seo/cities";
import { generateProgrammaticContent } from "@/lib/seo/programmatic-content";

/**
 * /patterns/[slug]/[pattern] — Programmatic SEO landing pages.
 *
 * The [slug] URL segment is the CITY slug (e.g. "mumbai"). The [pattern]
 * segment is the Atlas pattern slug (e.g. "the-rescuer") OR a pillar-slug
 * alias that maps to an atlas pattern via `relatedEssay` (e.g.
 * "abandonment-loop" → "the-abandonment"). The folder is named [slug]
 * (not [city]) because Next.js requires sibling dynamic segments at the
 * same level to share their slug name — and /patterns/[slug] (the pillar
 * essay route) already uses [slug].
 *
 * Each page is one (Atlas pattern × Indian city) combination. Content is
 * generated LOCALLY (no LLM) by `generateProgrammaticContent` — fast,
 * deterministic, 800+ words, in the AstroKalki voice. If a
 * `ProgrammaticPage` row exists in the DB for this combo (created by the
 * admin via /admin/seo → "Generate all 200 pages"), the admin-edited
 * `content` column wins; otherwise we render the locally-generated body
 * on the fly.
 *
 * SEO:
 *   - Localized Service + FAQ + Breadcrumb + Article JSON-LD
 *   - Dynamic metadata (title, description, OG, Twitter, keywords)
 *   - Static (generateStaticParams + dynamicParams = false)
 *
 * Design matches the Atlas pattern page: dark editorial, gold #c9a96e,
 * generous whitespace, breadcrumbs.
 *
 * Test URL: /patterns/mumbai/abandonment-loop → resolves "the-abandonment"
 * atlas pattern × Mumbai, serves 200 with localized content.
 */

interface PageProps {
  params: Promise<{ slug: string; pattern: string }>;
}

// ─── Pattern slug resolution ──────────────────────────────────────
// Map pillar slugs (the relatedEssay field on AtlasPattern) to the
// first Atlas pattern that owns them. This lets /patterns/mumbai/
// abandonment-loop resolve to "the-abandonment" × Mumbai.
const PILLAR_TO_ATLAS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const p of ATLAS_PATTERNS) {
    if (p.relatedEssay && !map[p.relatedEssay]) {
      map[p.relatedEssay] = p.slug;
    }
  }
  return map;
})();

/** Accept either an Atlas slug or a pillar slug; return the AtlasPattern. */
function resolvePattern(patternParam: string): AtlasPattern | null {
  // Direct atlas slug match
  const direct = getAtlasPattern(patternParam);
  if (direct) return direct;
  // Pillar-slug alias
  const atlasSlug = PILLAR_TO_ATLAS[patternParam];
  if (atlasSlug) return getAtlasPattern(atlasSlug) ?? null;
  return null;
}

/** All URL pattern slugs we accept (atlas + pillar alias). */
const ALL_PATTERN_SLUGS: string[] = (() => {
  const set = new Set<string>();
  for (const p of ATLAS_PATTERNS) {
    set.add(p.slug);
    if (p.relatedEssay) set.add(p.relatedEssay);
  }
  return Array.from(set);
})();

// ─── Static generation ─────────────────────────────────────────────

export const dynamicParams = false;

export async function generateStaticParams() {
  // 20 cities × (11 atlas slugs + 6 pillar aliases) = 340 valid combos.
  // The pillar-alias URLs serve the SAME content as their atlas parent
  // (e.g. /patterns/mumbai/abandonment-loop and
  // /patterns/mumbai/the-abandonment both render the-abandonment ×
  // Mumbai). This is intentional — it lets the test URL
  // /patterns/mumbai/abandonment-loop resolve while keeping the DB slug
  // stable as "the-abandonment-mumbai".
  return SEO_CITIES.flatMap((city) =>
    ALL_PATTERN_SLUGS.map((pattern) => ({ slug: city.slug, pattern }))
  );
}

// ─── Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: citySlug, pattern: patternParam } = await params;
  const city = getCity(citySlug);
  const pattern = resolvePattern(patternParam);
  if (!city || !pattern) return { title: "Page not found — AstroKalki" };

  const gen = generateProgrammaticContent(pattern, city);
  const canonical = `https://astrokalki.com/patterns/${city.slug}/${patternParam}`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(gen.title.replace(" — AstroKalki", ""))}&subtitle=${encodeURIComponent(`${city.name} · AstroKalki`)}`;

  return {
    title: gen.title,
    description: gen.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: gen.title,
      description: gen.metaDescription,
      type: "article",
      url: canonical,
      siteName: "AstroKalki",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: gen.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: gen.title,
      description: gen.metaDescription,
      images: [ogImageUrl],
    },
    keywords: [
      gen.searchQuery,
      pattern.name.toLowerCase(),
      `${pattern.name.replace(/^The\s+/i, "").toLowerCase()} ${city.name}`,
      `${city.name} astrology`,
      `${city.name} relationship reading`,
      `${city.name} emotional pattern`,
      "AstroKalki",
      "Mirror Method",
      "pattern recognition",
    ],
  };
}

// ─── Page component ────────────────────────────────────────────────

export default async function ProgrammaticCityPatternPage({
  params,
}: PageProps) {
  const { slug: citySlug, pattern: patternParam } = await params;
  const city = getCity(citySlug);
  const pattern = resolvePattern(patternParam);
  if (!city || !pattern) notFound();

  // Always regenerate locally for the FAQs + metadata (deterministic).
  const gen = generateProgrammaticContent(pattern, city);

  // Try to fetch the DB record — admin may have edited it via /admin/seo.
  // DB slug is always {atlasSlug}-{citySlug} (NOT pillar-slug-based).
  const dbSlug = buildProgrammaticSlug(pattern.slug, city.slug);
  let stored: { content?: string; searchQuery?: string } | null = null;
  try {
    stored = await db.programmaticPage.findUnique({
      where: { slug: dbSlug },
      select: { content: true, searchQuery: true },
    });
  } catch {
    // Database unavailable during build — fall through to generated content
  }

  // DB content wins if it exists (admin edits respected). Otherwise use
  // the locally-generated body.
  const content = stored?.content?.trim() || gen.content;
  const searchQuery = stored?.searchQuery || gen.searchQuery;

  const canonical = `https://astrokalki.com/patterns/${city.slug}/${patternParam}`;
  const patternUrl = `https://astrokalki.com/patterns/atlas/${pattern.slug}`;

  // ─── JSON-LD schemas ────────────────────────────────────────────

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://astrokalki.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Pattern Atlas",
        item: "https://astrokalki.com/patterns/atlas",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pattern.name,
        item: patternUrl,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: city.name,
        item: canonical,
      },
    ],
  };

  // Localized Service schema — AstroKalki as a Service provider for
  // this pattern in this city. This is what surfaces in "near me" results.
  const serviceSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Pattern Recognition & Depth-Psychology Session",
    name: `${pattern.name} — Session with AstroKalki`,
    description: gen.metaDescription,
    url: canonical,
    provider: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
      telephone: "+91-8920862931",
    },
    areaServed: {
      "@type": "City",
      name: city.name,
    },
    audience: {
      "@type": "Audience",
      audienceType: `People in ${city.name} working through the ${pattern.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "")}`,
    },
    offers: [
      {
        "@type": "Offer",
        price: "2499",
        priceCurrency: "INR",
        name: "60-minute session",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        price: "3499",
        priceCurrency: "INR",
        name: "90-minute session",
        availability: "https://schema.org/InStock",
      },
    ],
  };

  // FAQ schema — pulled from the locally-generated FAQs.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: gen.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  // Article schema — so AI search systems can cite the page.
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${pattern.name} in ${city.name}`,
    description: gen.metaDescription,
    author: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
    },
    publisher: { "@type": "Organization", name: "AstroKalki" },
    keywords: [searchQuery, pattern.name, city.name].join(", "),
    articleSection: "Psychology",
    inLanguage: "en",
    url: canonical,
    about: {
      "@type": "Thing",
      name: pattern.name,
    },
  };

  // Render the markdown body. The body's first line is an H1 that
  // duplicates the page header H1 below — hide it via CSS so the
  // visible page header H1 is canonical.
  const html = renderMarkdown(content);

  // ─── "Other patterns in {City}" — the other atlas patterns ──────
  const otherPatterns = ATLAS_PATTERNS.filter((p) => p.slug !== pattern.slug);

  return (
    <article className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Pattern Atlas", href: "/patterns/atlas" },
                { label: pattern.name, href: `/patterns/atlas/${pattern.slug}` },
                { label: city.name },
              ]}
              withSchema={false}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Pattern Atlas · {city.name}
            {city.state ? `, ${city.state}` : ""} · India
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {pattern.name} in {city.name}
          </h1>
          <p className="text-lg sm:text-xl text-[#cfcabf] font-serif italic font-light leading-[1.5] mb-8">
            {pattern.tagline}
          </p>
          <div className="pt-6 border-t border-white/[0.04]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              This page answers
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
              {searchQuery}
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        <div
          className="programmatic-body text-[#cfcabf] font-light leading-[1.85]"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Atlas link — read the full pattern */}
        <section className="mb-14 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Read the full pattern
          </p>
          <Link
            href={`/patterns/atlas/${pattern.slug}`}
            className="block group p-6 border border-white/[0.06] hover:border-[#c9a96e]/30 transition-colors"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2 font-light">
              Pattern Atlas
            </p>
            <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
              {pattern.name} →
            </h3>
            <p className="text-[#cfcabf] font-serif italic font-light leading-[1.6]">
              {pattern.tagline}
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mt-3">
              Symptoms · origin · relationship & career impact · shadow side
            </p>
          </Link>
        </section>

        {/* Booking CTA */}
        <section className="mb-14 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Book a session
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mb-6">
            Every pattern in the Atlas is decoded through the same five-step
            Mirror Method — pattern recognition, emotional origin,
            reinforcement, behavioural expression, conscious intervention.
            Sessions are online, 60 or 90 minutes, and open to clients in{" "}
            {city.name}
            {city.state ? `, ${city.state}` : ""} and across India.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/#booking"
              className="inline-flex items-center justify-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b879] px-6 py-3 transition-colors"
            >
              Book a session
              <span>→</span>
            </Link>
            <Link
              href="/method"
              className="inline-flex items-center justify-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors px-2"
            >
              The Mirror Method
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* Other patterns in {City} */}
        <section className="mb-14 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Other patterns in {city.name}
          </p>
          <ul className="space-y-3">
            {otherPatterns.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/patterns/${city.slug}/${p.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-2 border-b border-white/[0.03] hover:border-[#c9a96e]/20 transition-colors"
                >
                  <span className="text-[#cfcabf] group-hover:text-[#c9a96e] transition-colors text-base sm:text-lg font-serif font-light">
                    {p.name}
                  </span>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] group-hover:text-[#c9a96e] transition-colors shrink-0">
                    {p.tagline.length > 60 ? `${p.tagline.slice(0, 60)}…` : p.tagline}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer back-link */}
        <div className="mt-20 pt-10 border-t border-white/[0.06]">
          <Link
            href="/patterns/atlas"
            className="text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors"
          >
            ← Back to Pattern Atlas
          </Link>
        </div>
      </div>

      {/* Local fix-up styles for the rendered markdown body.
          renderMarkdown emits an H1 from the body's first line — hide it
          because the page header above already provides the canonical H1. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .programmatic-body h1 { display: none; }
            .programmatic-body h2:first-of-type { margin-top: 0; }
            .programmatic-body em { color: #cfcabf; }
          `,
        }}
      />
    </article>
  );
}
