import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/ai/portrait/[id] — fetch a single PatternPortrait by ID.
 *
 * Public — the portrait is intended to be shareable (a personal artifact).
 * The portrait ID is a cuid, which is unguessable in practice, so anyone
 * with the link can view the portrait. The image itself is also served
 * directly from /public/portraits/<uuid>.png (no auth).
 *
 * Returns:
 *   200 { portrait: { id, email, pattern, imageUrl, prompt, createdAt } }
 *   404 if no portrait with that ID exists.
 *
 * The `prompt` field is included so a viewer (or the owner) can see what
 * the model was asked to render. The `email` is included because the
 * PatternPortrait client component uses it to confirm ownership when
 * rendering the "your portraits" gallery.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length < 5) {
    return NextResponse.json(
      { error: "Invalid portrait ID" },
      { status: 400 }
    );
  }

  try {
    const portrait = await db.patternPortrait.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        pattern: true,
        imageUrl: true,
        prompt: true,
        createdAt: true,
      },
    });

    if (!portrait) {
      return NextResponse.json(
        { error: "Portrait not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      portrait: {
        ...portrait,
        createdAt:
          portrait.createdAt instanceof Date
            ? portrait.createdAt.toISOString()
            : portrait.createdAt,
      },
    });
  } catch (error) {
    console.error("[portrait/get] DB error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portrait" },
      { status: 500 }
    );
  }
}
