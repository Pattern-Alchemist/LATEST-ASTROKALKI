import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/security';

/**
 * /api/referrals/[code] — public referral lookup by code.
 *
 * GET : returns `{ code, referrerName, uses }` if the code exists, 404 if not.
 *       Public — used to validate a code before booking, and by the /refer
 *       page's "stats" widget to display a code's use count.
 *
 * Rate-limited at 30/min/IP. This is read-only and cheap.
 */

const CODE_REGEX = /^[A-Z2-9]{8}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ref-code:${ip}`, {
    windowMs: 60 * 1000,
    max: 30,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  const { code: rawCode } = await params;
  // Normalise: uppercase, strip whitespace. Codes are 8 chars, alphanumeric,
  // no ambiguous characters. Reject anything that doesn't fit the shape so we
  // don't leak which codes exist via timing/length differences.
  const code = rawCode.trim().toUpperCase();

  if (!CODE_REGEX.test(code)) {
    return NextResponse.json(
      { valid: false, error: 'Invalid code format' },
      { status: 404 }
    );
  }

  try {
    const referral = await db.referral.findUnique({
      where: { code },
      select: {
        code: true,
        referrerName: true,
        uses: true,
        lastUsedAt: true,
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
    });
  } catch (error) {
    console.error('Referral code lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
