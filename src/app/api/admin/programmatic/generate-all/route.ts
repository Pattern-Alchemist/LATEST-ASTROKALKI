import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { checkRateLimit, getClientIp } from '@/lib/security';
import { ATLAS_PATTERNS } from '@/lib/content/patterns/atlas';
import { CITIES, buildProgrammaticSlug } from '@/lib/seo/cities';
import {
  buildProgrammaticSystemPrompt,
  buildProgrammaticPrompt,
  buildSearchQuery,
} from '@/lib/seo/programmatic-prompt';

/**
 * POST /api/admin/programmatic/generate-all
 *
 * Bulk-generate all 200 programmatic SEO pages (10 patterns × 20 cities)
 * sequentially, with a 1-second delay between LLM calls. Skips any combo
 * that already has a page in the database unless `force: true` is sent.
 *
 * Body: { force?: boolean }
 *
 * Auth: admin-only — middleware guards /api/admin/*.
 * Rate-limit: 1 batch per 30 min per IP. The full job takes ~7-8 minutes
 * (200 calls × 1s delay + LLM latency) so we want to prevent double-fire.
 *
 * Returns:
 *   { success, summary: { total, generated, failed, skipped }, results: Result[] }
 */
export async function POST(request: NextRequest) {
  // ─── Rate-limit: 1 batch per 30 min ────────────────────────────────
  const ip = getClientIp(request);
  const rlKey = `prog-batch:${ip}`;
  const rl = checkRateLimit(rlKey, { windowMs: 30 * 60 * 1000, max: 1 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Batch already running — retry in ${rl.retryAfterSeconds}s` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  let body: { force?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // empty body fine
  }
  const force = body.force === true;

  // ─── Build the 200-combo job list ──────────────────────────────────
  const combos = ATLAS_PATTERNS.flatMap((p) =>
    CITIES.map((c) => ({ pattern: p, city: c }))
  );

  // Skip already-generated unless force
  const existingSlugs = new Set(
    (await db.programmaticPage.findMany({
      select: { slug: true },
    })).map((r) => r.slug)
  );

  const todo = force ? combos : combos.filter((c) => !existingSlugs.has(buildProgrammaticSlug(c.pattern.slug, c.city.slug)));

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
  let skipped = combos.length - todo.length;

  for (let i = 0; i < todo.length; i++) {
    const { pattern, city } = todo[i];
    const slug = buildProgrammaticSlug(pattern.slug, city.slug);

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
      } else {
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
      }
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

    // 1-second delay between LLM calls (skip after last)
    if (i < todo.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: combos.length,
      generated,
      failed,
      skipped,
      processed: todo.length,
    },
    results,
  });
}
