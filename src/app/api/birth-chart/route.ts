import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  getClientIp,
  isHoneypotTriggered,
  emailSchema,
  nameSchema,
  honeypotSchema,
} from '@/lib/security';
import { calculateChart } from '@/lib/astrology/chart-calculator';
import { renderChartSVG } from '@/lib/astrology/chart-svg';

/**
 * POST /api/birth-chart — calculate and persist a Vedic birth chart.
 *
 * Flow:
 *   1. Rate-limit by IP (5 per hour — chart calc is CPU-bound).
 *   2. Honeypot check (silent 200 for bots).
 *   3. Zod-validate the input.
 *   4. Run `calculateChart()` (astronomy-engine ephemeris).
 *   5. Render the SVG.
 *   6. Persist to the BirthChart table.
 *   7. Return { chartData, svgChart, chartId }.
 *
 * Public endpoint — no session required (this is a lead-gen page). The
 * honeypot + rate limit + Zod validation are the defenses. Middleware
 * already whitelists /api/birth-chart as a public POST API with a 4KB
 * body cap (which is plenty for our JSON payload).
 */

// ─── Zod schema ────────────────────────────────────────────────────────────

/**
 * Birth-date validator. Accepts "YYYY-MM-DD" and rejects impossible
 * dates (e.g. Feb 30) by delegating to the JS Date constructor.
 */
const birthDateSchema = z
  .string()
  .trim()
  .min(8, 'Birth date is required')
  .max(20, 'Birth date too long')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be YYYY-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d &&
      y >= 1900 &&
      y <= 2100
    );
  }, 'Invalid birth date');

/**
 * Birth-time validator. Accepts "HH:MM" (24-hour) or "HH:MM:SS".
 */
const birthTimeSchema = z
  .string()
  .trim()
  .min(4, 'Birth time is required')
  .max(8)
  .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Birth time must be HH:MM')
  .refine((s) => {
    const [h, m] = s.split(':').map(Number);
    return h >= 0 && h < 24 && m >= 0 && m < 60;
  }, 'Invalid birth time');

const birthChartInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  birthDate: birthDateSchema,
  birthTime: birthTimeSchema,
  birthPlace: z
    .string()
    .trim()
    .min(2, 'Birth place is required')
    .max(200, 'Birth place too long'),
  lat: z
    .number()
    .refine((n) => Number.isFinite(n) && n >= -90 && n <= 90, 'Latitude must be -90..+90'),
  lng: z
    .number()
    .refine((n) => Number.isFinite(n) && n >= -180 && n <= 180, 'Longitude must be -180..+180'),
  tzOffset: z
    .number()
    .refine((n) => Number.isFinite(n) && Math.abs(n) <= 14, 'Timezone offset must be -14..+14 hours'),
  // Honeypot
  website: honeypotSchema,
});

// ─── Rate limit: 5 per IP per hour ─────────────────────────────────────────
const BIRTH_CHART_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 5,
} as const;

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(`birth-chart:${ip}`, BIRTH_CHART_RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Chart calculation is limited to ${BIRTH_CHART_RATE_LIMIT.max} per hour. Retry in ${rl.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // 2. Parse + honeypot
  let raw: unknown;
  try {
    const text = await request.text();
    // 4KB cap (also enforced by middleware, but double-check here).
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (isHoneypotTriggered(raw)) {
    // Silent 200 with a fake-but-realistic success body so the bot thinks
    // it won. Matches the real endpoint's response shape.
    return NextResponse.json(
      {
        chartData: null,
        svgChart: '',
        chartId: 'fake-id',
      },
      { status: 200 }
    );
  }

  // 3. Zod validation
  const parsed = birthChartInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'Invalid input';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const input = parsed.data;

  // 4. Calculate the chart
  let chartData;
  try {
    chartData = calculateChart({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      lat: input.lat,
      lng: input.lng,
      tzOffset: input.tzOffset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calculation failed';
    return NextResponse.json(
      { error: `Could not calculate chart: ${message}` },
      { status: 400 }
    );
  }

  // 5. Render SVG
  let svgChart: string;
  try {
    svgChart = renderChartSVG(chartData);
  } catch (err) {
    console.error('[birth-chart] SVG render failed:', err);
    return NextResponse.json(
      { error: 'Chart rendering failed. Please try again.' },
      { status: 500 }
    );
  }

  // 6. Persist to DB
  let chartId: string;
  try {
    const row = await db.birthChart.create({
      data: {
        email: input.email,
        name: input.name,
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        birthPlace: input.birthPlace,
        lat: input.lat,
        lng: input.lng,
        tzOffset: input.tzOffset,
        chartData: JSON.stringify(chartData),
        svgChart,
      },
      select: { id: true },
    });
    chartId = row.id;
  } catch (err) {
    console.error('[birth-chart] DB write failed:', err);
    return NextResponse.json(
      { error: 'Failed to save chart. Please try again.' },
      { status: 500 }
    );
  }

  // 7. Return chart data + SVG + ID
  return NextResponse.json(
    { chartData, svgChart, chartId },
    { status: 201 }
  );
}
