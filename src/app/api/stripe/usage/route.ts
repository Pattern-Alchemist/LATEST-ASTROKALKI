import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/stripe/usage
 *
 * Auth-gated. Returns the signed-in user's membership status + their recent
 * bookings + their newsletter/drip preferences. Used by the /account page to
 * render the member portal without exposing internal IDs.
 *
 * Response shape:
 *   {
 *     user: { email, name },
 *     membership: { plan, status, currentPeriodEnd, cancelAtPeriodEnd } | null,
 *     bookings: [{ id, duration, price, status, scheduledAt, createdAt, contexts }],
 *     preferences: { prefSessions, prefBlog, prefDrip, optedOut } | null,
 *   }
 *
 * Security:
 *   - Auth-gated by NextAuth session.
 *   - Only returns rows whose email matches the session user's email
 *     (or userId, where applicable). No admin-style "list all" path.
 *   - Returns 401 JSON if no session.
 */

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required.' },
      { status: 401 }
    );
  }

  const email = session.user.email;
  const userId = (session.user as { id?: string }).id;

  try {
    // ─── Parallel data fetch ────────────────────────────────────────────
    const [membership, bookings, newsletter] = await Promise.all([
      // Most recent membership row for this user (active or otherwise —
      // we show expired ones so the user can see their history).
      db.membership.findFirst({
        where: {
          OR: [
            ...(userId ? [{ userId }] : []),
            { email },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
        },
      }),
      // Recent bookings (last 12) — used for the session history panel.
      db.booking.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          duration: true,
          price: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          contexts: true,
        },
      }),
      // Newsletter / drip preferences.
      db.newsletter.findUnique({
        where: { email },
        select: {
          prefSessions: true,
          prefBlog: true,
          prefDrip: true,
          optedOut: true,
          birthMonth: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        user: {
          email: session.user.email,
          name: session.user.name || null,
        },
        membership: membership
          ? {
              plan: membership.plan,
              status: membership.status,
              currentPeriodEnd: membership.currentPeriodEnd?.toISOString() || null,
              cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
              createdAt: membership.createdAt.toISOString(),
            }
          : null,
        bookings: bookings.map((b) => ({
          id: b.id,
          duration: b.duration,
          price: b.price,
          status: b.status,
          scheduledAt: b.scheduledAt?.toISOString() || null,
          createdAt: b.createdAt.toISOString(),
          // contexts is stored as a JSON string in SQLite — best-effort parse
          // for display. Falls back to [].
          contexts: (() => {
            try {
              const parsed = JSON.parse(b.contexts);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })(),
        })),
        preferences: newsletter
          ? {
              prefSessions: newsletter.prefSessions,
              prefBlog: newsletter.prefBlog,
              prefDrip: newsletter.prefDrip,
              optedOut: newsletter.optedOut,
              birthMonth: newsletter.birthMonth,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[stripe/usage] fetch failed:', err);
    return NextResponse.json(
      { error: 'Could not load your account.' },
      { status: 500 }
    );
  }
}
