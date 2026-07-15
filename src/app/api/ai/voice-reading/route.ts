import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';
import {
  checkRateLimit,
  getClientIp,
  isHoneypotTriggered,
  honeypotSuccessResponse,
} from '@/lib/security';
import { matchForStep } from '@/lib/ai/voice-matcher';

/**
 * Voice micro-reading intake.
 *
 *   POST /api/ai/voice-reading
 *     Content-Type: multipart/form-data
 *     Fields:
 *       audio     — File (webm/wav/mp3/ogg, ≤5MB) recorded by the browser
 *       step      — "1" | "2" | "3"
 *                    1 = birth month
 *                    2 = emotional pattern
 *                    3 = relationship frustration
 *       email     — optional, for context (not stored here — the final
 *                   micro-reading POST persists the row)
 *       website   — honeypot; must be empty
 *
 *   Returns: {
 *     transcription: string,
 *     matchedValue: string | null,  // canonical option ID/name
 *     confidence: number | null,    // 0–1
 *   }
 *
 * Why a separate endpoint (instead of folding ASR into /api/micro-reading):
 *   - The voice intake is a *transcription* step, not the final submission.
 *     The user reviews the transcription, picks/confirms an option, then
 *     proceeds through the normal micro-reading flow.
 *   - This endpoint is stateless — it transcribes & matches, nothing more.
 *   - The middleware already whitelists /api/ai/voice-reading and bumps the
 *     body cap to 10MB for it (see /src/middleware.ts).
 *
 * Rate-limit: 20 calls / hour / IP. A 3-question quiz plus retries should
 * comfortably fit inside that.
 */

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB — generous for a few seconds

const ALLOWED_MIME_PREFIXES = ['audio/'];
const ALLOWED_EXTENSIONS = new Set([
  '.webm', '.wav', '.mp3', '.ogg', '.oga', '.m4a', '.aac', '.weba',
]);

// ── Custom rate-limit preset (20/hr) ────────────────────────────────────────
// The shared RATE_LIMITS map doesn't have a voice-reading preset; we use a
// local one so we don't have to touch /src/lib/security/rate-limit.ts (which
// other agents may be modifying in parallel).
const VOICE_RATE = { windowMs: 60 * 60 * 1000, max: 20 } as const;

/** Lightweight email format check — we don't import the Zod schema here
 *  because email is optional context, not a persisted field. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export async function POST(request: NextRequest) {
  // ─── Rate limit ──────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`vr:${ip}`, VOICE_RATE);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many voice requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── Parse multipart ─────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error('voice-reading formData parse error:', err);
    return NextResponse.json(
      { error: 'Invalid multipart form data' },
      { status: 400 }
    );
  }

  // ─── Honeypot ────────────────────────────────────────────────────────
  // Honeypot field is named `website` (matches the rest of the codebase).
  // Silently succeed for bots.
  const honeypotValue = formData.get('website');
  if (
    honeypotValue !== null &&
    typeof honeypotValue === 'string' &&
    honeypotValue.trim() !== ''
  ) {
    return NextResponse.json(
      honeypotSuccessResponse('micro-reading'),
      { status: 200 }
    );
  }
  // (Also cover the case where the honeypot helper detects something — it's
  // an extra safety net if future form encodings slip a string-typed
  // honeypot field through.)
  const formRecord: Record<string, unknown> = {};
  if (honeypotValue !== null) formRecord.website = honeypotValue;
  if (isHoneypotTriggered(formRecord)) {
    return NextResponse.json(
      honeypotSuccessResponse('micro-reading'),
      { status: 200 }
    );
  }

  // ─── Validate step ───────────────────────────────────────────────────
  const stepRaw = formData.get('step');
  const stepNum = Number(stepRaw);
  if (
    !Number.isInteger(stepNum) ||
    stepNum < 1 ||
    stepNum > 3 ||
    String(stepRaw) !== String(stepNum)
  ) {
    return NextResponse.json(
      { error: 'Invalid step — must be 1, 2, or 3' },
      { status: 400 }
    );
  }

  // ─── Optional email (context only) ───────────────────────────────────
  const emailRaw = formData.get('email');
  const email =
    typeof emailRaw === 'string' && emailRaw.trim() !== ''
      ? emailRaw.trim().toLowerCase()
      : '';
  if (email && !looksLikeEmail(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  // ─── Validate audio file ─────────────────────────────────────────────
  const file = formData.get('audio');
  if (!file) {
    return NextResponse.json(
      { error: 'Missing "audio" file field' },
      { status: 400 }
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: '"audio" field must be a file' },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: 'Audio file is empty' },
      { status: 400 }
    );
  }
  if (file.size > MAX_AUDIO_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `Audio is ${mb}MB — max is 5MB` },
      { status: 413 }
    );
  }

  const mimeType = (file.type || '').toLowerCase();
  // Derive extension from filename when present.
  const filename = file.name || '';
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : '';
  const mimeOk = ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
  const extOk = ext !== '' && ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return NextResponse.json(
      {
        error: `Audio type not allowed. Got ${mimeType || 'unknown'}${ext ? ` (${ext})` : ''}. Allowed: webm/wav/mp3/ogg/m4a/aac.`,
      },
      { status: 415 }
    );
  }

  // ─── Convert to base64 ───────────────────────────────────────────────
  let base64Audio: string;
  try {
    const arrayBuf = await file.arrayBuffer();
    base64Audio = Buffer.from(arrayBuf).toString('base64');
  } catch (err) {
    console.error('voice-reading: failed to read audio bytes:', err);
    return NextResponse.json(
      { error: 'Could not read audio' },
      { status: 500 }
    );
  }

  // ─── ASR ─────────────────────────────────────────────────────────────
  let transcription = '';
  try {
    const zai = await getZAI();
    const response = await zai.audio.asr.create({
      file_base64: base64Audio,
    });
    transcription =
      (response && typeof response.text === 'string' ? response.text : '') || '';
  } catch (err) {
    console.error('voice-reading: ASR failed:', err);
    return NextResponse.json(
      {
        error:
          'Transcription service unavailable. Please try again or type your answer.',
      },
      { status: 502 }
    );
  }

  if (!transcription.trim()) {
    // ASR returned empty — usually means silence or undetectable speech.
    return NextResponse.json(
      {
        transcription: '',
        matchedValue: null,
        confidence: null,
        error: 'No speech detected. Try speaking closer to the mic.',
      },
      { status: 200 }
    );
  }

  // ─── Match ───────────────────────────────────────────────────────────
  const match = matchForStep(stepNum, transcription);

  return NextResponse.json(
    {
      transcription,
      matchedValue: match ? match.matchedValue : null,
      confidence: match ? match.confidence : null,
    },
    { status: 200 }
  );
}
