import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { checkRateLimit, getClientIp, validateInput } from '@/lib/security';
import { getTodaysTransits } from '@/lib/astrology/transits';
import { getPatternActivation, hasNatalChart } from '@/lib/astrology/pattern-activation';
import {
  TRANSIT_INSIGHT_SYSTEM_PROMPT,
  buildTransitInsightUserPrompt,
  extractJournalPrompt,
  stripPromptLine,
  FALLBACK_JOURNAL_PROMPT,
} from '@/lib/ai/transit-prompt';
import type { ChartData } from '@/lib/astrology/chart-calculator';

/**
 * POST /api/transits/check-in — auth-gated.
 *
 * Generates a personalised daily transit check-in for the signed-in
 * member. The flow:
 *
 *   1. Auth gate — must be signed in.
 *   2. Rate limit — 1 per day per user (UTC day). The check-in is the
 *      once-daily ritual; running it more often produces the same insight.
 *   3. Load the user's most recent BirthChart (if any).
 *   4. Get today's transits (from cache or fresh).
 *   5. Compute pattern activations (natal-aware if chart available).
 *   6. Build the LLM prompt and generate the insight.
 *   7. Persist to UserTransit.
 *   8. Return { transits, patternActivations, insight, journalPrompt }.
 *
 * Body: empty JSON object — we always use the signed-in user's data.
 *   { csrfToken?: string }
 *
 * The middleware does NOT whitelist /api/transits/check-in as a public
 * POST API (it's auth-gated, not public), so the bot-UA / Origin / size
 * guards don't run. We enforce our own 4KB body cap here.
 */

const checkInInputSchema = z.object({
  csrfToken: z.string().max(200).optional(),
});

// 24h rate limit — one check-in per calendar day.
const CHECKIN_RATE_LIMIT = {
  windowMs: 24 * 60 * 60 * 1000,
  max: 1,
} as const;

export async function POST(request: NextRequest) {
  // 1. Auth gate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to generate a daily check-in.' },
      { status: 401 },
    );
  }
  const email = session.user.email;

  // 2. Rate limit — 1 per day per user.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`transit-checkin:${email}`, CHECKIN_RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          'You can run one daily check-in per day. Come back tomorrow — the pattern weather will have shifted.',
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // 3. Parse + validate body (csrfToken only).
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = validateInput(checkInInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // 4. Load the user's most recent BirthChart (if any).
    const chartRow = await db.birthChart.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: { chartData: true, name: true, birthDate: true, birthTime: true, birthPlace: true },
    });
    let birthChart: ChartData | undefined;
    if (chartRow?.chartData) {
      try {
        birthChart = JSON.parse(chartRow.chartData) as ChartData;
        if (!hasNatalChart(birthChart)) birthChart = undefined;
      } catch {
        // Malformed chart data in DB — treat as no chart.
        birthChart = undefined;
      }
    }

    // 5. Get today's transits.
    const transits = await getTodaysTransits();

    // 6. Compute pattern activations.
    const activations = getPatternActivation(transits, birthChart);

    // 7. Build the LLM prompt + generate insight.
    const userMessage = buildTransitInsightUserPrompt(
      transits,
      activations,
      birthChart,
    );

    let insightText: string;
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: TRANSIT_INSIGHT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        thinking: { type: 'disabled' },
      });
      insightText = (completion.choices[0]?.message?.content || '').trim();
    } catch (err) {
      console.error('[api/transits/check-in] LLM call failed:', err);
      return NextResponse.json(
        {
          error:
            'The check-in could not be generated right now. Try again in a moment.',
        },
        { status: 502 },
      );
    }

    if (!insightText) {
      return NextResponse.json(
        { error: 'The insight came back empty. Try again.' },
        { status: 502 },
      );
    }

    // 8. Extract the journal prompt (the LLM puts it on its own line).
    const journalPrompt = extractJournalPrompt(insightText) || FALLBACK_JOURNAL_PROMPT;
    const insightBody = stripPromptLine(insightText);

    // 9. Persist to UserTransit.
    try {
      await db.userTransit.create({
        data: {
          email,
          date: new Date(),
          transitData: JSON.stringify(transits),
          patternActivation: JSON.stringify(activations),
          insight: insightText,
        },
      });
    } catch (err) {
      // Persistence failure is non-fatal — the user still gets the insight.
      console.error('[api/transits/check-in] DB write failed (non-fatal):', err);
    }

    // 10. Return the full check-in payload.
    return NextResponse.json(
      {
        transits,
        patternActivations: activations,
        insight: insightBody,
        journalPrompt,
        hasNatalChart: Boolean(birthChart),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[api/transits/check-in] failed:', err);
    return NextResponse.json(
      { error: 'Could not generate the daily check-in.' },
      { status: 500 },
    );
  }
}
