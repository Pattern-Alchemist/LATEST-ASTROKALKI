import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { emailSchema } from '@/lib/security';

/**
 * GET /api/birth-chart/history?email=...
 *
 * Returns all saved birth charts for a given email, newest first.
 * Used by the /birth-chart page to show "your previous charts" for
 * the user (lead-gen reuse) and by /account to show member charts.
 *
 * Public: the email is the only key — anyone with an email address
 * can fetch charts for that address. Charts are not sensitive (no
 * PII beyond what the user self-reported at calculation time). The
 * email parameter is validated by Zod, and the route is rate-limited
 * by the standard /api/* limit (60/min/IP) via middleware.
 *
 * Response shape:
 *   {
 *     charts: [
 *       { id, name, birthDate, birthTime, birthPlace, createdAt, svgChart }
 *     ]
 *   }
 *
 * We return the SVG so the client can render the mini chart inline
 * without an extra round-trip per chart. chartData (the full JSON) is
 * NOT included here to keep the payload small — the client can fetch
 * the full chart via /api/birth-chart/[id] if needed.
 */

const querySchema = z.object({
  email: emailSchema,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emailParam = searchParams.get('email') ?? '';

  const parsed = querySchema.safeParse({ email: emailParam });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Valid email query parameter required' },
      { status: 400 }
    );
  }
  const email = parsed.data.email;

  let rows;
  try {
    rows = await db.birthChart.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        svgChart: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error('[birth-chart/history] DB read failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch chart history' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    charts: rows.map((r) => ({
      id: r.id,
      name: r.name,
      birthDate: r.birthDate,
      birthTime: r.birthTime,
      birthPlace: r.birthPlace,
      svgChart: r.svgChart,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : r.createdAt,
    })),
  });
}
