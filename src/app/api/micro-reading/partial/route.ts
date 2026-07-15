/**
 * Partial-state persistence for the micro-reading flow.
 *
 * Called by the frontend on every step change of the micro-reading flow
 * (debounced). This lets us:
 *   1. Email users who abandoned mid-flow (Enhancement #4)
 *   2. Show partial state in the admin dashboard (Enhancement #3)
 *
 * The endpoint is intentionally lenient — partial state is best-effort.
 * Failures never break the user's flow on the frontend.
 *
 * Security: rate-limited (30/hr per IP), Zod-validated, honeypot-guarded.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  microReadingPartialInputSchema,
  isHoneypotTriggered,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  // Rate limit — 30 partials per IP per hour (autosave fires on every step)
  const ip = getClientIp(request);
  const rl = checkRateLimit(`mrp:${ip}`, RATE_LIMITS.microReadingPartial);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limited" },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap (4 KB)
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Honeypot — silently succeed for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json({ ok: true, persisted: true });
  }

  // Validate
  const parsed = validateInput(microReadingPartialInputSchema, raw);
  if (!parsed.success) {
    // Original behaviour: return 200 with persisted=false so frontend doesn't break
    return NextResponse.json(
      { ok: true, persisted: false, reason: "invalid-input" },
      { status: 200 }
    );
  }
  const { email, step, partialData } = parsed.data;

  try {
    // Find existing abandoned-flow record for this email that hasn't been
    // converted yet. If they've completed a reading, we don't track them
    // as abandoned anymore.
    const existing = await db.abandonedFlow.findFirst({
      where: {
        email,
        converted: false,
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const data = {
      email,
      flowType: "micro-reading",
      step,
      partialData: JSON.stringify(partialData || {}),
    };

    if (existing && !existing.recovered) {
      // Update in-place — keep the original createdAt so the 2-hour delay
      // before recovery email is calculated from first interaction.
      await db.abandonedFlow.update({
        where: { id: existing.id },
        data: { ...data, updatedAt: now },
      });
    } else if (existing && existing.recovered) {
      // They came back after recovery email. Mark converted=false but reset
      // the record so we can recover again if they abandon a second time.
      // Actually: better to create a new record so we can track recovery rate.
      await db.abandonedFlow.create({ data: { ...data, createdAt: now } });
    } else {
      // New abandonment tracking
      await db.abandonedFlow.create({ data: { ...data, createdAt: now } });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("[partial] Error:", error);
    // Never break the user's flow
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
