import type { MetadataRoute } from "next";
import { ALL_ARTICLES } from "@/lib/content/articles";
import { SERVICES } from "@/lib/content/services";
import { CLUSTERS } from "@/lib/content/clusters";
import { AUTHOR } from "@/lib/content/author";
import { GUIDES } from "@/lib/content/guides";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import { SEO_CITIES } from "@/lib/seo/cities";
import { CASE_STUDY_SEEDS } from "@/lib/content/case-study-seed";
import { db } from "@/lib/db";

/**
 * Dynamic sitemap — covers all routes the user directive specifies:
 *   - Homepage (with hero image — image sitemap entry)
 *   - 5 service pages (with index)
 *   - 4 authority pages (about, methodology, testimonials, faq)
 *   - Blog hub + 20 cluster articles (5 clusters × 4 articles)
 *   - Guides hub + 3 monster pillar guides (3000-5000 words each)
 *   - Author profile page
 *   - 6 pattern pillar articles (from /patterns)
 *   - Pattern Atlas hub + 10 structured Atlas patterns
 *   - The Mirror Method branded framework page
 *   - Original Research data page
 *   - /what-to-expect trust page
 *   - /membership — subscription tiers page (NEW)
 *   - /testimonials/submit — public testimonial submission (NEW)
 *   - /case-studies — anonymised long-form client journeys hub (M9-d)
 *   - /case-studies/[slug] — individual case study pages (dynamic, from DB) (M9-d)
 *
 * Excludes: /admin, /api, /account (auth-gated), /unsubscribe (noindex routes)
 *
 * Image sitemap: each entry may include an `images` array. We attach the
 * hero image to the homepage and dynamic OG images to articles / services /
 * atlas patterns so Google Images can index them.
 */

const BASE_URL = "https://astrokalki.com";

// Hero image — the fractured-mirror hero on the homepage
const HERO_IMAGE_URL = `${BASE_URL}/images/hero-fractured-mirror.png`;

// Pillar article slugs (from /src/lib/pillar-seed.ts — kept in sync manually)
const PILLAR_SLUGS = [
  "abandonment-loop",
  "control-loop",
  "people-pleasing",
  "emotional-numbness",
  "overthinking",
  "self-doubt",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      images: [HERO_IMAGE_URL],
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/insights`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/guides`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/patterns`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/patterns/atlas`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/method`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/research`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/testimonials`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/testimonials/submit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      // Anonymised long-form client journeys — deep trust signals (M9-d).
      url: `${BASE_URL}/case-studies`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/membership`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      // Lead magnet — free 5-day email course landing page.
      // High priority because it converts cold traffic into email opt-ins.
      url: `${BASE_URL}/email-course`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      // AI-powered birth chart image analysis — VLM lead magnet.
      url: `${BASE_URL}/chart-reading`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/refer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/patterns/atlas/quiz`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/what-to-expect`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/author/${AUTHOR.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const servicePages: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${BASE_URL}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
    images: [
      `${BASE_URL}/api/og?title=${encodeURIComponent(s.title)}&subtitle=${encodeURIComponent("AstroKalki Session")}`,
    ],
  }));

  const articlePages: MetadataRoute.Sitemap = ALL_ARTICLES.map((a) => ({
    url: `${BASE_URL}/insights/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
    images: [
      `${BASE_URL}/api/og?title=${encodeURIComponent(a.title)}&subtitle=${encodeURIComponent("AstroKalki Insights")}`,
    ],
  }));

  const guidePages: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${BASE_URL}/guides/${g.slug}`,
    lastModified: new Date(g.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.95, // Guides are citation magnets — highest priority
    images: [
      `${BASE_URL}/api/og?title=${encodeURIComponent(g.title)}&subtitle=${encodeURIComponent("AstroKalki Guide")}`,
    ],
  }));

  const pillarPages: MetadataRoute.Sitemap = PILLAR_SLUGS.map((slug) => ({
    url: `${BASE_URL}/patterns/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const atlasPages: MetadataRoute.Sitemap = ATLAS_PATTERNS.map((p) => ({
    url: `${BASE_URL}/patterns/atlas/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.95, // Atlas patterns are the proprietary knowledge layer
    images: [
      `${BASE_URL}/api/og?title=${encodeURIComponent(p.name)}&subtitle=${encodeURIComponent("Pattern Atlas")}`,
    ],
  }));

  // Programmatic SEO city × pattern pages — 200+ localized landing pages.
  // Statically enumerated over SEO_CITIES × ATLAS_PATTERNS so the
  // sitemap does not depend on DB state (pages are statically generated
  // by /patterns/[city]/[pattern]/page.tsx via generateStaticParams).
  // (M8-b)
  const programmaticPages: MetadataRoute.Sitemap = SEO_CITIES.flatMap((city) =>
    ATLAS_PATTERNS.map((p) => ({
      url: `${BASE_URL}/patterns/${city.slug}/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6, // Local landing pages — lower priority than Atlas/pillars
      images: [
        `${BASE_URL}/api/og?title=${encodeURIComponent(`${p.name} in ${city.name}`)}&subtitle=${encodeURIComponent(`${city.name} · AstroKalki`)}`,
      ],
    }))
  );

  // Case study pages — DB-driven (lazily seeded on first access of
  // /case-studies). Fall back to the 3 known seed slugs if the DB query
  // fails or is empty, so the sitemap is always populated. (M9-d)
  const caseStudySlugs: { slug: string; updatedAt: Date }[] = [];
  try {
    const rows = await db.caseStudy.findMany({
      where: { published: true },
      orderBy: { createdAt: "asc" },
      select: { slug: true, updatedAt: true },
    });
    for (const r of rows) caseStudySlugs.push({ slug: r.slug, updatedAt: r.updatedAt });
  } catch {
    // DB unavailable — fall back to seed slugs.
  }
  // Always include seed slugs (even if DB returned some, in case the seeds
  // haven't been lazily-seeded yet — sitemap should always advertise them).
  const seenSlugs = new Set(caseStudySlugs.map((c) => c.slug));
  for (const seed of CASE_STUDY_SEEDS) {
    if (!seenSlugs.has(seed.slug)) {
      caseStudySlugs.push({ slug: seed.slug, updatedAt: now });
    }
  }
  const caseStudyPages: MetadataRoute.Sitemap = caseStudySlugs.map((c) => ({
    url: `${BASE_URL}/case-studies/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7, // Long-form trust content — higher priority than local SEO
    images: [
      `${BASE_URL}/api/og?title=${encodeURIComponent("AstroKalki Case Study")}&subtitle=${encodeURIComponent("Anonymised Client Journey")}`,
    ],
  }));

  return [
    ...staticPages,
    ...servicePages,
    ...articlePages,
    ...guidePages,
    ...pillarPages,
    ...atlasPages,
    ...programmaticPages,
    ...caseStudyPages,
  ];
}
