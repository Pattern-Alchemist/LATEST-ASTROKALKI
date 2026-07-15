import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  getClientIp,
  validateInput,
} from '@/lib/security';
import { ATLAS_PATTERNS } from '@/lib/content/patterns/atlas';

/**
 * Pattern Journal — single-entry endpoints.
 *
 *   PATCH   /api/journal/[id]    update a specific entry (owner only)
 *   DELETE  /api/journal/[id]    delete a specific entry (owner only)
 *
 * Owner check: the entry's email must match the session email. We do not
 * accept an `email` field in the body — the email is always the signed-in
 * user, which prevents IDOR (the user can only mutate their own rows).
 *
 * The middleware whitelists /api/journal/* as a public POST API for bot
 * UA + Origin + body-size defense. PATCH/DELETE are not in the public
 * POST whitelist, so they bypass the bot UA check — that's fine, because
 * they require a valid NextAuth session cookie.
 */

const MOOD_VALUES = ['heavy', 'numb', 'anxious', 'clear', 'angry', 'tender'] as const;
const PATTERN_SLUGS = ATLAS_PATTERNS.map((p) => p.slug);

// PATCH body — all fields optional (partial update).
const journalPatchSchema = z
  .object({
    date: z
      .string()
      .min(8)
      .max(40)
      .refine((s) => !isNaN(Date.parse(s)), 'Invalid date')
      .optional(),
    mood: z.enum(MOOD_VALUES, { message: 'Invalid mood' }).optional(),
    energy: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),
    trigger: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    pattern: z
      .string()
      .max(80)
      .optional()
      .refine(
        (v) => !v || v === 'none' || PATTERN_SLUGS.includes(v),
        'Unknown pattern slug'
      )
      .or(z.literal('').transform(() => undefined))
      .transform((v) => (v === 'none' || v === '' ? undefined : v)),
    note: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    csrfToken: z.string().max(200).optional(),
  })
  .refine(
    (data) =>
      data.date !== undefined ||
      data.mood !== undefined ||
      data.energy !== undefined ||
      data.trigger !== undefined ||
      data.pattern !== undefined ||
      data.note !== undefined,
    { message: 'No fields to update' }
  );

function normalizeDate(input: string): Date {
  const dateOnly = input.slice(0, 10);
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (y && m && d) {
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parsed = new Date(input);
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
}

// ─── PATCH: update entry ─────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth gate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required.' },
      { status: 401 }
    );
  }
  const email = session.user.email;
  const { id } = await params;

  // Rate limit — same daily budget as POST (10/day per user)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`journal:${email}`, {
    windowMs: 24 * 60 * 60 * 1000,
    max: 10,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily limit reached. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 8 * 1024) {
      return NextResponse.json(
        { error: 'Body too large (8KB max)' },
        { status: 413 }
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = validateInput(journalPatchSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // Owner check — fetch first, then update.
    const existing = await db.journalEntry.findUnique({ where: { id } });
    if (!existing || existing.email !== email) {
      // 404, not 403 — don't leak existence of other users' entries.
      return NextResponse.json(
        { error: 'Entry not found.' },
        { status: 404 }
      );
    }

    // If the date is being changed, normalize + verify no collision with
    // another entry on the same day (we only allow one entry per calendar day).
    let newDate: Date | undefined;
    if (parsed.data.date) {
      newDate = normalizeDate(parsed.data.date);
      const conflicting = await db.journalEntry.findFirst({
        where: {
          email,
          id: { not: id },
          date: {
            gte: newDate,
            lt: new Date(newDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });
      if (conflicting) {
        return NextResponse.json(
          { error: 'An entry already exists for that date. Edit that one instead.' },
          { status: 409 }
        );
      }
    }

    const updated = await db.journalEntry.update({
      where: { id },
      data: {
        ...(newDate ? { date: newDate } : {}),
        ...(parsed.data.mood !== undefined ? { mood: parsed.data.mood } : {}),
        ...(parsed.data.energy !== undefined
          ? { energy: parsed.data.energy }
          : {}),
        ...(parsed.data.trigger !== undefined
          ? { trigger: parsed.data.trigger }
          : {}),
        ...(parsed.data.pattern !== undefined
          ? { pattern: parsed.data.pattern }
          : {}),
        ...(parsed.data.note !== undefined
          ? { note: parsed.data.note }
          : {}),
      },
    });
    return NextResponse.json(
      { entry: serializeEntry(updated) },
      { status: 200 }
    );
  } catch (err) {
    console.error('[journal] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Could not update journal entry.' },
      { status: 500 }
    );
  }
}

// ─── DELETE: remove entry ────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth gate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required.' },
      { status: 401 }
    );
  }
  const email = session.user.email;
  const { id } = await params;

  // Rate limit (same daily budget)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`journal:${email}`, {
    windowMs: 24 * 60 * 60 * 1000,
    max: 10,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily limit reached. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    // Owner check — delete returns the count, so we filter by email in the
    // where clause. If 0 rows deleted, the entry didn't exist OR wasn't
    // owned by this user — both return 404 to avoid IDOR leakage.
    const result = await db.journalEntry.deleteMany({
      where: { id, email },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Entry not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { deleted: true, id },
      { status: 200 }
    );
  } catch (err) {
    console.error('[journal] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Could not delete journal entry.' },
      { status: 500 }
    );
  }
}

// ─── Serializer ──────────────────────────────────────────────────────────

function serializeEntry(entry: {
  id: string;
  email: string;
  date: Date;
  mood: string;
  energy: number;
  trigger: string | null;
  pattern: string | null;
  note: string | null;
  insight: string | null;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    email: entry.email,
    date: entry.date.toISOString(),
    mood: entry.mood,
    energy: entry.energy,
    trigger: entry.trigger,
    pattern: entry.pattern,
    note: entry.note,
    insight: entry.insight,
    createdAt: entry.createdAt.toISOString(),
  };
}
