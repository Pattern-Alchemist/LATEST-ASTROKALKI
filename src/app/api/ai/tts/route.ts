import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { ALL_ARTICLES } from '@/lib/content/articles';
import { GUIDES } from '@/lib/content/guides';
import {
  isSessionValid,
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';
import { generateNarration, GenerateNarrationOptions } from '@/lib/ai/tts-generator';

/**
 * POST /api/ai/tts — generate (or regenerate) the MP3 narration for a
 * single article or guide.
 *
 * Body: { slug: string, force?: boolean, voice?: Voice, speed?: number }
 *
 * Auth: admin-only. This route lives under /api/ai/* (NOT /api/admin/*),
 * so the middleware's auto-guard doesn't apply. We manually verify the
 * admin session cookie here. Without this check, anyone could spend ZAI
 * TTS quota by hitting this endpoint.
 *
 * Rate-limit: 5 generations per hour per IP. TTS synthesis is slow +
 * costs money; even an admin shouldn't be able to accidentally trigger
 * 30 regenerations in a minute.
 *
 * Output:
 *   { success: true, slug, title, audioUrl, durationSec, chunksGenerated, chunksSkipped }
 *   { success: true, skipped: true }        — already exists, force not set
 *   400 — missing/unknown slug
 *   401 — no admin session
 *   429 — rate-limited
 *   500 — generation failed entirely
 */

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

interface TtsRequestBody {
  slug: string;
  force?: boolean;
  voice?: GenerateNarrationOptions['voice'];
  speed?: number;
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
  const rlKey = `tts-gen:${ip}`;
  const rl = checkRateLimit(rlKey, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate-limited — try again in ${rl.retryAfterSeconds}s` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── Parse + validate body ─────────────────────────────────────────
  let body: TtsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug) {
    return NextResponse.json({ error: 'Missing "slug" field' }, { status: 400 });
  }

  const force = body.force === true;
  const voice = body.voice;
  const speed = typeof body.speed === 'number' && body.speed >= 0.5 && body.speed <= 2.0
    ? body.speed
    : 1.0;

  // ─── Resolve slug → article or guide ───────────────────────────────
  const article = ALL_ARTICLES.find((a) => a.slug === slug);
  const guide = !article ? GUIDES.find((g) => g.slug === slug) : undefined;
  if (!article && !guide) {
    return NextResponse.json(
      { error: `No article or guide found for slug "${slug}"` },
      { status: 400 }
    );
  }

  const title = article?.title ?? guide!.title;

  // ─── Skip if already narrated, unless force ────────────────────────
  const existing = await db.audioNarration.findUnique({ where: { slug } });
  if (existing && !force) {
    return NextResponse.json({
      success: true,
      skipped: true,
      slug,
      title,
      audioUrl: existing.audioUrl,
      durationSec: existing.duration,
      message: 'Narration already exists — pass force=true to regenerate.',
    });
  }

  // ─── Build the text to narrate ─────────────────────────────────────
  // We narrate the concise answer + key takeaways + body. The excerpt is
  // a summary of the body so we skip it to avoid duplication. FAQs +
  // references are skipped — they don't translate well to a flowing
  // narration and add 5+ minutes of run time per article.
  let narrationText: string;
  if (article) {
    narrationText = [
      article.title,
      article.conciseAnswer,
      ...article.keyTakeaways.map((k, i) => `Key takeaway ${i + 1}. ${k}`),
      article.body,
    ].join('\n\n');
  } else {
    narrationText = [
      guide!.title,
      guide!.headline,
      guide!.conciseAnswer,
      ...guide!.keyTakeaways.map((k, i) => `Key takeaway ${i + 1}. ${k}`),
      guide!.body,
    ].join('\n\n');
  }

  // ─── Generate ──────────────────────────────────────────────────────
  let generation;
  try {
    generation = await generateNarration(narrationText, { voice, speed });
  } catch (err) {
    console.error(`[tts] generation threw for slug=${slug}:`, err);
    return NextResponse.json(
      { error: 'TTS generation failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  if (generation.buffer.length === 0) {
    return NextResponse.json(
      {
        error: 'TTS generation produced no audio (every chunk failed)',
        chunksSkipped: generation.chunksSkipped,
      },
      { status: 500 }
    );
  }

  // ─── Persist to disk ───────────────────────────────────────────────
  try {
    if (!existsSync(AUDIO_DIR)) {
      await fs.mkdir(AUDIO_DIR, { recursive: true });
    }
    const filename = `${slug}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    await fs.writeFile(filepath, generation.buffer);
  } catch (err) {
    console.error(`[tts] failed to write audio file for slug=${slug}:`, err);
    return NextResponse.json(
      { error: 'Failed to write audio file' },
      { status: 500 }
    );
  }

  const audioUrl = `/audio/${slug}.mp3`;

  // ─── Upsert DB record ──────────────────────────────────────────────
  // upsert covers both the "new" case and the "regenerate" case.
  try {
    await db.audioNarration.upsert({
      where: { slug },
      create: {
        slug,
        title,
        audioUrl,
        duration: generation.durationSec,
        voice: voice ?? 'tongtong',
      },
      update: {
        title,
        audioUrl,
        duration: generation.durationSec,
        voice: voice ?? 'tongtong',
      },
    });
  } catch (err) {
    // File is already on disk; the DB upsert failure shouldn't return 500
    // because the user could re-trigger with force and the file would be
    // served. Log it though.
    console.error(`[tts] DB upsert failed for slug=${slug}:`, err);
  }

  return NextResponse.json({
    success: true,
    slug,
    title,
    audioUrl,
    durationSec: generation.durationSec,
    chunksGenerated: generation.chunksGenerated,
    chunksSkipped: generation.chunksSkipped,
    fileSizeBytes: generation.buffer.length,
    voice: voice ?? 'tongtong',
  });
}
