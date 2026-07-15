import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/content/markdown";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";

/**
 * /local/[slug] — programmatic SEO landing pages.
 *
 * Each page is one (Atlas pattern × Indian city) combination, generated
 * by the LLM and stored in the ProgrammaticPage table. The slug has the
 * shape "{patternSlug}-{citySlug}" (e.g. "the-rescuer-mumbai").
 *
 * The page:
 *   - Renders the LLM-generated markdown body via renderMarkdown
 *   - Adds BreadcrumbList JSON-LD (Home > Pattern Atlas > Pattern > City)
 *   - Adds LocalBusiness / ProfessionalService JSON-LD scoped to the city
 *   - Adds Article JSON-LD so AI search systems can cite the page
 *   - Includes a CTA to book + a link to the parent Atlas pattern page
 *
 * Design matches the Atlas pattern page (#050505 bg, gold #c9a96e, serif).
 *
 * Generation is database-driven, so generateStaticParams pulls every
 * existing ProgrammaticPage. Missing slugs 404 — they will appear once
 * the admin runs the generation job.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";
// Revalidate every hour so newly-generated pages surface in production.
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const pages = await db.programmaticPage.findMany({
      select: { slug: true },
    });
    return pages.map((p) => ({ slug: p.slug }));
  } catch {
    // Return empty array if database is not available during build
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.programmaticPage.findUnique({
    where: { slug },
    select: { pattern: true, city: true, state: true, searchQuery: true },
  });
  if (!page) return { title: "Page not found — AstroKalki" };

  const pattern = getAtlasPattern(page.pattern);
  const patternName = pattern?.name ?? page.pattern;
  const title = `${patternName} in ${page.city} — AstroKalki`;
  const description = pattern?.metaDescription
    ? pattern.metaDescription.slice(0, 155)
    : `How the ${patternName.replace(/^The\s+/i, "")} shows up in relationships and emotional life in ${page.city}, ${page.state ?? "India"} — and what helps. Decoded by AstroKalki.`.slice(0, 155);
  const canonical = `https://astrokalki.com/local/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: "AstroKalki",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(patternName)}&subtitle=${encodeURIComponent(page.city)}`,
          width: 1200,
          height: 630,
          alt: `${patternName} in ${page.city}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        `/api/og?title=${encodeURIComponent(patternName)}&subtitle=${encodeURIComponent(page.city)}`,
      ],
    },
    keywords: [
      page.searchQuery,
      patternName.toLowerCase(),
      `${patternName.replace(/^The\s+/i, "").toLowerCase()} ${page.city}`,
      `${page.city} astrology`,
      `${page.city} relationship reading`,
      "emotional pattern",
      "psychological pattern",
      "AstroKalki",
    ],
  };
}

export default async function LocalProgrammaticPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await db.programmaticPage.findUnique({
    where: { slug },
  });
  if (!page) notFound();

  const pattern = getAtlasPattern(page.pattern);
  const patternName = pattern?.name ?? page.pattern;
  const patternTagline = pattern?.tagline ?? "";

  const canonical = `https://astrokalki.com/local/${slug}`;
  const patternUrl = pattern
    ? `https://astrokalki.com/patterns/atlas/${pattern.slug}`
    : "https://astrokalki.com/patterns/atlas";

  // ─── Schemas ─────────────────────────────────────────────────────────

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://astrokalki.com" },
      { "@type": "ListItem", position: 2, name: "Pattern Atlas", item: "https://astrokalki.com/patterns/atlas" },
      { "@type": "ListItem", position: 3, name: patternName, item: patternUrl },
      { "@type": "ListItem", position: 4, name: page.city, item: canonical },
    ],
  };

  // ProfessionalService — scoped to the city. This is the schema Google
  // uses to surface "X near me" results.
  const localBusinessSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "AstroKalki",
    description:
      "Pattern recognition, Vedic architecture, and depth psychology sessions. Online consultations available in " +
      page.city +
      (page.state ? `, ${page.state}` : "") +
      ".",
    url: canonical,
    image: "https://astrokalki.com/images/hero-fractured-mirror.png",
    telephone: "+91-8920862931",
    areaServed: {
      "@type": "City",
      name: page.city,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: page.city,
      addressRegion: page.state ?? undefined,
      addressCountry: "IN",
    },
    priceRange: "₹₹",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "09:00",
        closes: "21:00",
      },
    ],
    sameAs: ["https://astrokalki.com"],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${patternName} in ${page.city}`,
    description: `${page.searchQuery} — decoded by AstroKalki.`,
    author: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
    },
    publisher: { "@type": "Organization", name: "AstroKalki" },
    keywords: [page.searchQuery, patternName, page.city].join(", "),
    articleSection: "Psychology",
    inLanguage: "en",
    url: canonical,
    about: {
      "@type": "Thing",
      name: patternName,
    },
  };

  const html = renderMarkdown(page.content);

  return (
    <article className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
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
                { label: patternName, href: pattern ? `/patterns/atlas/${pattern.slug}` : undefined },
                { label: page.city },
              ]}
              withSchema={false}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Pattern Atlas · {page.city}
            {page.state ? `, ${page.state}` : ""} · India
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {patternName} in {page.city}
          </h1>
          {patternTagline && (
            <p className="text-lg sm:text-xl text-[#cfcabf] font-serif italic font-light leading-[1.5] mb-8">
              {patternTagline}
            </p>
          )}
          <div className="pt-6 border-t border-white/[0.04]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              This page answers
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
              {page.searchQuery}
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        {/* Rendered markdown article.
            renderMarkdown() emits its own H1 from the markdown body; we
            hide it via CSS below so the page header H1 is the canonical one. */}
        <div
          className="programmatic-body text-[#cfcabf] font-light leading-[1.85]"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Atlas link */}
        <section className="mb-14 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Read the full pattern
          </p>
          {pattern ? (
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
          ) : (
            <Link
              href="/patterns/atlas"
              className="text-[#c9a96e] hover:text-[#f0eee9] transition-colors text-base font-serif font-light"
            >
              → Pattern Atlas
            </Link>
          )}
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
            {page.city}
            {page.state ? `, ${page.state}` : ""} and across India.
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
