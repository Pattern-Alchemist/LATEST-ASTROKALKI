import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import {
  checkRateLimit,
  getClientIp,
  validateInput,
} from '@/lib/security';
import {
  buildJournalInsightUserPrompt,
  JOURNAL_INSIGHT_SYSTEM_PROMPT,
} from '@/lib/ai/journal-prompt';

/**
 * POST /api/journal/insight
 *
 * Auth-gated. Generates a weekly Pattern Journal insight using the LLM.
 *
 *   Body: { csrfToken?: string }   (no other fields — we always use the
 *                                  last 7 days of the signed-in user's
 *                                  entries)
 *   Returns 200: { insight, weekStart, weekEnd, entryCount }
 *   Returns 4xx: { error }
 *
 * Flow:
 *   1. Auth gate — must be signed in.
 *   2. Rate limit — 1 per day per user. Generating an LLM synthesis is
 *      expensive and the user only needs one per week.
 *   3. Fetch the user's last 7 calendar days of entries.
 *   4. If no entries in the window, return a graceful "no data" response.
 *   5. Build the prompt, call zai.chat.completions.create().
 *   6. Save the insight text to the `insight` field on every entry in the
 *      7-day window — this way the insight is visible when browsing past
 *      weeks and not just on the latest entry.
 *   7. Return the insight text.
 *
 * The middleware whitelists /api/journal/* as a public POST API, so the
 * bot UA + Origin + body-size defenses already apply.
 */

const insightInputSchema = z.object({
  csrfToken: z.string().max(200).optional(),
});

// One calendar week in ms.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  // 1. Auth gate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to generate an insight.' },
      { status: 401 }
    );
  }
  const email = session.user.email;

  // 2. Rate limit — 1 per day per user (the synthesis is weekly, but we
  //    give a 24h grace window so a member can re-run if the first one
  //    was unsatisfying).
  const ip = getClientIp(request);
  const rl = checkRateLimit(`journal-insight:${email}`, {
    windowMs: 24 * 60 * 60 * 1000,
    max: 1,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          'You can generate one insight per day. Come back tomorrow to surface what changes.',
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // 3. Parse body (only csrfToken expected)
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json(
        { error: 'Body too large' },
        { status: 413 }
      );
    }
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = validateInput(insightInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // 4. Fetch the user's last 7 calendar days of entries.
    const now = new Date();
    const weekStart = new Date(now.getTime() - WEEK_MS);
    const entries = await db.journalEntry.findMany({
      where: {
        email,
        date: { gte: weekStart, lte: now },
      },
      orderBy: { date: 'asc' },
      take: 50,
    });

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error:
            'No journal entries in the last 7 days. Log tomorrow and the week will start taking shape.',
          insight: null,
          entryCount: 0,
        },
        { status: 200 }
      );
    }

    // 5. Build the prompt and call the LLM.
    const userMessage = buildJournalInsightUserPrompt(entries);

    let insightText: string;
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: JOURNAL_INSIGHT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        thinking: { type: 'disabled' },
      });
      insightText = (completion.choices[0]?.message?.content || '').trim();
    } catch (err) {
      console.error('[journal/insight] LLM call failed:', err);
      return NextResponse.json(
        {
          error:
            'The synthesis could not be generated right now. Try again in a moment.',
        },
        { status: 502 }
      );
    }

    if (!insightText) {
      return NextResponse.json(
        { error: 'The synthesis came back empty. Try again.' },
        { status: 502 }
      );
    }

    // 6. Persist the insight on every entry in the 7-day window. This way,
    //    when the user browses back to a past week, they see the insight
    //    attached to those entries — not just the most recent one.
    const entryIds = entries.map((e) => e.id);
    await db.journalEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { insight: insightText },
    });

    return NextResponse.json(
      {
        insight: insightText,
        weekStart: weekStart.toISOString(),
        weekEnd: now.toISOString(),
        entryCount: entries.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[journal/insight] failed:', err);
    return NextResponse.json(
      { error: 'Could not generate insight.' },
      { status: 500 }
    );
  }
}
