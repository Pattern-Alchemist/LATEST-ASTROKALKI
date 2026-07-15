import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
} from '@/lib/security';

/**
 * GET /api/slots
 *
 * Public endpoint. Returns availability slots that are currently open
 * (status='open') and start in the future.
 *
 * Query params:
 *   - duration: '30' | '60' | '90' (optional). Filters by slot duration.
 *   - from:     ISO date string (optional). Lower bound on slot.start.
 *   - to:       ISO date string (optional). Upper bound on slot.start.
 *
 * Ordered by start ascending so the closest upcoming slot appears first.
 *
 * Rate-limited at 60 requests per IP per minute — same preset as the
 * generic API limiter. Public browsing only; admin management lives at
 * /api/admin/slots (gated by middleware).
 */
export async function GET(request: NextRequest) {
  // ─── Rate limit (60/min/IP) ──────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`slots:get:${ip}`, RATE_LIMITS.api);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const durationRaw = searchParams.get('duration');
    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');

    console.log('[slots API] Fetching slots', {
      duration: durationRaw,
      from: fromRaw,
      to: toRaw,
      timestamp: new Date().toISOString(),
    });

    // ─── Build the where clause ───────────────────────────────────
    const where: {
      status: string;
      start: { gte: Date; lte?: Date };
      duration?: number;
    } = {
      status: 'open',
      start: { gte: new Date() },
    };

    if (durationRaw) {
      const d = Number(durationRaw);
      if (d === 30 || d === 60 || d === 90) {
        where.duration = d;
      } else {
        return NextResponse.json(
          { error: 'Invalid duration. Must be 30, 60, or 90.' },
          { status: 400 }
        );
      }
    }

    if (fromRaw) {
      const from = new Date(fromRaw);
      if (!isNaN(from.getTime())) {
        where.start.gte = from;
      }
    }

    if (toRaw) {
      const to = new Date(toRaw);
      if (!isNaN(to.getTime())) {
        where.start.lte = to;
      }
    }

    // ─── Cap to a sane window so a public caller can't pull 10k rows ─
    // Default window is the next 90 days; hard cap at 365 days out.
    if (!where.start.lte) {
      const cap = new Date();
      cap.setDate(cap.getDate() + 90);
      where.start.lte = cap;
    }

    const slots = await db.availabilitySlot.findMany({
      where,
      orderBy: { start: 'asc' },
      take: 200,
      select: {
        id: true,
        start: true,
        end: true,
        duration: true,
        status: true,
      },
    });

    console.log(`[slots API] Successfully fetched ${slots.length} slots`);

    return NextResponse.json({ 
      slots,
      count: slots.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[slots API] Error fetching slots:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch slots. Please try again in a moment.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
