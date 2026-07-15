import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

/**
 * GET /api/tts/[slug] — stream the pre-generated MP3 narration for an
 * article or guide.
 *
 * Public endpoint (no auth — audio is meant to be heard by anyone reading
 * the article). Returns 404 if no narration exists for the slug yet.
 *
 * The MP3 itself lives at public/audio/<slug>.mp3 and is also directly
 * servable via Next's static file middleware; we expose this endpoint so
 * the player can:
 *   - probe whether audio exists (HEAD-style GET → 404 means "no audio
 *     yet", 200 means "go ahead and play") without parsing the FS from
 *     the client
 *   - return a stable URL shape that we can later swap for a CDN/S3
 *     signed-URL backend without touching the client player
 *
 * Sets long-lived cache headers — the MP3 content for a slug is
 * immutable once generated (regeneration overwrites the same file with
 * the same name, but that's a rare admin action and the worst case is a
 * 24h-stale audio that's still functionally correct).
 */

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Sanitize the slug — only allow URL-safe characters. Prevents path
  // traversal (e.g. slug="../../../etc/passwd") from reading arbitrary
  // files off disk.
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Confirm the slug actually belongs to a known article/guide OR has a
  // narration row in the DB. We check the DB rather than scanning the
  // articles array because future content types might be narrated
  // without being in ALL_ARTICLES (e.g. PillarArticle). If the file
  // exists but the DB row is gone (orphaned file), we still serve it
  // — the file is the source of truth for audio bytes.
  const dbRow = await db.audioNarration.findUnique({ where: { slug } }).catch(() => null);
  const filename = `${slug}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  if (!existsSync(filepath)) {
    // No file → 404. The player treats 404 as "audio not available, hide
    // the player UI".
    return new NextResponse('Not found', { status: 404 });
  }

  // Stream the file. We use Node's fs.readFile (fine for ≤10MB MP3s —
  // articles average 2–4MB; pillar guides top out around 8MB). If we
  // ever needed true streaming we'd swap to fs.createReadStream, but
  // the platform's NextResponse doesn't accept a Node Readable directly
  // and the convenience tradeoff isn't worth it for these file sizes.
  let data: Buffer;
  try {
    data = await fs.readFile(filepath);
  } catch (err) {
    console.error(`[tts] failed to read ${filepath}:`, err);
    return new NextResponse('Failed to read audio', { status: 500 });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Content-Length', String(data.length));
  // 24h browser + CDN cache. Audio is immutable per slug once generated.
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  // Allow cross-origin loading so the audio element can fetch from any
  // preview domain we deploy to.
  headers.set('Access-Control-Allow-Origin', '*');
  // Hint to the client that we accept range requests — Next's static
  // server supports them natively, but we expose the header here so the
  // browser knows it can seek without re-downloading.
  headers.set('Accept-Ranges', 'bytes');
  // Reuse DB-stored duration if we have it (saves the player computing it
  // from the buffer).
  if (dbRow?.duration) {
    headers.set('X-Audio-Duration', String(dbRow.duration));
    headers.set('X-Audio-Voice', dbRow.voice);
  }

  return new NextResponse(data as unknown as BodyInit, { status: 200, headers });
}

/**
 * HEAD — same as GET but no body, so the client can probe for audio
 * existence cheaply. We support it because some players pre-flight with
 * HEAD before allocating a <audio> element.
 */
export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return new NextResponse(null, { status: 404 });
  }
  const filepath = path.join(AUDIO_DIR, `${slug}.mp3`);
  if (!existsSync(filepath)) {
    return new NextResponse(null, { status: 404 });
  }
  const headers = new Headers();
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  return new NextResponse(null, { status: 200, headers });
}
