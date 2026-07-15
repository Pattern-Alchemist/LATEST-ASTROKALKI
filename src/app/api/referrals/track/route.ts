import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  checkRateLimit,
  getClientIp,
  validateInput,
  isHoneypotTriggered,
} from '@/lib/security';
import { z } from 'zod';
import { emailSchema, nameSchema, honeypotSchema } from '@/lib/security/validation';

/**
 * /api/referrals/track — POST: record a referral use.
 *
 * Body: { code, email, name?, website }
 *
 * - Increments Referral.uses
 * - Sets Referral.lastUsedAt
 * - Creates a ReferralUse row
 *
 * Idempotent: if the (referralId, email) pair already exists, the request
 * succeeds WITHOUT incrementing — the same person booking twice with the same
 * code should not double-count.
 *
 * This endpoint is for standalone referral attribution. The booking form
 * already captures `referredBy` at booking time; the booking route can call
 * this endpoint (or do the equivalent DB write) to attribute the use. This
 * route also serves the "manual attribution" case where a code is shared in
 * a context that doesn't go through the booking form.
 *
 * Rate-limited at 10/hour/IP. Zod-validated. Honeypot-protected.
 */

const trackSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => /^[A-Z2-9]{8}$/.test(s), {
      message: 'Invalid code format',
    }),
  email: emailSchema,
  name: nameSchema.optional(),
  website: honeypotSchema,
});

export async function POST(request: NextRequest) {
  // Rate limit — 10/hour/IP. Generous enough for legitimate attribution
  // flows; tight enough to stop farming.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ref-track:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 10,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body
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

  // Honeypot — silent success for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      { tracked: true, uses: 1, idempotent: false },
      { status: 200 }
    );
  }

  const parsed = validateInput(trackSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { code, email, name } = parsed.data;

  try {
    // Look up the referral by code
    const referral = await db.referral.findUnique({
      where: { code },
      select: { id: true, uses: true },
    });

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral code not found', tracked: false },
        { status: 404 }
      );
    }

    // Idempotency: check if this (referralId, email) pair already exists.
    // We do this inside the transaction to avoid races.
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.referralUse.findFirst({
        where: {
          referralId: referral.id,
          email,
        },
        select: { id: true },
      });

      if (existing) {
        return { idempotent: true, uses: referral.uses };
      }

      // Create the ReferralUse row and increment counters atomically.
      const [updated] = await Promise.all([
        tx.referral.update({
          where: { id: referral.id },
          data: {
            uses: { increment: 1 },
            lastUsedAt: new Date(),
          },
          select: { uses: true },
        }),
        tx.referralUse.create({
          data: {
            referralId: referral.id,
            email,
            name: name || null,
          },
          select: { id: true },
        }),
      ]);

      return { idempotent: false, uses: updated.uses };
    });

    return NextResponse.json(
      { tracked: true, ...result },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (error) {
    console.error('Referral track error:', error);
    return NextResponse.json(
      { error: 'Failed to record referral use' },
      { status: 500 }
    );
  }
}
