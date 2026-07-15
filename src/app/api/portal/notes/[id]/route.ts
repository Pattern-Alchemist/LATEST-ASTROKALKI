/**
 * PATCH /api/portal/notes/[id] — Update a portal note
 * DELETE /api/portal/notes/[id] — Soft delete a portal note
 */

import { NextRequest, NextResponse } from "next/server";
import { updatePortalNote, softDeletePortalNote } from "@/lib/portal/notes-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    const { body: noteBody, title, pinned, visibility, viewerRole } =
      body as Record<string, string>;

    if (!viewerRole || !["admin", "client"].includes(viewerRole)) {
      return NextResponse.json(
        { error: "viewerRole is required (admin or client)" },
        { status: 400 }
      );
    }

    const note = await updatePortalNote(
      id,
      {
        body: noteBody,
        title,
        pinned: pinned === "true" || (pinned as unknown) === true,
        visibility: visibility as any,
      },
      viewerRole as "admin" | "client"
    );

    return NextResponse.json({ note });
  } catch (err) {
    console.error("[PortalNotes] PATCH error:", err);
    const message = err instanceof Error ? err.message : "Failed to update note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const viewerRole = (searchParams.get("role") || "admin") as "admin" | "client";

    await softDeletePortalNote(id, viewerRole);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PortalNotes] DELETE error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
