import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import { SEO_CITIES, buildProgrammaticSlug } from "@/lib/seo/cities";
import { generateProgrammaticContent } from "@/lib/seo/programmatic-content";

/**
 * POST /api/admin/seo/generate
 *
 * Bulk-generate (or refresh) all 200+ ProgrammaticPage records using
 * the LOCAL content generator — no LLM, no rate limit, no 7-minute
 * batch. Runs in seconds. Stores the generated markdown body in the
 * `content` column so admins can edit it later via /admin/seo.
 *
 * Body options (all optional):
 *   { force?: boolean }      — re-generate even when a row already exists.
 *                              Default false → only inserts missing rows.
 *   { pattern?: string }     — limit to one atlas pattern slug (all cities).
 *   { city?: string }        — limit to one city slug (all patterns).
 *
 * Auth: admin-only — auto-guarded by middleware (/api/admin/*).
 *
 * Returns:
 *   {
 *     success: true,
 *     summary: { total, created, updated, skipped },
 *     results: { slug, pattern, city, action }[]
 *   }
 */
export async function POST(request: NextRequest) {
  let body: { force?: boolean; pattern?: string; city?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — defaults to "generate all missing"
  }

  const force = body.force === true;
  const patternFilter = body.pattern?.trim() || null;
  const cityFilter = body.city?.trim() || null;

  // Validate filters if provided.
  if (patternFilter && !ATLAS_PATTERNS.some((p) => p.slug === patternFilter)) {
    return NextResponse.json(
      { error: `Unknown pattern slug: ${patternFilter}` },
      { status: 400 }
    );
  }
  if (cityFilter && !SEO_CITIES.some((c) => c.slug === cityFilter)) {
    return NextResponse.json(
      { error: `Unknown city slug: ${cityFilter}` },
      { status: 400 }
    );
  }

  // Build the (pattern, city) combo list.
  const patterns = patternFilter
    ? ATLAS_PATTERNS.filter((p) => p.slug === patternFilter)
    : ATLAS_PATTERNS;
  const cities = cityFilter
    ? SEO_CITIES.filter((c) => c.slug === cityFilter)
    : SEO_CITIES;

  const combos = patterns.flatMap((p) => cities.map((c) => ({ pattern: p, city: c })));

  // Look up existing rows so we can decide create vs update vs skip.
  const existingSlugs = new Set(
    (
      await db.programmaticPage.findMany({
        where: { slug: { in: combos.map((c) => buildProgrammaticSlug(c.pattern.slug, c.city.slug)) } },
        select: { slug: true },
      })
    ).map((r) => r.slug)
  );

  interface Result {
    slug: string;
    pattern: string;
    city: string;
    action: "created" | "updated" | "skipped";
  }
  const results: Result[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const { pattern, city } of combos) {
    const slug = buildProgrammaticSlug(pattern.slug, city.slug);
    const exists = existingSlugs.has(slug);

    if (exists && !force) {
      skipped += 1;
      results.push({ slug, pattern: pattern.slug, city: city.slug, action: "skipped" });
      continue;
    }

    const gen = generateProgrammaticContent(pattern, city);

    try {
      await db.programmaticPage.upsert({
        where: { slug },
        create: {
          slug,
          pattern: pattern.slug,
          city: city.name,
          state: city.state,
          content: gen.content,
          searchQuery: gen.searchQuery,
        },
        update: {
          pattern: pattern.slug,
          city: city.name,
          state: city.state,
          content: gen.content,
          searchQuery: gen.searchQuery,
        },
      });
      if (exists) {
        updated += 1;
        results.push({ slug, pattern: pattern.slug, city: city.slug, action: "updated" });
      } else {
        created += 1;
        results.push({ slug, pattern: pattern.slug, city: city.slug, action: "created" });
      }
    } catch (err) {
      // Surface the error per-combo but keep going — one failure
      // shouldn't abort the whole batch.
      results.push({
        slug,
        pattern: pattern.slug,
        city: city.slug,
        action: "skipped",
      });
      console.error(`[seo/generate] failed for ${slug}:`, err);
      skipped += 1;
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: combos.length,
      created,
      updated,
      skipped,
    },
    results,
  });
}
