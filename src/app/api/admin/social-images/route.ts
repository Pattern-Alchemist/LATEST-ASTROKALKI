import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { ALL_ARTICLES } from '@/lib/content/articles';
import { GUIDES } from '@/lib/content/guides';
import { ATLAS_PATTERNS } from '@/lib/content/patterns/atlas';

/**
 * /api/admin/social-images — list social share image status across every
 * content surface (articles + atlas patterns + guides).
 *
 * Auth: admin-only — auto-guarded by middleware (path /api/admin/*).
 *
 * GET — returns the per-slug status of every social image. Used by the
 *      /admin/social-images page to render its card grid.
 *
 *      Returns:
 *        {
 *          items: [
 *            { slug, title, kind: 'article'|'atlas'|'guide',
 *              cluster?, category, status: 'generated'|'missing',
 *              imageUrl?, prompt?, createdAt? }
 *          ],
 *          summary: { total, generated, missing, byKind: {...} }
 *        }
 *
 * Note: single-slug generation + bulk generation live under
 * /api/ai/social-image (POST) and /api/ai/social-image/generate-all (POST)
 * respectively. This endpoint is read-only.
 */

const SOCIAL_DIR = path.join(process.cwd(), 'public', 'social-images');

type Kind = 'article' | 'atlas' | 'guide';

interface Item {
  slug: string;
  title: string;
  kind: Kind;
  cluster?: string;
  category: string;
  status: 'generated' | 'missing';
  imageUrl?: string;
  prompt?: string;
  createdAt?: string;
}

export async function GET(_request: NextRequest) {
  // Pull all SocialImage rows in one query, then build an in-memory map.
  const rows = await db.socialImage.findMany({
    select: {
      slug: true,
      imageUrl: true,
      prompt: true,
      createdAt: true,
    },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const items: Item[] = [];

  // Articles
  for (const a of ALL_ARTICLES) {
    const row = bySlug.get(a.slug);
    const filepath = path.join(SOCIAL_DIR, `${a.slug}.png`);
    const fileExists = existsSync(filepath);
    if (row && fileExists) {
      items.push({
        slug: a.slug,
        title: a.title,
        kind: 'article',
        cluster: a.cluster,
        category: a.cluster,
        status: 'generated',
        imageUrl: (row as any)?.imageUrl,
        prompt: (row as any)?.prompt,
        createdAt: (row as any)?.createdAt?.toISOString(),
      });
    } else {
      items.push({
        slug: a.slug,
        title: a.title,
        kind: 'article',
        cluster: a.cluster,
        category: a.cluster,
        status: 'missing',
      });
    }
  }

  // Atlas patterns
  for (const p of ATLAS_PATTERNS) {
    const row = bySlug.get(p.slug);
    const filepath = path.join(SOCIAL_DIR, `${p.slug}.png`);
    const fileExists = existsSync(filepath);
    if (row && fileExists) {
      items.push({
        slug: p.slug,
        title: p.name,
        kind: 'atlas',
        category: 'atlas',
        status: 'generated',
        imageUrl: (row as any)?.imageUrl,
        prompt: (row as any)?.prompt,
        createdAt: (row as any)?.createdAt?.toISOString(),
      });
    } else {
      items.push({
        slug: p.slug,
        title: p.name,
        kind: 'atlas',
        category: 'atlas',
        status: 'missing',
      });
    }
  }

  // Guides
  for (const g of GUIDES) {
    const row = bySlug.get(g.slug);
    const filepath = path.join(SOCIAL_DIR, `${g.slug}.png`);
    const fileExists = existsSync(filepath);
    if (row && fileExists) {
      items.push({
        slug: g.slug,
        title: g.title,
        kind: 'guide',
        category: 'guide',
        status: 'generated',
        imageUrl: (row as any)?.imageUrl,
        prompt: (row as any)?.prompt,
        createdAt: (row as any)?.createdAt?.toISOString(),
      });
    } else {
      items.push({
        slug: g.slug,
        title: g.title,
        kind: 'guide',
        category: 'guide',
        status: 'missing',
      });
    }
  }

  const summary = {
    total: items.length,
    generated: items.filter((i) => i.status === 'generated').length,
    missing: items.filter((i) => i.status === 'missing').length,
    byKind: {
      article: {
        total: items.filter((i) => i.kind === 'article').length,
        generated: items.filter(
          (i) => i.kind === 'article' && i.status === 'generated'
        ).length,
      },
      atlas: {
        total: items.filter((i) => i.kind === 'atlas').length,
        generated: items.filter(
          (i) => i.kind === 'atlas' && i.status === 'generated'
        ).length,
      },
      guide: {
        total: items.filter((i) => i.kind === 'guide').length,
        generated: items.filter(
          (i) => i.kind === 'guide' && i.status === 'generated'
        ).length,
      },
    },
  };

  return NextResponse.json({ items, summary });
}
