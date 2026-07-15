import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
} from '@/lib/security';

/**
 * POST /api/preferences
 *
 * Auth-gated. Updates the signed-in member's email drip preferences on the
 * Newsletter row. Used by the /account page's PreferencesForm component.
 *
 * Body: { prefSessions?: boolean, prefBlog?: boolean, prefDrip?: boolean, csrfToken?: string }
 * At least one preference must be provided.
 *
 * Security:
 *   - Auth-gated by NextAuth session (database strategy).
 *   - Rate limited (10/hour per IP — the form makes one POST per toggle).
 *   - Zod validation — only the three known boolean fields, nothing else.
 *   - SameSite=Lax session cookie + middleware Origin check = CSRF defense.
 *   - 4KB body cap (middleware).
 *
 * The endpoint is on the middleware's public-POST-API whitelist, so the
 * bot UA block + CSRF Origin check apply. Auth is enforced here.
 */

const preferencesInputSchema = z.object({
  prefSessions: z.boolean().optional(),
  prefBlog: z.boolean().optional(),
  prefDrip: z.boolean().optional(),
  csrfToken: z.string().max(200).optional(),
}).refine(
  (data) =>
    data.prefSessions !== undefined ||
    data.prefBlog !== undefined ||
    data.prefDrip !== undefined,
  { message: 'At least one preference must be provided' }
);

export async function POST(request: NextRequest) {
  // ─── 1. Auth gate ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to manage preferences.' },
      { status: 401 }
    );
  }
  const email = session.user.email;

  // ─── 2. Rate limit (10/hour — generous, the form POSTs on every toggle) ─
  const ip = getClientIp(request);
  const rl = checkRateLimit(`prefs:${ip}`, {
    ...RATE_LIMITS.microReading,
    max: 20,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many updates. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // ─── 3. Parse + validate body ──────────────────────────────────────────
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

  const parsed = validateInput(preferencesInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { prefSessions, prefBlog, prefDrip } = parsed.data;

  // ─── 4. Upsert the Newsletter row ──────────────────────────────────────
  // If the user is signed in but has never subscribed to the newsletter
  // (e.g. they joined via Stripe checkout directly), we create a row with
  // their current preference choice. The other prefs default to true.
  try {
    const existing = await db.newsletter.findUnique({ where: { email } });

    if (existing) {
      const updated = await db.newsletter.update({
        where: { email },
        data: {
          ...(prefSessions !== undefined ? { prefSessions } : {}),
          ...(prefBlog !== undefined ? { prefBlog } : {}),
          ...(prefDrip !== undefined ? { prefDrip } : {}),
          // Toggling any pref on implicitly retracts the opt-out.
          ...((prefSessions || prefBlog || prefDrip) && existing.optedOut
            ? { optedOut: false, optedOutAt: null }
            : {}),
        },
      });
      return NextResponse.json(
        {
          prefSessions: updated.prefSessions,
          prefBlog: updated.prefBlog,
          prefDrip: updated.prefDrip,
          optedOut: updated.optedOut,
        },
        { status: 200 }
      );
    }

    // No existing row — create one. Defaults match the schema (all true).
    const created = await db.newsletter.create({
      data: {
        email,
        source: 'member-portal',
        prefSessions: prefSessions ?? true,
        prefBlog: prefBlog ?? true,
        prefDrip: prefDrip ?? true,
      },
    });
    return NextResponse.json(
      {
        prefSessions: created.prefSessions,
        prefBlog: created.prefBlog,
        prefDrip: created.prefDrip,
        optedOut: created.optedOut,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[preferences] update failed:', err);
    return NextResponse.json(
      { error: 'Could not update preferences.' },
      { status: 500 }
    );
  }
}
