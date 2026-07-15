import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { ALL_ARTICLES } from '@/lib/content/articles';
import { GUIDES } from '@/lib/content/guides';

/**
 * GET /api/admin/tts — list every narratable article + guide with its
 * current generation status.
 *
 * Auth: admin-only — auto-guarded by middleware (path /api/admin/*).
 *
 * Returns:
 *   {
 *     items: [
 *       { slug, title, kind: 'article'|'guide', cluster?, status: 'generated'|'missing',
 *         durationSec?, fileSizeBytes?, voice?, createdAt?, audioUrl? }
 *     ],
 *     summary: { total, generated, missing }
 *   }
 *
 * The 'failed' state is not stored — failures aren't persisted in the DB
 * (the route returns 500 on total failure; partial failures still produce
 * a usable MP3). So 'missing' below means "no narration row exists for
 * this slug" which covers both never-attempted and previously-failed.
 */

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

export async function GET(_request: NextRequest) {
  // ─── Pull all narration rows ───────────────────────────────────────
  const rows = await db.audioNarration.findMany({
    select: {
      slug: true,
      title: true,
      audioUrl: true,
      duration: true,
      voice: true,
      createdAt: true,
    },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  // ─── Build the unified list ────────────────────────────────────────
  type Item = {
    slug: string;
    title: string;
    kind: 'article' | 'guide';
    cluster?: string;
    status: 'generated' | 'missing';
    durationSec?: number;
    fileSizeBytes?: number;
    voice?: string;
    createdAt?: string;
    audioUrl?: string;
  };

  const items: Item[] = [];

  // Articles
  for (const a of ALL_ARTICLES) {
    const row = bySlug.get(a.slug);
    const filepath = path.join(AUDIO_DIR, `${a.slug}.mp3`);
    const fileExists = existsSync(filepath);
    if (row && fileExists) {
      let fileSizeBytes = 0;
      try {
        const stat = await fs.stat(filepath);
        fileSizeBytes = stat.size;
      } catch {
        // file vanished between existsSync + stat — treat as 0
      }
      items.push({
        slug: a.slug,
        title: a.title,
        kind: 'article',
        cluster: a.cluster,
        status: 'generated',
        durationSec: (row as any)?.duration,
        fileSizeBytes,
        voice: (row as any)?.voice,
        createdAt: (row as any)?.createdAt?.toISOString(),
        audioUrl: (row as any)?.audioUrl,
      });
    } else {
      items.push({
        slug: a.slug,
        title: a.title,
        kind: 'article',
        cluster: a.cluster,
        status: 'missing',
      });
    }
  }

  // Guides
  for (const g of GUIDES) {
    const row = bySlug.get(g.slug);
    const filepath = path.join(AUDIO_DIR, `${g.slug}.mp3`);
    const fileExists = existsSync(filepath);
    if (row && fileExists) {
      let fileSizeBytes = 0;
      try {
        const stat = await fs.stat(filepath);
        fileSizeBytes = stat.size;
      } catch {
        // ignore
      }
      items.push({
        slug: g.slug,
        title: g.title,
        kind: 'guide',
        status: 'generated',
        durationSec: (row as any)?.duration,
        fileSizeBytes,
        voice: (row as any)?.voice,
        createdAt: (row as any)?.createdAt?.toISOString(),
        audioUrl: (row as any)?.audioUrl,
      });
    } else {
      items.push({
        slug: g.slug,
        title: g.title,
        kind: 'guide',
        status: 'missing',
      });
    }
  }

  return NextResponse.json({
    items,
    summary: {
      total: items.length,
      generated: items.filter((i) => i.status === 'generated').length,
      missing: items.filter((i) => i.status === 'missing').length,
    },
    voices: ['tongtong', 'chuichui', 'xiaochen', 'jam', 'kazi', 'douji', 'luodo'],
  });
}
