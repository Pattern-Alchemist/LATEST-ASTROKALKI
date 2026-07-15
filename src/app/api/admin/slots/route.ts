import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * /api/admin/slots
 *
 * Gated by middleware — only requests with a valid admin session cookie
 * reach this handler. (See src/middleware.ts.)
 *
 * GET  — List all slots (paginated). Optional ?status=open|held|booked
 *        filter, plus ?page & ?limit. Ordered by start ascending so the
 *        admin sees the upcoming schedule in chronological order.
 *
 * POST — Create one or more slots. Two modes:
 *
 *   Single:
 *     { mode: 'single', start: ISO, end: ISO, duration: 30|60|90 }
 *
 *   Bulk:
 *     {
 *       mode: 'bulk',
 *       startDate: 'YYYY-MM-DD',
 *       endDate:   'YYYY-MM-DD',
 *       weekdays:  [0,1,2,3,4,5,6],   // 0=Sun, default [1..5]
 *       times:     ['10:00','15:00'], // HH:mm
 *       duration:  60,
 *       timezoneOffset: 330           // minutes from UTC, IST = +330
 *     }
 *
 *   Bulk generates one slot per (weekday in range × time) combo, skips
 *   dates whose end time has already passed, and de-dupes against
 *   existing slots with the same start time.
 */

// ─── Schemas ────────────────────────────────────────────────────────

const singleCreateSchema = z.object({
  mode: z.literal('single'),
  start: z.string().min(1),
  end: z.string().min(1),
  duration: z.union([z.literal(30), z.literal(60), z.literal(90)]),
});

const bulkCreateSchema = z.object({
  mode: z.literal('bulk'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Pick at least one weekday')
    .default([1, 2, 3, 4, 5]),
  times: z
    .array(z.string().regex(/^\d{2}:\d{2}$/, 'times must be HH:mm'))
    .min(1, 'Pick at least one time')
    .default(['10:00']),
  duration: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  timezoneOffset: z.number().int().min(-720).max(840).default(330),
});

const createSchema = z.discriminatedUnion('mode', [
  singleCreateSchema,
  bulkCreateSchema,
]);

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build a UTC Date for a wall-clock time in a given timezone offset.
 *
 *   makeUtcFromLocal('2025-01-15', '10:00', 330)
 *     → 2025-01-15T04:30:00.000Z   (10:00 IST = 04:30 UTC)
 *
 * The math: Date.UTC(y,m,d,h,mi) treats the inputs AS IF they were UTC.
 * To convert to actual UTC, subtract the offset (because local = UTC + offset,
 * so UTC = local - offset).
 */
function makeUtcFromLocal(
  dateStr: string,
  timeStr: string,
  offsetMinutes: number
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  return new Date(
    Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0) - offsetMinutes * 60_000
  );
}

/** Iterate every calendar day from start to end, inclusive. Yields 'YYYY-MM-DD'. */
function eachDay(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return out;
  if (start.getTime() > end.getTime()) return out;

  const cursor = new Date(start);
  // Hard safety cap — never iterate more than a year.
  for (let i = 0; i < 366 && cursor.getTime() <= end.getTime(); i++) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cursor.getUTCDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** JS Date.getDay() returns 0=Sun..6=Sat in LOCAL time. We need UTC day. */
function utcWeekday(date: Date): number {
  return date.getUTCDay();
}

// ─── GET ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const skip = (page - 1) * limit;

    const where: { status?: string } = {};
    if (status && ['open', 'held', 'booked'].includes(status)) {
      where.status = status;
    }

    const [slots, total] = await Promise.all([
      db.availabilitySlot.findMany({
        where,
        orderBy: { start: 'asc' },
        skip,
        take: limit,
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
      }),
      db.availabilitySlot.count({ where }),
    ]);

    return NextResponse.json({
      slots,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin slots list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 16 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return NextResponse.json(
      { error: issues[0] || 'Invalid input', issues },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.mode === 'single') {
      const start = new Date(parsed.data.start);
      const end = new Date(parsed.data.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'start and end must be valid ISO dates' },
          { status: 400 }
        );
      }
      if (end.getTime() <= start.getTime()) {
        return NextResponse.json(
          { error: 'end must be after start' },
          { status: 400 }
        );
      }

      const slot = await db.availabilitySlot.create({
        data: {
          start,
          end,
          duration: parsed.data.duration,
          status: 'open',
        },
      });
      return NextResponse.json({ created: [slot], count: 1 }, { status: 201 });
    }

    // ─── Bulk mode ───────────────────────────────────────────────
    const { startDate, endDate, weekdays, times, duration, timezoneOffset } =
      parsed.data;

    const days = eachDay(startDate, endDate);
    if (days.length === 0) {
      return NextResponse.json(
        { error: 'endDate must be on or after startDate' },
        { status: 400 }
      );
    }

    // Build the full list of candidate (start, end) pairs.
    const candidates: { start: Date; end: Date }[] = [];
    const now = Date.now();
    for (const day of days) {
      const weekday = utcWeekday(new Date(`${day}T00:00:00Z`));
      if (!weekdays.includes(weekday)) continue;
      for (const time of times) {
        const start = makeUtcFromLocal(day, time, timezoneOffset);
        const end = new Date(start.getTime() + duration * 60_000);
        // Skip slots whose end has already passed.
        if (end.getTime() <= now) continue;
        candidates.push({ start, end });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            'No future slots matched the criteria. Try widening the date range or weekdays.',
        },
        { status: 400 }
      );
    }

    // De-duplicate against existing slots with the same start time so a
    // re-run of the same generator doesn't pile up duplicates.
    const minStart = candidates.reduce((m, c) => (c.start.getTime() < m ? c.start.getTime() : m), candidates[0].start.getTime());
    const maxStart = candidates.reduce((m, c) => (c.start.getTime() > m ? c.start.getTime() : m), minStart);
    const existing = await db.availabilitySlot.findMany({
      where: { start: { gte: new Date(minStart), lte: new Date(maxStart) } },
      select: { start: true },
    });
    const existingKeys = new Set(existing.map((s) => s.start.getTime()));
    const fresh = candidates.filter((c) => !existingKeys.has(c.start.getTime()));

    if (fresh.length === 0) {
      return NextResponse.json({
        created: [],
        count: 0,
        message: 'All matching slots already exist. Nothing new was created.',
      });
    }

    // createMany for performance — SQLite handles hundreds of inserts in one round-trip.
    await db.availabilitySlot.createMany({
      data: fresh.map((c) => ({
        start: c.start,
        end: c.end,
        duration,
        status: 'open' as const,
      })),
    });

    return NextResponse.json(
      {
        created: fresh.map((c) => ({
          start: c.start.toISOString(),
          end: c.end.toISOString(),
          duration,
        })),
        count: fresh.length,
        skippedDuplicates: candidates.length - fresh.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin slot create error:', error);
    return NextResponse.json(
      { error: 'Failed to create slot(s)' },
      { status: 500 }
    );
  }
}
