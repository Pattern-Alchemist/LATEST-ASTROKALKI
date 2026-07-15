/**
 * TTS narration generator — converts article text to an MP3 audio buffer.
 *
 * Pipeline:
 *   1. Strip markdown from the source text (TTS reads symbols literally).
 *   2. Split into TTS-safe chunks (≤1000 chars, sentence-aware) via
 *      `splitTextForTTS` from the SDK helper.
 *   3. For each chunk, call `zai.audio.tts.create` (max 1024 chars/call).
 *      On failure, retry once. If the retry fails, skip the chunk and keep
 *      going — partial narration is better than no narration, and the
 *      caller can `force` a regenerate later.
 *   4. Concatenate the MP3 chunk buffers into one Buffer.
 *      (MP3 frames are independent — naive byte concat works for our
 *      purposes; the player doesn't need to know about segment boundaries.)
 *   5. Estimate duration from char count / 15 (≈ 15 chars/sec at speed 1.0
 *      for English narration; rough but close enough for the UI).
 *
 * Voices: tongtong, chuichui, xiaochen, jam, kazi, douji, luodo
 *
 * Used by:
 *   - /api/ai/tts           (single article/guide)
 *   - /api/admin/tts/generate-all  (bulk)
 */

import { getZAI, splitTextForTTS } from '@/lib/zai';

export interface GenerateNarrationOptions {
  /** TTS voice (defaults to tongtong — warm, neutral narrator). */
  voice?:
    | 'tongtong'
    | 'chuichui'
    | 'xiaochen'
    | 'jam'
    | 'kazi'
    | 'douji'
    | 'luodo';
  /** Speech rate 0.5–2.0 (defaults to 1.0). */
  speed?: number;
}

export interface GeneratedNarration {
  /** Concatenated MP3 bytes. */
  buffer: Buffer;
  /** Estimated duration in seconds (rough — char count / 15 at speed 1.0). */
  durationSec: number;
  /** Number of chunks that were actually spoken (chunks that errored are skipped). */
  chunksGenerated: number;
  /** Number of chunks that failed after retry and were skipped. */
  chunksSkipped: number;
}

/**
 * Strip markdown formatting so the TTS engine reads only the prose.
 * Same regex set the task spec specifies — kept here so callers don't
 * have to remember to strip before passing text in.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')      // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')    // images
    .replace(/`{1,3}[^`]*`{1,3}/g, '')  // code
    .replace(/^\s*[-*+]\s+/gm, '')      // list items
    .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
    .replace(/^\s*>\s+/gm, '')          // blockquotes
    .replace(/\n{3,}/g, '\n\n')         // collapse whitespace
    .trim();
}

/**
 * Generate a single MP3 buffer for an arbitrary text string.
 *
 * Returns:
 *   - buffer: concatenated MP3 bytes (empty if every chunk failed)
 *   - durationSec: rough estimate, scaled by speed
 *   - chunksGenerated / chunksSkipped: for the caller's logging
 */
export async function generateNarration(
  text: string,
  opts: GenerateNarrationOptions = {}
): Promise<GeneratedNarration> {
  const voice = opts.voice ?? 'tongtong';
  const speed = opts.speed ?? 1.0;

  // Strip markdown BEFORE chunking so sentence boundaries fall on real
  // punctuation, not on ## or - markers.
  const clean = stripMarkdown(text);

  // 1000 chars per chunk leaves ~24 chars of headroom under the SDK's
  // 1024-char hard cap (safer than splitting at exactly 1024).
  const chunks = splitTextForTTS(clean, 1000).filter((c) => c.trim().length > 0);

  if (chunks.length === 0) {
    return { buffer: Buffer.alloc(0), durationSec: 0, chunksGenerated: 0, chunksSkipped: 0 };
  }

  const zai = await getZAI();
  const buffers: Buffer[] = [];
  let chunksGenerated = 0;
  let chunksSkipped = 0;
  let totalChars = 0;

  for (const chunk of chunks) {
    totalChars += chunk.length;

    const buffer = await synthesizeChunkWithRetry(zai, chunk, voice, speed);
    if (buffer) {
      buffers.push(buffer);
      chunksGenerated += 1;
    } else {
      chunksSkipped += 1;
    }
  }

  const combined = buffers.length > 0 ? Buffer.concat(buffers) : Buffer.alloc(0);

  // Rough duration: ~15 chars/sec at speed 1.0 for English narration.
  // Scale by 1/speed so the estimate tracks the requested rate.
  const durationSec = Math.max(1, Math.round(totalChars / 15 / speed));

  return {
    buffer: combined,
    durationSec,
    chunksGenerated,
    chunksSkipped,
  };
}

/**
 * Call the ZAI TTS endpoint for a single chunk. On any error, retry once
 * (network blips / transient 5xxs). If the retry also fails, return null
 * and the caller will skip the chunk — we don't throw so a single bad
 * chunk doesn't nuke the whole article narration.
 */
async function synthesizeChunkWithRetry(
  zai: Awaited<ReturnType<typeof getZAI>>,
  text: string,
  voice: NonNullable<GenerateNarrationOptions['voice']>,
  speed: number
): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await zai.audio.tts.create({
        input: text,
        voice,
        speed,
        response_format: 'mp3',
        stream: false,
      });

      // The SDK returns a Web Response-like object whose arrayBuffer()
      // resolves to the raw MP3 bytes.
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(new Uint8Array(arrayBuffer));
    } catch (err) {
      // Log and retry once. On the second failure, give up on this chunk.
      console.error(
        `[tts] chunk synthesis failed (attempt ${attempt + 1}/2, ${text.length} chars):`,
        err instanceof Error ? err.message : String(err)
      );
      // Brief backoff before retry — avoids hammering on a transient 5xx.
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  return null;
}
