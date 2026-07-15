import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/ai/chart/history?email=foo@bar.com
 *
 * Returns all chart analyses for a given email, newest first.
 *
 * Auth model: same as /api/ai/chart/[id] — session OR email match.
 *   - If the caller is signed in, the session email takes precedence and
 *     the ?email= param is ignored (so a signed-in member can't snoop on
 *     someone else's email by passing it in the query).
 *   - If the caller is not signed in, the ?email= param is required.
 *
 * Returns at most 50 rows. Each row includes the parsed identifiedPatterns
 * array (not the raw JSON string).
 */

const MAX_ROWS = 50;

export async function GET(request: NextRequest) {
  // ─── Resolve the authorised email ─────────────────────────────────────
  let sessionEmail: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) sessionEmail = session.user.email.toLowerCase();
  } catch {
    // Session lookup failed — fall through to the email-match path.
  }

  const url = new URL(request.url);
  const queryEmail = url.searchParams.get("email")?.toLowerCase().trim() || "";

  // Session takes precedence — if signed in, use the session email and
  // ignore any ?email= param. This prevents a signed-in member from
  // passing someone else's email in the query string.
  const targetEmail = sessionEmail || queryEmail;

  if (!targetEmail) {
    return NextResponse.json(
      {
        error:
          "Email is required. Sign in to your account or pass ?email= in the query string.",
      },
      { status: 400 }
    );
  }

  // Basic email shape check — protects the DB from garbage queries.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail);
  if (!emailOk) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // ─── Fetch the analyses ───────────────────────────────────────────────
  let rows;
  try {
    rows = await db.chartAnalysis.findMany({
      where: { email: targetEmail },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      select: {
        id: true,
        email: true,
        imageUrl: true,
        analysis: true,
        identifiedPatterns: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error("chart/history fetch error:", err);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }

  // ─── Parse the patterns JSON for each row ─────────────────────────────
  const analyses = rows.map((row) => {
    let identifiedPatterns: string[] = [];
    try {
      const parsed = JSON.parse(row.identifiedPatterns);
      if (Array.isArray(parsed)) {
        identifiedPatterns = parsed.filter(
          (s): s is string => typeof s === "string"
        );
      }
    } catch {
      // Malformed JSON — leave empty.
    }

    return {
      id: row.id,
      email: row.email,
      imageUrl: row.imageUrl,
      analysis: row.analysis,
      identifiedPatterns,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : row.createdAt,
    };
  });

  return NextResponse.json(
    { analyses, count: analyses.length },
    { status: 200 }
  );
}
