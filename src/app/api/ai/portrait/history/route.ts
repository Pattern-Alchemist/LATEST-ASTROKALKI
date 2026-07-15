import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/security";

/**
 * GET /api/ai/portrait/history?email=<email>
 *
 * Returns all PatternPortrait rows for a given email, newest first.
 * Used by:
 *   - The /account member portal (the "Pattern Portraits" section).
 *   - The inline PatternPortrait client component (so a returning user can
 *     see the portraits they've already generated for the current pattern).
 *
 * Privacy:
 *   The endpoint requires a valid email and returns only that email's
 *   portraits. Portrait content itself is abstract / symbolic (no faces),
 *   so leaking the list is low-sensitivity — but we still gate on the
 *   Zod-validated email param to prevent trivial enumeration.
 *
 * Returns:
 *   200 { portraits: Array<{ id, pattern, imageUrl, createdAt }> }
 *   400 if email is missing/invalid.
 */

export async function GET(request: NextRequest) {
  const emailParam = request.nextUrl.searchParams.get("email");

  if (!emailParam) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Validate email (also normalises to lowercase)
  const parsed = emailSchema.safeParse(emailParam);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email" },
      { status: 400 }
    );
  }
  const email = parsed.data;

  try {
    const portraits = await db.patternPortrait.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        pattern: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      portraits: portraits.map((p) => ({
        ...p,
        createdAt:
          p.createdAt instanceof Date
            ? p.createdAt.toISOString()
            : p.createdAt,
      })),
    });
  } catch (error) {
    console.error("[portrait/history] DB error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portraits" },
      { status: 500 }
    );
  }
}
