/**
 * PATCH /api/admin/portal-notes/[id] — Admin moderation for portal notes
 * DELETE /api/admin/portal-notes/[id] — Admin soft-delete for portal notes
 *
 * Staff-only route. Admins can modify ANY note regardless of visibility or author.
 * Operations: change visibility, pin/unpin, change note type, restore soft-deleted notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    const {
      visibility,
      pinned,
      noteType,
      title,
      body: noteBody,
      restore,
    } = body as Record<string, string | boolean>;

    // Find the note
    const existing = await db.portalNote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Build update data — only include provided fields
    const updateData: Record<string, unknown> = {};

    if (visibility !== undefined) {
      const validVisibilities = ["admin", "shared", "client", "private_session"];
      if (!validVisibilities.includes(visibility as string)) {
        return NextResponse.json(
          { error: `visibility must be one of: ${validVisibilities.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.visibility = visibility;
    }

    if (pinned !== undefined) {
      updateData.pinned = pinned === true || pinned === "true";
    }

    if (noteType !== undefined) {
      const validTypes = ["general", "reflection", "question", "summary", "admin_internal"];
      if (!validTypes.includes(noteType as string)) {
        return NextResponse.json(
          { error: `noteType must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.noteType = noteType;
    }

    if (title !== undefined) {
      updateData.title = title || null;
    }

    if (noteBody !== undefined) {
      if (typeof noteBody !== "string" || noteBody.trim().length === 0) {
        return NextResponse.json(
          { error: "body cannot be empty" },
          { status: 400 }
        );
      }
      if (noteBody.length > 10000) {
        return NextResponse.json(
          { error: "body must be under 10,000 characters" },
          { status: 400 }
        );
      }
      updateData.body = noteBody.trim();
    }

    // Restore soft-deleted note
    if (restore === true || restore === "true") {
      updateData.deletedAt = null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Apply update
    const note = await db.portalNote.update({
      where: { id },
      data: updateData,
    });

    // Log moderation activity
    const changes = Object.keys(updateData).filter((k) => k !== "deletedAt");
    db.portalActivity.create({
      data: {
        bookingId: existing.bookingId,
        bundlePurchaseId: existing.bundlePurchaseId,
        eventType: "note_moderated",
        eventSource: "admin",
        payloadJson: JSON.stringify({
          noteId: id,
          changes,
          previousVisibility: existing.visibility,
          newVisibility: updateData.visibility || existing.visibility,
          restored: updateData.deletedAt === null && existing.deletedAt !== null,
        }),
      },
    }).catch((err) => {
      console.error("[AdminPortalNotes] Failed to log moderation:", err);
    });

    return NextResponse.json({ note });
  } catch (err) {
    console.error("[AdminPortalNotes] PATCH error:", err);
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
    const existing = await db.portalNote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "Note is already deleted" },
        { status: 400 }
      );
    }

    // Soft delete
    await db.portalNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log deletion activity
    db.portalActivity.create({
      data: {
        bookingId: existing.bookingId,
        bundlePurchaseId: existing.bundlePurchaseId,
        eventType: "note_deleted",
        eventSource: "admin",
        payloadJson: JSON.stringify({
          noteId: id,
          previousVisibility: existing.visibility,
          authorRole: existing.authorRole,
        }),
      },
    }).catch((err) => {
      console.error("[AdminPortalNotes] Failed to log deletion:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AdminPortalNotes] DELETE error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
