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
 * POST /api/ai/social-image — generate (or regenerate) the AI social share
 * image for a single article, atlas pattern, or guide.
 *
 * Body: { slug: string, type: "article" | "atlas" | "guide", force?: boolean }
 *
 * Auth: admin-only. This route lives under /api/ai/* (NOT /api/admin/*), so
 * the middleware's auto-guard doesn't apply here. We manually verify the
 * admin session cookie. Without this check, anyone could spend ZAI image-
 * generation quota by hitting this endpoint.
 *
 * Rate-limit: 5 generations per hour per IP. Image generation is expensive
 * (compute + cost); 5/hr lets an admin regenerate a few cards while
 * iterating on the prompt aesthetic without leaving the door open to
 * runaway spending.
 *
 * Output:
 *   { success: true, slug, type, imageUrl, prompt }
 *   { success: true, skipped: true, slug, imageUrl, message } — already exists
 *   400 — missing/invalid slug or type
 *   401 — no admin session
 *   429 — rate-limited
 *   502 — image generation failed
 *   500 — persistence failed
 *
 * Images are stored at /public/social-images/<slug>.png (overwriting on
 * regenerate). The SocialImage row is upserted — the `prompt` column is
 * updated so regenerations reflect the latest prompt logic.
 */

const SOCIAL_DIR = path.join(process.cwd(), 'public', 'social-images');

type ContentType = 'article' | 'atlas' | 'guide';

interface SocialImageRequestBody {
  slug: string;
  type: ContentType;
  force?: boolean;
}

/**
 * Resolve (slug, type) → the inputs the prompt builder needs.
 *
 * Returns null if the slug doesn't exist in the corresponding content set.
 */
function resolveContent(
  slug: string,
  type: ContentType
):
  | {
      title: string;
      excerpt: string;
      description?: string;
      category: string;
      prompt: string;
    }
  | null {
  if (type === 'article') {
    const article = ALL_ARTICLES.find((a) => a.slug === slug);
    if (!article) return null;
    return {
      title: article.title,
      excerpt: article.excerpt,
      category: article.cluster,
      prompt: getArticleCardPrompt(
        article.title,
        article.excerpt,
        article.cluster
      ),
    };
  }

  if (type === 'atlas') {
    const pattern = ATLAS_PATTERNS.find((p) => p.slug === slug);
    if (!pattern) return null;
    return {
      title: pattern.name,
      excerpt: pattern.conciseAnswer,
      description: pattern.conciseAnswer,
      category: 'atlas',
      prompt: getAtlasCardPrompt(pattern.name, pattern.conciseAnswer),
    };
  }

  // guide
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return null;
  return {
    title: guide.title,
    excerpt: guide.excerpt,
    category: 'guide',
    prompt: getGuideCardPrompt(guide.title),
  };
}

export async function POST(request: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────
  // Manually verify the admin session cookie. The middleware auto-guards
  // /api/admin/* but this route sits under /api/ai/*.
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await isSessionValid(session))) {
    return NextResponse.json(
      { error: 'Unauthorized — admin session required' },
      { status: 401 }
    );
  }

  // ─── Rate-limit: 5 generations per hour per IP ─────────────────────
  const ip = getClientIp(request);
  const rlKey = `social-image:${ip}`;
  const rl = checkRateLimit(rlKey, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate-limited — try again in ${rl.retryAfterSeconds}s` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── Parse + validate body ─────────────────────────────────────────
  let body: SocialImageRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug) {
    return NextResponse.json(
      { error: 'Missing "slug" field' },
      { status: 400 }
    );
  }

  const type: ContentType =
    body.type === 'article' || body.type === 'atlas' || body.type === 'guide'
      ? body.type
      : ('' as ContentType);
  if (!type) {
    return NextResponse.json(
      { error: 'Missing or invalid "type" — must be "article" | "atlas" | "guide"' },
      { status: 400 }
    );
  }

  const force = body.force === true;

  // ─── Resolve slug → content ────────────────────────────────────────
  const content = resolveContent(slug, type);
  if (!content) {
    return NextResponse.json(
      { error: `No ${type} found for slug "${slug}"` },
      { status: 400 }
    );
  }

  // ─── Skip if already generated, unless force ───────────────────────
  const existing = await db.socialImage.findUnique({ where: { slug } });
  if (existing && !force) {
    return NextResponse.json({
      success: true,
      skipped: true,
      slug,
      type,
      imageUrl: existing.imageUrl,
      prompt: existing.prompt,
      message: 'Social image already exists — pass force=true to regenerate.',
    });
  }

  // ─── Build the prompt ──────────────────────────────────────────────
  const prompt = content.prompt;

  // ─── Call the Z.ai image-generation SDK ────────────────────────────
  let imageBase64: string;
  try {
    const zai = await getZAI();
    const response = await zai.images.generations.create({
      prompt,
      size: '1344x768', // landscape, sized for social cards
    });
    imageBase64 = response.data[0]?.base64;
    if (!imageBase64) {
      throw new Error('Image generation returned no base64 data');
    }
  } catch (error) {
    console.error(
      `[social-image] generation failed for slug=${slug} type=${type}:`,
      error
    );
    return NextResponse.json(
      {
        error:
          'Image generation failed. The image service is temporarily unavailable — please try again in a moment.',
      },
      { status: 502 }
    );
  }

  // ─── Persist the PNG to /public/social-images/<slug>.png ───────────
  // Stable per-slug filename (not a UUID) so regenerations overwrite the
  // previous file instead of accumulating orphan PNGs.
  const filename = `${slug}.png`;
  const filepath = path.join(SOCIAL_DIR, filename);

  try {
    if (!existsSync(SOCIAL_DIR)) {
      await mkdir(SOCIAL_DIR, { recursive: true });
    }
    const buffer = Buffer.from(imageBase64, 'base64');
    await writeFile(filepath, buffer);
  } catch (error) {
    console.error(
      `[social-image] failed to write image file for slug=${slug}:`,
      error
    );
    return NextResponse.json(
      { error: 'Failed to save social image. Please try again.' },
      { status: 500 }
    );
  }

  const imageUrl = `/social-images/${filename}`;

  // ─── Upsert DB record ──────────────────────────────────────────────
  // upsert covers both the "new" case and the "regenerate" case.
  try {
    await db.socialImage.upsert({
      where: { slug },
      create: {
        slug,
        imageUrl,
        prompt,
      },
      update: {
        imageUrl,
        prompt,
      },
    });
  } catch (error) {
    // File is already on disk; the DB upsert failure shouldn't return 500
    // because the next call with force will rewrite the file and retry the
    // upsert. Log it though.
    console.error(
      `[social-image] DB upsert failed for slug=${slug}:`,
      error
    );
  }

  return NextResponse.json({
    success: true,
    slug,
    type,
    title: content.title,
    imageUrl,
    prompt,
  });
}
