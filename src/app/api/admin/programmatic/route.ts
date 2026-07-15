import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { ATLAS_PATTERNS } from '@/lib/content/patterns/atlas';
import { CITIES, buildProgrammaticSlug } from '@/lib/seo/cities';
import {
  buildProgrammaticSystemPrompt,
  buildProgrammaticPrompt,
  buildSearchQuery,
  getCityForSlug,
} from '@/lib/seo/programmatic-prompt';

/**
 * GET /api/admin/programmatic
 *
 * List all generated programmatic SEO pages, plus the matrix of which
 * (pattern × city) combos are still missing. Returns:
 *   {
 *     pages: ProgrammaticPage[],
 *     summary: { total, generated, missing, byPattern: Record<slug, {generated,missing}> },
 *     patterns: AtlasPattern[],
 *     cities: City[]
 *   }
 *
 * Auth: admin-only — auto-guarded by middleware (/api/admin/*).
 */
export async function GET(_request: NextRequest) {
  const pages = await db.programmaticPage.findMany({
    orderBy: [{ pattern: 'asc' }, { city: 'asc' }],
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
  });

  const existingSlugs = new Set(pages.map((p) => p.slug));

  // Build the matrix of all 10 × 20 = 200 combos, marking which are generated.
  const matrix = ATLAS_PATTERNS.map((p) => {
    const perCity = CITIES.map((c) => {
      const slug = buildProgrammaticSlug(p.slug, c.slug);
      return { city: c.slug, cityName: c.name, slug, generated: existingSlugs.has(slug) };
    });
    const generated = perCity.filter((c) => c.generated).length;
    return {
      pattern: p.slug,
      patternName: p.name,
      generated,
      missing: perCity.length - generated,
      cities: perCity,
    };
  });

  const total = ATLAS_PATTERNS.length * CITIES.length;
  const generated = pages.length;
  const missing = total - generated;

  return NextResponse.json({
    pages,
    summary: { total, generated, missing },
    matrix,
    patterns: ATLAS_PATTERNS.map((p) => ({ slug: p.slug, name: p.name, tagline: p.tagline })),
    cities: CITIES,
  });
}

/**
 * POST /api/admin/programmatic
 *
 * Generate one or more programmatic pages.
 *
 * Body options:
 *   { pattern: "the-rescuer", city: "mumbai" }  → generate that one combo
 *   { pattern: "the-rescuer" }                  → generate all 20 cities for that pattern
 *   { city: "mumbai" }                          → generate all 10 patterns for that city
 *   { generateAll: true }                       → alias for the bulk route (limited here to 20 max)
 *   { force?: boolean }                         → regenerate even if a page already exists
 *
 * Returns per-combo results + summary.
 *
 * Auth: admin-only (middleware). Rate-limited 1 call / 10 min per IP on this
 * route — the bulk 200-page job lives in /generate-all which has its own limit.
 */
export async function POST(request: NextRequest) {
  let body: {
    pattern?: string;
    city?: string;
    generateAll?: boolean;
    force?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    // empty body — default to no-op
  }

  // Resolve the (pattern, city) combos to generate.
  const combos: { patternSlug: string; citySlug: string }[] = [];

  if (body.generateAll) {
    for (const p of ATLAS_PATTERNS) {
      for (const c of CITIES) {
        combos.push({ patternSlug: p.slug, citySlug: c.slug });
      }
    }
  } else if (body.pattern && body.city) {
    combos.push({ patternSlug: body.pattern, citySlug: body.city });
  } else if (body.pattern) {
    for (const c of CITIES) {
      combos.push({ patternSlug: body.pattern, citySlug: c.slug });
    }
  } else if (body.city) {
    for (const p of ATLAS_PATTERNS) {
      combos.push({ patternSlug: p.slug, citySlug: body.city });
    }
  } else {
    return NextResponse.json(
      { error: 'Provide { pattern, city }, { pattern }, { city }, or { generateAll: true }' },
      { status: 400 }
    );
  }

  // Cap at 20 to keep this endpoint responsive. For the full 200-page job,
  // use /api/admin/programmatic/generate-all.
  const capped = combos.slice(0, 20);
  const force = body.force === true;

  // Skip already-generated combos unless force=true
  const existingSlugs = new Set(
    (await db.programmaticPage.findMany({
      where: { slug: { in: capped.map((c) => buildProgrammaticSlug(c.patternSlug, c.citySlug)) } },
      select: { slug: true },
    })).map((r) => r.slug)
  );

  const zai = await getZAI();
  const systemPrompt = buildProgrammaticSystemPrompt();

  interface Result {
    slug: string;
    pattern: string;
    city: string;
    status: 'generated' | 'skipped' | 'failed';
    error?: string;
  }
  const results: Result[] = [];
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const combo of capped) {
    const pattern = ATLAS_PATTERNS.find((p) => p.slug === combo.patternSlug);
    const city = getCityForSlug(combo.citySlug);
    if (!pattern || !city) {
      failed += 1;
      results.push({
        slug: buildProgrammaticSlug(combo.patternSlug, combo.citySlug),
        pattern: combo.patternSlug,
        city: combo.citySlug,
        status: 'failed',
        error: 'Pattern or city not found',
      });
      continue;
    }

    const slug = buildProgrammaticSlug(pattern.slug, city.slug);
    if (existingSlugs.has(slug) && !force) {
      skipped += 1;
      results.push({ slug, pattern: pattern.slug, city: city.slug, status: 'skipped' });
      continue;
    }

    const userPrompt = buildProgrammaticPrompt(
      pattern.name,
      pattern.conciseAnswer,
      city.name,
      city.state
    );

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      });

      const content =
        completion.choices?.[0]?.message?.content?.trim() || '';

      if (!content || content.length < 400) {
        failed += 1;
        results.push({
          slug,
          pattern: pattern.slug,
          city: city.slug,
          status: 'failed',
          error: 'LLM returned empty or too-short response',
        });
        continue;
      }

      const searchQuery = buildSearchQuery(pattern, city);

      await db.programmaticPage.upsert({
        where: { slug },
        create: {
          slug,
          pattern: pattern.slug,
          city: city.name,
          state: city.state,
          content,
          searchQuery,
        },
        update: {
          pattern: pattern.slug,
          city: city.name,
          state: city.state,
          content,
          searchQuery,
        },
      });

      generated += 1;
      results.push({ slug, pattern: pattern.slug, city: city.slug, status: 'generated' });
    } catch (err) {
      failed += 1;
      results.push({
        slug,
        pattern: pattern.slug,
        city: city.slug,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 1-second delay between LLM calls to be gentle on the rate limit.
    if (combos.indexOf(combo) < capped.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      requested: capped.length,
      generated,
      failed,
      skipped,
    },
    results,
  });
}
