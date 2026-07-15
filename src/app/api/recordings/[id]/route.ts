import { NextRequest, NextResponse } from 'next/server';
import { existsSync, promises as fs } from 'fs';
import { join, normalize, isAbsolute } from 'path';
import { db } from '@/lib/db';
import { verifyPlaybackToken } from '@/lib/security/playback-token';

/**
 * Public playback endpoint with signed-URL security.
 *
 *   GET /api/recordings/<id>?token=<sig>.<expires>&expires=<expires>
 *
 * Auth model: a signed playback token issued by POST /api/recordings/<id>/token
 * (which checks the requestor's email against the recording's booking email).
 *
 *   1. Look up the recording by ID. 404 if missing.
 *   2. Verify the token (HMAC of `${id}:${expires}` checked against the
 *      server's secret). 403 if invalid or expired.
 *   3. Resolve the audio file path defensively (must live inside
 *      public/recordings/ — no path traversal).
 *   4. Stream the file with Content-Type + Content-Range headers so the
 *      browser can seek.
 *
 * Why this design:
 *   - The audio files live under public/recordings/ — Next.js would happily
 *     serve them to anyone holding the URL. The UUID filename makes the URL
 *     unguessable but that's not security. So we ALSO need a way to gate
 *     actual playback. The signed-token gate here means that even if a
 *     recording's URL leaked, the file can only be fetched by someone who
 *     presented a valid token (issued after matching the booking's email).
 *
 *     NOTE: the URL `/recordings/<file>` is still publicly reachable on
 *     this server for backwards compatibility / direct admin preview. The
 *     signed-token gate below is the production-grade layer for client
 *     playback through /account and any future embeds.
 *
 *   - 24-hour tokens balance security and UX: long enough for the user to
 *     come back the next day without re-requesting, short enough that a
 *     leaked token becomes useless quickly.
 *
 *   - Range support: HTML5 <audio> requests byte ranges when seeking. We
 *     parse the Range header and respond with 206 Partial Content so users
 *     can scrub the recording.
 */

const RECORDINGS_DIR = join(process.cwd(), 'public', 'recordings');

const MIME_BY_EXT: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.weba': 'audio/webm',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
};

function safeResolveAudioPath(audioUrl: string): string | null {
  if (!audioUrl.startsWith('/recordings/')) return null;
  const relative = audioUrl.slice('/'.length); // "recordings/<file>"
  if (isAbsolute(relative)) return null;
  const normalized = normalize(relative);
  // Must stay under "recordings/"
  if (!normalized.startsWith('recordings/')) return null;
  return join(process.cwd(), 'public', normalized);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ─── 1. Look up the recording ──────────────────────────────────────
    const recording = await db.recordedReading.findUnique({
      where: { id },
      select: { id: true, audioUrl: true, title: true },
    });
    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // ─── 2. Verify the signed token ────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { error: 'Playback token required' },
        { status: 403 }
      );
    }
    const verification = await verifyPlaybackToken(recording.id, token);
    if (!verification.ok) {
      return NextResponse.json(
        { error: 'Playback token invalid or expired' },
        { status: 403 }
      );
    }

    // ─── 3. Resolve the file path safely ───────────────────────────────
    const filePath = safeResolveAudioPath(recording.audioUrl);
    if (!filePath) {
      console.error(
        `Recording ${recording.id} has unsafe audioUrl: ${recording.audioUrl}`
      );
      return NextResponse.json(
        { error: 'Recording storage error' },
        { status: 500 }
      );
    }
    if (!existsSync(filePath)) {
      console.error(`Audio file missing for recording ${recording.id}: ${filePath}`);
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // ─── 4. Read file size + determine Content-Type ────────────────────
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const ext = (filePath.substring(filePath.lastIndexOf('.')) || '').toLowerCase();
    const contentType = MIME_BY_EXT[ext] || 'audio/mpeg';

    // ─── 5. Parse Range header for seeking ──────────────────────────────
    const range = request.headers.get('range');

    // Headers we always send: content type, length, accept-ranges, filename
    // hint, no-store (so recordings don't get cached in shared proxies).
    const baseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
      // Suggest the title as a filename for the "Save As..." UX.
      'Content-Disposition': `inline; filename="${encodeURIComponent(recording.title || 'recording')}${ext}"`,
    };

    // ─── 5a. No Range → serve the whole file (HTTP 200) ────────────────
    if (!range || !range.startsWith('bytes=')) {
      baseHeaders['Content-Length'] = String(fileSize);
      // Use Node's ReadStream for efficient streaming of large files.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createReadStream } = require('fs') as typeof import('fs');
      const stream = createReadStream(filePath);
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          stream.on('end', () => controller.close());
          stream.on('error', (err: unknown) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });
      return new Response(readable, {
        status: 200,
        headers: baseHeaders,
      });
    }

    // ─── 5b. Range request → serve the byte range (HTTP 206) ───────────
    // Parse "bytes=start-end" (end optional). Cap end at fileSize-1.
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      baseHeaders['Content-Range'] = `bytes */${fileSize}`;
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, 'Content-Range': `bytes */${fileSize}` },
      });
    }
    const startStr = match[1];
    const endStr = match[2];
    let start: number;
    let end: number;
    if (startStr === '') {
      // Suffix range: bytes=-N → last N bytes
      const suffix = endStr === '' ? 0 : parseInt(endStr, 10);
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else {
      start = parseInt(startStr, 10);
      end = endStr === '' ? fileSize - 1 : parseInt(endStr, 10);
    }
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      start >= fileSize ||
      end < start ||
      end >= fileSize
    ) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    baseHeaders['Content-Length'] = String(chunkSize);
    baseHeaders['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createReadStream: createRangeStream } = require('fs') as typeof import('fs');
    const stream = createRangeStream(filePath, { start, end });
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        stream.on('end', () => controller.close());
        stream.on('error', (err: unknown) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });
    return new Response(readable, {
      status: 206,
      headers: baseHeaders,
    });
  } catch (error) {
    console.error('Playback streaming error:', error);
    return NextResponse.json(
      { error: 'Playback failed' },
      { status: 500 }
    );
  }
}
