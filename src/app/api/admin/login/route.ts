import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSessionToken,
  verifyPassword,
  ADMIN_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  adminLoginInputSchema,
  isHoneypotTriggered,
} from '@/lib/security';

/**
 * POST /api/admin/login
 *
 * Issues a signed session cookie if the provided password matches
 * ADMIN_PASSWORD. Rate-limited per IP to resist brute force.
 *
 * Body: { password: string, website?: string (honeypot) }
 */

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin-login:${ip}`, RATE_LIMITS.adminLogin);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap
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

  // Honeypot — silently succeed for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      { ok: true, session: 'fake-session-token' },
      { status: 200 }
    );
  }

  // Validate
  const parsed = validateInput(adminLoginInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { password } = parsed.data;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error('[admin/login] ADMIN_PASSWORD env var not set');
    return NextResponse.json(
      { error: 'Admin auth not configured on the server' },
      { status: 503 }
    );
  }

  // Constant-time compare
  if (!verifyPassword(password, expected)) {
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Issue session token
  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({ ok: true });
}
