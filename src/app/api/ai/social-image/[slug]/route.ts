import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

/**
 * GET /api/ai/social-image/[slug] — stream the AI-generated social share
 * PNG for the given slug.
 *
 * Public (no auth) — OG images are fetched by social-platform crawlers
 * (Twitter, Facebook, LinkedIn, Slack, iMessage) which can't authenticate.
 *
 * Behaviour:
 *   1. If a SocialImage row exists for the slug AND the PNG file is on
 *      disk, stream the PNG with image/png Content-Type and aggressive
 *      caching (1 day client / 7 day edge, immutable).
 *
 *   2. Otherwise, 307-redirect to /api/og?slug=<slug>. The /api/og route
 *      will then either serve a generated card (if one exists for the
 *      slug — defensive double-lookup) or fall through to its
 *      programmatic ImageResponse poster. This way every page always
 *      gets a valid OG image, whether or not an admin has generated the
 *      AI card yet.
 *
 * Used by:
 *   - /insights/[slug]/page.tsx  → metadata.openGraph.images[0].url
 *   - /patterns/atlas/[slug]/page.tsx → metadata.openGraph.images[0].url
 *   - /guides/[slug]/page.tsx → metadata.openGraph.images[0].url
 */

const SOCIAL_DIR = path.join(process.cwd(), 'public', 'social-images');

// Cache the redirect for a short time at the edge so crawlers that re-fetch
// the same URL don't re-hit the DB every time. Once a card is generated,
// the next fetch will hit path 1 (the PNG itself).
const REDIRECT_CACHE_CONTROL = 'public, max-age=300, s-maxage=600';
const PNG_CACHE_CONTROL =
  'public, max-age=86400, s-maxage=604800, immutable';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Defensive: strip any path-traversal attempts.
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '');
  if (!safeSlug || safeSlug !== slug) {
    return NextResponse.json(
      { error: 'Invalid slug' },
      { status: 400 }
    );
  }

  // ─── DB lookup ─────────────────────────────────────────────────────
  // If the row doesn't exist, no AI card was ever generated for this slug.
  let row: { imageUrl: string } | null = null;
  try {
    row = await db.socialImage.findUnique({
      where: { slug },
      select: { imageUrl: true },
    });
  } catch (err) {
    // If the DB lookup fails, fall through to the redirect — the OG
    // endpoint has its own programmatic fallback that doesn't need the DB.
    console.error(
      `[ai/social-image/[slug]] DB lookup failed for slug=${slug}:`,
      err
    );
  }

  // ─── File lookup + stream ──────────────────────────────────────────
  if (row) {
    const filepath = path.join(SOCIAL_DIR, `${slug}.png`);
    if (existsSync(filepath)) {
      try {
        const buffer = await readFile(filepath);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': PNG_CACHE_CONTROL,
            // OG images are commonly hot-linked; allow it.
            'Access-Control-Allow-Origin': '*',
            'X-Robots-Tag': 'index, follow',
          },
        });
      } catch (err) {
        console.error(
          `[ai/social-image/[slug]] readFile failed for slug=${slug}:`,
          err
        );
        // Fall through to redirect.
      }
    }
  }

  // ─── Fallback: redirect to /api/og ─────────────────────────────────
  // /api/og?slug=<slug> will:
  //   - serve the AI card if one exists (defensive double-lookup), or
  //   - render the programmatic ImageResponse poster as a last resort.
  const fallbackUrl = request.nextUrl.clone();
  fallbackUrl.pathname = '/api/og';
  fallbackUrl.search = `?slug=${encodeURIComponent(slug)}`;

  return NextResponse.redirect(fallbackUrl, {
    status: 307,
    headers: {
      'Cache-Control': REDIRECT_CACHE_CONTROL,
    },
  });
}
