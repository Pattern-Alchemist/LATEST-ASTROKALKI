import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  verifyUnsubscribeToken,
  emailSchema,
  validateInput,
} from '@/lib/security';

/**
 * POST /api/unsubscribe — update a subscriber's email preferences.
 *
 * Body: { email, token, prefSessions?, prefBlog?, prefDrip?, optedOut? }
 *
 * The token MUST be a valid signed unsubscribe token for the given email
 * (issued by createUnsubscribeToken in lib/security/unsubscribe-token.ts).
 * Without a valid token, this endpoint rejects the request — preventing
 * anyone from silently opting-out a victim by guessing their email.
 *
 * Behavior:
 *   - If optedOut=true → set optedOut=true, optedOutAt=now. (Individual
 *     prefs are also written for audit purposes, but optedOut overrides
 *     them at send-time.)
 *   - If optedOut=false → clear optedOut + optedOutAt, write the new
 *     prefSessions/prefBlog/prefDrip values.
 *
 * This is the API backing the /unsubscribe preference center page. It does
 * NOT do bot-UA / Origin / body-size checks (those are handled by middleware
 * for paths listed in the public-POST-API whitelist). Instead, this endpoint
 * relies on: (1) signed-token verification, (2) Zod validation, (3) its own
 * 4KB body cap below.
 */

const updatePrefsSchema = z.object({
  email: emailSchema,
  token: z.string().min(10, 'Invalid token').max(1024, 'Invalid token'),
  prefSessions: z.boolean().optional(),
  prefBlog: z.boolean().optional(),
  prefDrip: z.boolean().optional(),
  optedOut: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  // Parse body with size cap (4 KB).
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Zod validation.
  const parsed = validateInput(updatePrefsSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { email, token, prefSessions, prefBlog, prefDrip, optedOut } =
    parsed.data;

  // Signed-token verification — the critical security check.
  const tokenValid = await verifyUnsubscribeToken(email, token);
  if (!tokenValid) {
    return NextResponse.json(
      {
        error:
          'This preferences link has expired or is invalid. Request a fresh link from the preference center.',
      },
      { status: 403 }
    );
  }

  try {
    const normalizedEmail = email.toLowerCase();

    // If the subscriber doesn't exist, we still return 200 to avoid leaking
    // which emails are on the list — but no DB write happens.
    const existing = await db.newsletter.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: true,
          message:
            'If this email is on our list, the preferences have been updated.',
        },
        { status: 200 }
      );
    }

    // Build the update payload. optedOut=true path takes precedence.
    if (optedOut === true) {
      await db.newsletter.update({
        where: { email: normalizedEmail },
        data: {
          optedOut: true,
          optedOutAt: new Date(),
          // Persist the individual prefs too (for audit / if they later
          // opt back in, their previous granular choices are remembered).
          ...(prefSessions !== undefined ? { prefSessions } : {}),
          ...(prefBlog !== undefined ? { prefBlog } : {}),
          ...(prefDrip !== undefined ? { prefDrip } : {}),
        },
      });
    } else if (optedOut === false) {
      // Re-subscribe path: clear optedOut + write granular prefs.
      await db.newsletter.update({
        where: { email: normalizedEmail },
        data: {
          optedOut: false,
          optedOutAt: null,
          ...(prefSessions !== undefined ? { prefSessions } : {}),
          ...(prefBlog !== undefined ? { prefBlog } : {}),
          ...(prefDrip !== undefined ? { prefDrip } : {}),
        },
      });
    } else {
      // Only prefs updated; optedOut unchanged.
      await db.newsletter.update({
        where: { email: normalizedEmail },
        data: {
          ...(prefSessions !== undefined ? { prefSessions } : {}),
          ...(prefBlog !== undefined ? { prefBlog } : {}),
          ...(prefDrip !== undefined ? { prefDrip } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/unsubscribe] Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Could not save preferences. Please try again.' },
      { status: 500 }
    );
  }
}
