import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import { SEO_CITIES } from "@/lib/seo/cities";

/**
 * GET /api/admin/seo/pages
 *
 * List all ProgrammaticPage records with pagination + filter by
 * pattern / city / search text. Returns a coverage matrix showing
 * which (pattern × city) combos are still missing.
 *
 * Query params:
 *   ?page=1         — 1-indexed page number (default 1)
 *   ?pageSize=50    — items per page (default 50, max 200)
 *   ?pattern=slug   — filter by atlas pattern slug
 *   ?city=slug      — filter by city slug (matched against city NAME)
 *   ?q=text         — search across slug, city, searchQuery
 *
 * Auth: admin-only — auto-guarded by middleware (/api/admin/*).
 *
 * Returns:
 *   {
 *     pages: ProgrammaticPage[],
 *     pagination: { page, pageSize, total, totalPages },
 *     summary: { total, generated, missing },
 *     patterns: { slug, name }[],
 *     cities: { name, state, slug, population }[]
 *   }
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize") || "50")));
  const patternFilter = sp.get("pattern")?.trim() || null;
  const cityFilter = sp.get("city")?.trim() || null;
  const q = sp.get("q")?.trim() || null;

  // Build the where clause.
  const where: {
    pattern?: string;
    city?: string;
    OR?: Array<{ slug: { contains: string } } | { city: { contains: string } } | { searchQuery: { contains: string } }>;
  } = {};

  if (patternFilter) where.pattern = patternFilter;
  if (cityFilter) {
    const city = SEO_CITIES.find((c) => c.slug === cityFilter);
    if (city) where.city = city.name;
  }
  if (q) {
    where.OR = [
      { slug: { contains: q } },
      { city: { contains: q } },
      { searchQuery: { contains: q } },
    ];
  }

  const [total, pages] = await Promise.all([
    db.programmaticPage.count({ where }),
    db.programmaticPage.findMany({
      where,
      orderBy: [{ pattern: "asc" }, { city: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        pattern: true,
        city: true,
        state: true,
        searchQuery: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  // Coverage summary — total combos vs generated.
  const totalCombos = ATLAS_PATTERNS.length * SEO_CITIES.length;
  const generatedTotal = await db.programmaticPage.count();
  const missing = Math.max(0, totalCombos - generatedTotal);

  return NextResponse.json({
    pages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    summary: {
      total: totalCombos,
      generated: generatedTotal,
      missing,
    },
    patterns: ATLAS_PATTERNS.map((p) => ({ slug: p.slug, name: p.name })),
    cities: SEO_CITIES,
  });
}
