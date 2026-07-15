import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ALL_ARTICLES } from '@/lib/content/articles';
import { GUIDES } from '@/lib/content/guides';
import { checkRateLimit, getClientIp } from '@/lib/security';
import { generateNarration, GenerateNarrationOptions } from '@/lib/ai/tts-generator';
import { promises as fs, existsSync } from 'fs';
import path from 'path';

/**
 * POST /api/admin/tts/generate-all — bulk generate narrations for every
 * article + guide that doesn't have one yet (or all of them, if force=true).
 *
 * Body: { force?: boolean, voice?: Voice, limit?: number }
 *
 * Auth: admin-only — auto-guarded by middleware (this route sits under
 * /api/admin/* so the middleware's admin session check applies). No
 * manual cookie verification needed here.
 *
 * Rate-limit: 1 call per 10 min per IP. Bulk generation can take 5–10
 * minutes for the full set; we don't want an admin double-clicking and
 * generating two parallel batches.
 *
 * Returns a job summary — per-slug results + counts — so the admin UI
 * can show exactly what succeeded and what failed.
 */

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

interface GenerateAllBody {
  force?: boolean;
  voice?: GenerateNarrationOptions['voice'];
  limit?: number;
}

interface JobResult {
  slug: string;
  title: string;
  status: 'generated' | 'skipped' | 'failed';
  durationSec?: number;
  chunksGenerated?: number;
  chunksSkipped?: number;
  fileSizeBytes?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  // ─── Rate-limit: 1 batch per 10 min per IP ─────────────────────────
  const ip = getClientIp(request);
  const rlKey = `tts-batch:${ip}`;
  const rl = checkRateLimit(rlKey, { windowMs: 10 * 60 * 1000, max: 1 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Batch already running — retry in ${rl.retryAfterSeconds}s` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── Parse body ────────────────────────────────────────────────────
  let body: GenerateAllBody = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — defaults apply.
  }
  const force = body.force === true;
  const voice = body.voice;
  const limit = typeof body.limit === 'number' && body.limit > 0
    ? Math.min(body.limit, 50)
    : 50;

  // ─── Ensure audio dir exists ───────────────────────────────────────
  if (!existsSync(AUDIO_DIR)) {
    try {
      await fs.mkdir(AUDIO_DIR, { recursive: true });
    } catch (err) {
      console.error('[tts-batch] failed to create audio dir:', err);
      return NextResponse.json(
        { error: 'Failed to create audio directory' },
        { status: 500 }
      );
    }
  }

  // ─── Build the job list ────────────────────────────────────────────
  type Job = { slug: string; title: string; kind: 'article' | 'guide'; text: string };
  const jobs: Job[] = [];

  for (const article of ALL_ARTICLES) {
    jobs.push({
      slug: article.slug,
      title: article.title,
      kind: 'article',
      text: [
        article.title,
        article.conciseAnswer,
        ...article.keyTakeaways.map((k, i) => `Key takeaway ${i + 1}. ${k}`),
        article.body,
      ].join('\n\n'),
    });
  }
  for (const guide of GUIDES) {
    jobs.push({
      slug: guide.slug,
      title: guide.title,
      kind: 'guide',
      text: [
        guide.title,
        guide.headline,
        guide.conciseAnswer,
        ...guide.keyTakeaways.map((k, i) => `Key takeaway ${i + 1}. ${k}`),
        guide.body,
      ].join('\n\n'),
    });
  }

  // ─── Filter: skip already-narrated unless force ────────────────────
  const existingSlugs = new Set(
    (await db.audioNarration.findMany({ select: { slug: true } })).map((r) => r.slug)
  );
  const todo = force ? jobs : jobs.filter((j) => !existingSlugs.has(j.slug));
  const capped = todo.slice(0, limit);

  // ─── Run sequentially ──────────────────────────────────────────────
  // Parallel TTS calls would hammer the ZAI API and likely trigger
  // rate-limits on their side. Sequential is slower (5–10 min for the
  // full set) but reliable.
  const results: JobResult[] = [];
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of capped) {
    try {
      const gen = await generateNarration(job.text, { voice });

      if (gen.buffer.length === 0) {
        failed += 1;
        results.push({
          slug: job.slug,
          title: job.title,
          status: 'failed',
          error: `All ${gen.chunksSkipped} chunks failed`,
        });
        continue;
      }

      // Write file
      const filepath = path.join(AUDIO_DIR, `${job.slug}.mp3`);
      await fs.writeFile(filepath, gen.buffer);

      // Upsert DB
      await db.audioNarration.upsert({
        where: { slug: job.slug },
        create: {
          slug: job.slug,
          title: job.title,
          audioUrl: `/audio/${job.slug}.mp3`,
          duration: gen.durationSec,
          voice: voice ?? 'tongtong',
        },
        update: {
          title: job.title,
          audioUrl: `/audio/${job.slug}.mp3`,
          duration: gen.durationSec,
          voice: voice ?? 'tongtong',
        },
      });

      generated += 1;
      results.push({
        slug: job.slug,
        title: job.title,
        status: 'generated',
        durationSec: gen.durationSec,
        chunksGenerated: gen.chunksGenerated,
        chunksSkipped: gen.chunksSkipped,
        fileSizeBytes: gen.buffer.length,
      });
    } catch (err) {
      failed += 1;
      results.push({
        slug: job.slug,
        title: job.title,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Anything in the job list that we DIDN'T run (because it was already
  // narrated and force=false, or because we hit the limit) counts as
  // skipped — record it so the admin UI has the full picture.
  for (const job of jobs) {
    if (results.some((r) => r.slug === job.slug)) continue;
    if (existingSlugs.has(job.slug) && !force) {
      skipped += 1;
      results.push({
        slug: job.slug,
        title: job.title,
        status: 'skipped',
      });
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: jobs.length,
      generated,
      failed,
      skipped,
      processed: capped.length,
    },
    results,
  });
}
