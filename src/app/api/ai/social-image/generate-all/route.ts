import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { ALL_ARTICLES } from '@/lib/content/articles';
import { GUIDES } from '@/lib/content/guides';
import { ATLAS_PATTERNS } from '@/lib/content/patterns/atlas';
import {
  isSessionValid,
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';
import {
  getArticleCardPrompt,
  getAtlasCardPrompt,
  getGuideCardPrompt,
} from '@/lib/ai/social-card-prompts';

/**
 * POST /api/ai/social-image/generate-all — bulk generate social share
 * images for every article + atlas pattern + guide that doesn't have one
 * yet (or all of them, if force=true).
 *
 * Body: { force?: boolean, limit?: number }
 *
 * Auth: admin-only — manually verifies the admin session cookie (this
 * route lives under /api/ai/*, NOT /api/admin/*, so middleware's
 * auto-guard doesn't apply).
 *
 * Rate-limit: 1 batch per 10 min per IP. Bulk image generation can take
 * 10-25 minutes for the full set (~40 slugs × ~15s each); we don't want
 * an admin double-clicking and burning two parallel batches of ZAI quota.
 *
 * Sequential with a small inter-call delay. Parallel image generation
 * would hammer the ZAI API and likely trigger rate-limits on their side.
 * Sequential is slower but reliable.
 *
 * Returns a job summary — per-slug results + counts — so the admin UI
 * can show exactly what succeeded and what failed.
 */

const SOCIAL_DIR = path.join(process.cwd(), 'public', 'social-images');

// Inter-call delay between sequential generations, in ms. Lets the ZAI
// service breathe between heavy image calls and reduces the chance of a
// transient 429 from their side.
const INTER_CALL_DELAY_MS = 1500;

type ContentType = 'article' | 'atlas' | 'guide';

interface GenerateAllBody {
  force?: boolean;
  limit?: number;
}

interface JobResult {
  slug: string;
  type: ContentType;
  title: string;
  status: 'generated' | 'skipped' | 'failed';
  imageUrl?: string;
  error?: string;
}

interface Job {
  slug: string;
  type: ContentType;
  title: string;
  prompt: string;
}

/**
 * Build the full job list — every article + every atlas pattern + every
 * guide. Each entry carries the precomputed prompt so we don't re-resolve
 * content inside the hot loop.
 */
function buildJobList(): Job[] {
  const jobs: Job[] = [];

  for (const article of ALL_ARTICLES) {
    jobs.push({
      slug: article.slug,
      type: 'article',
      title: article.title,
      prompt: getArticleCardPrompt(
        article.title,
        article.excerpt,
        article.cluster
      ),
    });
  }

  for (const pattern of ATLAS_PATTERNS) {
    jobs.push({
      slug: pattern.slug,
      type: 'atlas',
      title: pattern.name,
      prompt: getAtlasCardPrompt(pattern.name, pattern.conciseAnswer),
    });
  }

  for (const guide of GUIDES) {
    jobs.push({
      slug: guide.slug,
      type: 'guide',
      title: guide.title,
      prompt: getGuideCardPrompt(guide.title),
    });
  }

  return jobs;
}

export async function POST(request: NextRequest) {
  // ─── Auth — manual admin cookie verification ───────────────────────
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await isSessionValid(session))) {
    return NextResponse.json(
      { error: 'Unauthorized — admin session required' },
      { status: 401 }
    );
  }

  // ─── Rate-limit: 1 batch per 10 min per IP ─────────────────────────
  const ip = getClientIp(request);
  const rlKey = `social-batch:${ip}`;
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
  const limit =
    typeof body.limit === 'number' && body.limit > 0
      ? Math.min(body.limit, 60)
      : 60;

  // ─── Ensure output dir exists ──────────────────────────────────────
  if (!existsSync(SOCIAL_DIR)) {
    try {
      await mkdir(SOCIAL_DIR, { recursive: true });
    } catch (err) {
      console.error('[social-batch] failed to create social dir:', err);
      return NextResponse.json(
        { error: 'Failed to create social-images directory' },
        { status: 500 }
      );
    }
  }

  // ─── Build the job list ────────────────────────────────────────────
  const jobs = buildJobList();

  // ─── Filter: skip already-generated unless force ───────────────────
  const existingSlugs = new Set(
    (await db.socialImage.findMany({ select: { slug: true } })).map(
      (r) => r.slug
    )
  );
  const todo = force ? jobs : jobs.filter((j) => !existingSlugs.has(j.slug));
  const capped = todo.slice(0, limit);

  // ─── Run sequentially ──────────────────────────────────────────────
  const results: JobResult[] = [];
  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < capped.length; i++) {
    const job = capped[i];

    try {
      // Call the Z.ai image-generation SDK
      const zai = await getZAI();
      const response = await zai.images.generations.create({
        prompt: job.prompt,
        size: '1344x768',
      });
      const imageBase64 = response.data[0]?.base64;
      if (!imageBase64) {
        throw new Error('Image generation returned no base64 data');
      }

      // Write file
      const filename = `${job.slug}.png`;
      const filepath = path.join(SOCIAL_DIR, filename);
      const buffer = Buffer.from(imageBase64, 'base64');
      await writeFile(filepath, buffer);

      // Upsert DB
      const imageUrl = `/social-images/${filename}`;
      await db.socialImage.upsert({
        where: { slug: job.slug },
        create: { slug: job.slug, imageUrl, prompt: job.prompt },
        update: { imageUrl, prompt: job.prompt },
      });

      generated += 1;
      results.push({
        slug: job.slug,
        type: job.type,
        title: job.title,
        status: 'generated',
        imageUrl,
      });
    } catch (err) {
      failed += 1;
      results.push({
        slug: job.slug,
        type: job.type,
        title: job.title,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Delay between calls — but not after the last one.
    if (i < capped.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, INTER_CALL_DELAY_MS)
      );
    }
  }

  // Anything in the job list that we DIDN'T run (already had an image and
  // force=false, or we hit the limit) counts as skipped.
  for (const job of jobs) {
    if (results.some((r) => r.slug === job.slug)) continue;
    if (existingSlugs.has(job.slug) && !force) {
      skipped += 1;
      results.push({
        slug: job.slug,
        type: job.type,
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
