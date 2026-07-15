import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  isHoneypotTriggered,
  honeypotSuccessResponse,
} from '@/lib/security';
import { z } from 'zod';
import { emailSchema, nameSchema, honeypotSchema } from '@/lib/security/validation';

/**
 * /api/referrals — public referral-code generation + lookup.
 *
 * POST  : create a referral code (or return the existing one if the email is
 *         already a referrer). Honeypot + Zod + rate-limit (5/hour/IP).
 * GET   : look up a referral by `?email=` — returns the referrer's code and
 *         use count. Used by the /refer page "stats" widget. Public but
 *         rate-limited (30/min).
 *
 * Note: code-by-code lookups live at /api/referrals/[code]/route.ts.
 */

/* ─── Code generation ─────────────────────────────────────────────────── */

// 32-char alphabet — no ambiguous characters (no 0/O, no 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode(): string {
  // crypto.getRandomValues gives us unbiased randomness on the byte level;
  // we then map each byte onto the 32-char alphabet with rejection sampling
  // to avoid modulo bias.
  const buf = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(buf);
  let out = '';
  const maxUnbiased = 256 - (256 % CODE_ALPHABET.length); // 256
  for (let i = 0; i < CODE_LENGTH; i++) {
    let b = buf[i];
    while (b >= maxUnbiased) {
      // Re-roll this position only — extremely rare on a 32-char alphabet
      // (maxUnbiased = 256, so the loop never runs). Defensive.
      const r = new Uint8Array(1);
      crypto.getRandomValues(r);
      b = r[0];
    }
    out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Generate a unique code. Retries on DB collision up to 5 times.
 * The 32^8 space (~1 trillion) makes collisions effectively impossible
 * at our scale, but we check anyway for correctness.
 */
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const existing = await db.referral.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  // Last-resort: append a discriminator. Practically never reached.
  return `${generateCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

/* ─── Validation schemas ──────────────────────────────────────────────── */

const referralCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  // Honeypot — bots fill this, humans never see it
  website: honeypotSchema,
});

/* ─── POST — create / return a referral code ──────────────────────────── */

export async function POST(request: NextRequest) {
  // Rate limit — 5 code-generations per IP per hour. Real users generate one
  // or two; abuse is expensive (each one creates a row + sends a possible
  // notification).
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ref-create:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap (4 KB — middleware already enforces Content-Length,
  // but we re-check the parsed text length defensively)
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

  // Honeypot — silently succeed for bots so they think the form worked
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      {
        ...honeypotSuccessResponse('newsletter'),
        code: 'THANKYOU0',
        uses: 0,
      },
      { status: 200 }
    );
  }

  // Validate
  const parsed = validateInput(referralCreateSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, email } = parsed.data;

  try {
    // Idempotent: if the email already exists as a referrer, return the
    // existing code rather than creating a duplicate. This is what users
    // actually want when they re-visit /refer.
    const existing = await db.referral.findFirst({
      where: { referrerEmail: email },
      select: { code: true, uses: true, referrerName: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          code: existing.code,
          uses: existing.uses,
          referrerName: existing.referrerName,
          created: false,
        },
        { status: 200 }
      );
    }

    const code = await generateUniqueCode();
    await db.referral.create({
      data: {
        code,
        referrerName: name,
        referrerEmail: email,
        uses: 0,
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        code,
        uses: 0,
        referrerName: name,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Referral create error:', error);
    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 }
    );
  }
}

/* ─── GET — look up a referral by email (?email=...) ──────────────────── */

export async function GET(request: NextRequest) {
  // Rate limit — 30/min/IP. Used by the /refer page stats widget and by
  // anyone validating a code's authenticity.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ref-lookup:${ip}`, {
    windowMs: 60 * 1000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: 'Missing email parameter' },
      { status: 400 }
    );
  }

  // Light validation — don't return 400 on malformed emails, just 404, so we
  // don't leak validation state to scrapers.
  if (email.length > 254) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  try {
    const referral = await db.referral.findFirst({
      where: { referrerEmail: email },
      select: {
        code: true,
        referrerName: true,
        uses: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    if (!referral) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      code: referral.code,
      referrerName: referral.referrerName,
      uses: referral.uses,
      lastUsedAt: referral.lastUsedAt?.toISOString() ?? null,
      createdAt: referral.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Referral lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
