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
 * Pattern Journal API — auth-gated CRUD.
 *
 *   POST   /api/journal              create or update-today entry
 *   GET    /api/journal              list user's entries (?from=&to=)
 *
 * Auth: NextAuth session (database strategy). The session email IS the user
 * identity — there is no separate userId on JournalEntry by design, because
 * members can sign in via magic-link from any device and we want their
 * journal to follow the email, not the auth record.
 *
 * Rate limit: 10 writes per day per user (one entry per day + edits).
 * The "one entry per day" rule is enforced at the application layer — we
 * normalize the date to the calendar day in UTC so two entries logged at
 * 8am and 11pm on the same day land on the same row (upsert).
 *
 * The middleware whitelists /api/journal/* as a public POST API, so the
 * bot UA block + Origin check + 4KB body cap already apply. Auth is
 * enforced here.
 */

const MOOD_VALUES = ['heavy', 'numb', 'anxious', 'clear', 'angry', 'tender'] as const;
const PATTERN_SLUGS = ATLAS_PATTERNS.map((p) => p.slug);

const journalCreateSchema = z.object({
  date: z
    .string()
    .min(8, 'Date is required')
    .max(40, 'Date too long')
    // Accept YYYY-MM-DD or full ISO. We normalize to midnight UTC below.
    .refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
  mood: z.enum(MOOD_VALUES, { message: 'Mood must be one of the six values' }),
  energy: z
    .number()
    .int('Energy must be a whole number')
    .min(1, 'Energy minimum is 1')
    .max(5, 'Energy maximum is 5'),
  trigger: z
    .string()
    .trim()
    .max(500, 'Trigger too long (500 chars max)')
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
    .max(4000, 'Note too long (4000 chars max)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  csrfToken: z.string().max(200).optional(),
});

// GET query params
const journalListQuerySchema = z.object({
  from: z
    .string()
    .optional()
    .refine((s) => !s || !isNaN(Date.parse(s)), 'Invalid from date'),
  to: z
    .string()
    .optional()
    .refine((s) => !s || !isNaN(Date.parse(s)), 'Invalid to date'),
});

/**
 * Normalize any accepted date input to a Date at UTC midnight for the
 * calendar day. We use the calendar day only — time-of-day is dropped so
 * that two entries logged at 8am and 11pm on the same day land on the
 * same row (upsert).
 *
 * The client sends date as 'YYYY-MM-DD' (from <input type="date">) so the
 * parsed Date is already at UTC midnight. For full ISO strings we strip
 * the time component.
 */
function normalizeDate(input: string): Date {
  // YYYY-MM-DD — parse as a calendar day, not a UTC instant.
  const dateOnly = input.slice(0, 10);
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (y && m && d) {
    return new Date(Date.UTC(y, m - 1, d));
  }
  // Fallback — let Date parse it, then strip time.
  const parsed = new Date(input);
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
}

// ─── POST: create or upsert-today entry ──────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth gate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to use the Pattern Journal.' },
      { status: 401 }
    );
  }
  const email = session.user.email;

  // 2. Rate limit — 10 writes per day per user (one entry per day + edits)
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

  // 3. Parse + validate body
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

  const parsed = validateInput(journalCreateSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { mood, energy, trigger, pattern, note } = parsed.data;
  const date = normalizeDate(parsed.data.date);

  try {
    // 4. Upsert by (email, calendar day). If an entry already exists for
    //    this date, we treat the POST as an edit — the form pre-fills from
    //    today's existing entry, so this is the natural contract.
    const existing = await db.journalEntry.findFirst({
      where: {
        email,
        date: {
          gte: date,
          lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { date: 'asc' },
    });

    if (existing) {
      const updated = await db.journalEntry.update({
        where: { id: existing.id },
        data: {
          mood,
          energy,
          trigger,
          pattern,
          note,
          // Preserve any AI-generated insight from a previous week.
          // If the user edits today's entry after generating an insight,
          // we leave the insight text intact.
        },
      });
      return NextResponse.json(
        { entry: serializeEntry(updated) },
        { status: 200 }
      );
    }

    const created = await db.journalEntry.create({
      data: {
        email,
        date,
        mood,
        energy,
        trigger,
        pattern,
        note,
      },
    });
    return NextResponse.json(
      { entry: serializeEntry(created) },
      { status: 201 }
    );
  } catch (err) {
    console.error('[journal] POST failed:', err);
    return NextResponse.json(
      { error: 'Could not save journal entry.' },
      { status: 500 }
    );
  }
}

// ─── GET: list user's entries ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth gate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to view journal entries.' },
      { status: 401 }
    );
  }
  const email = session.user.email;

  // Parse query
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = validateInput(journalListQuerySchema, params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Default window: last 30 days
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = parsed.data.from
    ? normalizeDate(parsed.data.from)
    : defaultFrom;
  const to = parsed.data.to ? normalizeDate(parsed.data.to) : now;

  // Cap at 365 days to prevent abusive range queries.
  const maxRange = 365 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxRange) {
    return NextResponse.json(
      { error: 'Date range too wide (365 days max).' },
      { status: 400 }
    );
  }

  try {
    const entries = await db.journalEntry.findMany({
      where: {
        email,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });
    return NextResponse.json(
      { entries: entries.map(serializeEntry) },
      { status: 200 }
    );
  } catch (err) {
    console.error('[journal] GET failed:', err);
    return NextResponse.json(
      { error: 'Could not load journal entries.' },
      { status: 500 }
    );
  }
}

// ─── Serializer ──────────────────────────────────────────────────────────

/**
 * Convert a Prisma JournalEntry to a plain JSON-serialisable object.
 * Dates become ISO strings for transport.
 */
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
