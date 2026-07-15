/**
 * GET /api/portal/notes — List portal notes by booking or bundle
 * POST /api/portal/notes — Create a new portal note
 */

import { NextRequest, NextResponse } from "next/server";
import { listPortalNotes, createPortalNote } from "@/lib/portal/notes-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId") || undefined;
    const bundlePurchaseId = searchParams.get("bundlePurchaseId") || undefined;
    const viewerRole = (searchParams.get("role") || "admin") as "admin" | "client";

    if (!bookingId && !bundlePurchaseId) {
      return NextResponse.json(
        { error: "bookingId or bundlePurchaseId is required" },
        { status: 400 }
      );
    }

    const notes = await listPortalNotes({
      bookingId,
      bundlePurchaseId,
      viewerRole,
    });

    return NextResponse.json({ notes });
  } catch (err) {
    console.error("[PortalNotes] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 64 * 1024) {
        return NextResponse.json({ error: "Body too large" }, { status: 413 });
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      bookingId,
      bundlePurchaseId,
      authorRole,
      authorName,
      authorEmail,
      noteType,
      visibility,
      title,
      body: noteBody,
    } = body as Record<string, string>;

    if (!noteBody || typeof noteBody !== "string") {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    if (!authorRole || !["admin", "client", "system"].includes(authorRole)) {
      return NextResponse.json(
        { error: "authorRole must be admin, client, or system" },
        { status: 400 }
      );
    }

    const note = await createPortalNote({
      bookingId,
      bundlePurchaseId,
      authorRole: authorRole as "admin" | "client" | "system",
      authorName,
      authorEmail,
      noteType: noteType as any,
      visibility: visibility as any,
      title,
      body: noteBody,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("[PortalNotes] POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to create note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
