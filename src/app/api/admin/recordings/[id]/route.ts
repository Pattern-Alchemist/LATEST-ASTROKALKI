import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { existsSync, promises as fs } from 'fs';
import { join, isAbsolute, normalize } from 'path';
import { db } from '@/lib/db';

/**
 * Admin recording by-id API.
 *
 * Auth-gated by middleware. Allows the admin to:
 *
 *   GET    — fetch a single recording with its booking details.
 *
 *   PATCH  — update title / duration / price / bookingId on an existing
 *            recording. Used by the admin UI to fix metadata after upload
 *            or to (re)link a recording to a booking later.
 *
 *   DELETE — permanently remove a recording row AND delete the underlying
 *            audio file from disk under public/recordings/. Path-traversal
 *            is prevented by validating that audioUrl resolves strictly
 *            inside public/recordings/.
 */

// ─── Schemas ──────────────────────────────────────────────────────────

const patchSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .optional(),
    duration: z
      .number()
      .int()
      .min(1)
      .max(600)
      .optional(),
    price: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .optional(),
    bookingId: z
      .string()
      .trim()
      .max(60)
      .nullable()
      .or(z.literal('').transform(() => null))
      .optional(),
  })
  .strict();

// ─── Helpers ──────────────────────────────────────────────────────────

const RECORDINGS_DIR = join(process.cwd(), 'public', 'recordings');

/**
 * Resolve a recording's audioUrl to a safe absolute filesystem path inside
 * public/recordings/. Returns null if the path would escape the directory.
 *
 * We DO NOT trust audioUrl blindly — even though the create handler validates
 * it starts with /recordings/, defensive coding says: re-check on read too,
 * because rows could have been edited by other tools or migrated from
 * another system.
 */
function safeResolveAudioPath(audioUrl: string): string | null {
  if (!audioUrl.startsWith('/recordings/')) return null;
  // Strip leading slash so join() treats it as relative.
  const relative = audioUrl.slice(1);
  const absolute = normalize(join('public', relative));
  // Re-check: must be inside public/recordings/
  const expectedPrefix = normalize(join('public', 'recordings')) + '/';
  if (!normalize(absolute).startsWith(expectedPrefix)) return null;
  if (isAbsolute(relative)) return null;
  return join(process.cwd(), absolute);
}

/**
 * Delete the audio file backing a recording (if it exists on disk).
 * Never throws — file deletion is best-effort. Returns true if a file was
 * actually removed.
 */
async function deleteAudioFile(audioUrl: string): Promise<boolean> {
  const filePath = safeResolveAudioPath(audioUrl);
  if (!filePath) return false;
  try {
    if (!existsSync(filePath)) return false;
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    console.error('Failed to delete audio file:', audioUrl, err);
    return false;
  }
}

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recording = await db.recordedReading.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            duration: true,
            price: true,
            status: true,
            scheduledAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ recording });
  } catch (error) {
    console.error('Admin recording fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recording' },
      { status: 500 }
    );
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let raw: unknown;
    try {
      const text = await request.text();
      if (text.length > 32 * 1024) {
        return NextResponse.json(
          { error: 'Body too large' },
          { status: 413 }
        );
      }
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue
            ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
            : 'Invalid input',
        },
        { status: 400 }
      );
    }

    const existing = await db.recordedReading.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.duration !== undefined) updates.duration = data.duration;
    if (data.price !== undefined) updates.price = data.price;
    if (data.bookingId !== undefined) {
      // Setting bookingId=null explicitly unlinks; otherwise verify the booking exists.
      if (data.bookingId) {
        const booking = await db.booking.findUnique({
          where: { id: data.bookingId },
          select: { id: true },
        });
        if (!booking) {
          return NextResponse.json(
            { error: 'Booking not found' },
            { status: 404 }
          );
        }
      }
      updates.bookingId = data.bookingId;
    }

    const recording = await db.recordedReading.update({
      where: { id },
      data: updates,
      include: {
        booking: {
          select: {
            id: true,
            name: true,
            email: true,
            duration: true,
            price: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ recording });
  } catch (error) {
    console.error('Admin recording update error:', error);
    return NextResponse.json(
      { error: 'Failed to update recording' },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.recordedReading.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Delete the DB row first (atomic). Then attempt file cleanup.
    // If file cleanup fails the row is already gone — the orphaned file can
    // be cleaned up later by an admin script.
    await db.recordedReading.delete({ where: { id } });

    const fileRemoved = await deleteAudioFile(existing.audioUrl);

    return NextResponse.json({
      success: true,
      audioFileRemoved: fileRemoved,
    });
  } catch (error) {
    console.error('Admin recording delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}
