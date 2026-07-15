import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_HEADERS } from '@/lib/security';

/**
 * /api/admin/availability — REST proxy for the AstroKalki availability
 * mini-service (socket.io on port 3003).
 *
 * Auth-gated by middleware (see /src/middleware.ts) — only holders of a
 * valid admin session cookie can reach this handler. The admin secret
 * (ADMIN_SECRET or CRON_SECRET) NEVER reaches the browser: it lives only
 * in server-side env vars and is added to the upstream request here.
 *
 * GET  → forwards to GET  http://localhost:3003/state
 *        Returns the current availability state.
 *
 * POST → forwards to POST http://localhost:3003/admin/state
 *        Body: { status?, message?, nextOpening? }
 *        The mini-service validates + broadcasts the change to every
 *        connected socket.io client in real-time.
 *
 * Response shape (both verbs):
 *   {
 *     ok: true,
 *     state: {
 *       status: 'available' | 'in-session' | 'away',
 *       message: string,
 *       nextOpening: string | null,    // ISO
 *       updatedAt: number,             // ms epoch
 *       nextSlot: string | null,       // legacy alias of nextOpening
 *       currentSessionEnds: string | null,
 *     },
 *     clients?: number                 // connected socket count (GET only)
 *   }
 */

const UPSTREAM_BASE =
  process.env.AVAILABILITY_UPSTREAM ||
  `http://localhost:${process.env.AVAILABILITY_PORT || '3003'}`;

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || process.env.CRON_SECRET || '';
}

function securityHeaders(headers: Headers): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
}

// ─── GET: fetch current state ────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const secret = getAdminSecret();
  if (!secret) {
    const res = NextResponse.json(
      { error: 'Admin secret not configured on the server.' },
      { status: 503 }
    );
    securityHeaders(res.headers);
    return res;
  }

  try {
    const upstream = await fetch(`${UPSTREAM_BASE}/state`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      // Defensive timeout — the mini-service is local, 3s is plenty.
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    } as RequestInit);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      const res = NextResponse.json(
        {
          error: 'Upstream availability service error',
          status: upstream.status,
          detail: text.slice(0, 200),
        },
        { status: 502 }
      );
      securityHeaders(res.headers);
      return res;
    }

    const data = (await upstream.json()) as {
      ok?: boolean;
      state?: unknown;
      clients?: number;
      service?: string;
    };

    const res = NextResponse.json(
      {
        ok: true,
        state: data.state ?? null,
        clients: typeof data.clients === 'number' ? data.clients : null,
        service: data.service ?? 'astrokalki-availability',
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    securityHeaders(res.headers);
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const res = NextResponse.json(
      {
        error: 'Cannot reach the availability mini-service.',
        detail: msg,
        hint: 'Run `cd mini-services/availability && bun run dev` to start it.',
      },
      { status: 504 }
    );
    securityHeaders(res.headers);
    return res;
  }
}

// ─── POST: update state ──────────────────────────────────────────────

const VALID_STATUSES = new Set(['available', 'in-session', 'away']);

export async function POST(req: NextRequest) {
  const secret = getAdminSecret();
  if (!secret) {
    const res = NextResponse.json(
      { error: 'Admin secret not configured on the server.' },
      { status: 503 }
    );
    securityHeaders(res.headers);
    return res;
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    const res = NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
    securityHeaders(res.headers);
    return res;
  }

  // Build a clean update payload — only known fields, only valid values.
  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(String(body.status))) {
      const res = NextResponse.json(
        {
          error:
            "status must be one of: 'available', 'in-session', 'away'.",
        },
        { status: 400 }
      );
      securityHeaders(res.headers);
      return res;
    }
    update.status = body.status;
  }
  if (body.message !== undefined) {
    if (typeof body.message !== 'string') {
      const res = NextResponse.json(
        { error: 'message must be a string.' },
        { status: 400 }
      );
      securityHeaders(res.headers);
      return res;
    }
    update.message = body.message.slice(0, 280);
  }
  if (body.nextOpening !== undefined) {
    if (body.nextOpening === null || body.nextOpening === '') {
      update.nextOpening = null;
    } else if (typeof body.nextOpening === 'string') {
      const d = new Date(body.nextOpening);
      if (isNaN(d.getTime())) {
        const res = NextResponse.json(
          { error: 'nextOpening must be a valid ISO date string or null.' },
          { status: 400 }
        );
        securityHeaders(res.headers);
        return res;
      }
      update.nextOpening = d.toISOString();
    } else {
      const res = NextResponse.json(
        { error: 'nextOpening must be a string or null.' },
        { status: 400 }
      );
      securityHeaders(res.headers);
      return res;
    }
  }
  if (body.currentSessionEnds !== undefined) {
    if (body.currentSessionEnds === null || body.currentSessionEnds === '') {
      update.currentSessionEnds = null;
    } else if (typeof body.currentSessionEnds === 'string') {
      const d = new Date(body.currentSessionEnds);
      if (isNaN(d.getTime())) {
        const res = NextResponse.json(
          {
            error:
              'currentSessionEnds must be a valid ISO date string or null.',
          },
          { status: 400 }
        );
        securityHeaders(res.headers);
        return res;
      }
      update.currentSessionEnds = d.toISOString();
    }
  }

  if (Object.keys(update).length === 0) {
    const res = NextResponse.json(
      {
        error:
          'No valid fields. Send at least one of: status, message, nextOpening.',
      },
      { status: 400 }
    );
    securityHeaders(res.headers);
    return res;
  }

  try {
    const upstream = await fetch(`${UPSTREAM_BASE}/admin/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(update),
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    } as RequestInit);

    if (!upstream.ok) {
      let detail: unknown = undefined;
      try {
        detail = await upstream.json();
      } catch {
        detail = (await upstream.text().catch(() => '')).slice(0, 200);
      }
      const res = NextResponse.json(
        {
          error: 'Upstream availability service rejected the update.',
          status: upstream.status,
          detail,
        },
        { status: 502 }
      );
      securityHeaders(res.headers);
      return res;
    }

    const data = (await upstream.json()) as { ok?: boolean; state?: unknown };

    const res = NextResponse.json(
      {
        ok: true,
        state: data.state ?? null,
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    securityHeaders(res.headers);
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const res = NextResponse.json(
      {
        error: 'Cannot reach the availability mini-service.',
        detail: msg,
        hint: 'Run `cd mini-services/availability && bun run dev` to start it.',
      },
      { status: 504 }
    );
    securityHeaders(res.headers);
    return res;
  }
}
