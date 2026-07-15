import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/ai/chart/[id]
 *
 * Returns a single chart analysis row by ID.
 *
 * Auth model:
 *   - If the caller is signed in via NextAuth, they can view any analysis
 *     tied to their session email.
 *   - If the caller is NOT signed in, they may pass ?email=foo@bar.com and
 *     we return the row only if the row's email matches.
 *
 * This dual-path is intentional: members use the session path from inside
 * the portal; non-members (lead-gen) use the email path to retrieve their
 * own past analysis from the chart-reading page. The email path is weaker
 * but the analysis is non-sensitive (it's pattern recognition prose, not
 * PII like a real chart reading would be) and the ID is a cuid.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing analysis id" },
      { status: 400 }
    );
  }

  // Fetch the row first — if it doesn't exist, 404.
  let row;
  try {
    row = await db.chartAnalysis.findUnique({ where: { id } });
  } catch (err) {
    console.error("chart/[id] fetch error:", err);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // ─── Auth: session OR email match ─────────────────────────────────────
  let sessionEmail: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) sessionEmail = session.user.email.toLowerCase();
  } catch {
    // Session lookup failed — fall through to the email-match path.
  }

  const url = new URL(request.url);
  const queryEmail = url.searchParams.get("email")?.toLowerCase().trim() || "";

  const rowEmail = row.email.toLowerCase();

  const authorizedBySession = sessionEmail && sessionEmail === rowEmail;
  const authorizedByEmail = queryEmail && queryEmail === rowEmail;

  if (!authorizedBySession && !authorizedByEmail) {
    return NextResponse.json(
      { error: "Unauthorized — this analysis belongs to a different email." },
      { status: 403 }
    );
  }

  // ─── Parse the patterns JSON ──────────────────────────────────────────
  let identifiedPatterns: string[] = [];
  try {
    const parsed = JSON.parse(row.identifiedPatterns);
    if (Array.isArray(parsed)) {
      identifiedPatterns = parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    // Malformed JSON in DB — leave empty.
  }

  return NextResponse.json(
    {
      id: row.id,
      email: row.email,
      imageUrl: row.imageUrl,
      analysis: row.analysis,
      identifiedPatterns,
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    },
    { status: 200 }
  );
}
