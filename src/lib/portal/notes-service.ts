/**
 * Portal notes service for AstroKalki.
 *
 * Handles CRUD operations for portal notes with visibility filtering.
 * Uses portal-access.ts for access verification and portal-dto.ts for shaping.
 */

import { db } from "@/lib/db";
import { assertPortalAccess, type ViewerRole } from "./portal-access";

// ─── Types ────────────────────────────────────────────────────────

export type NoteVisibility = "admin" | "shared" | "client" | "private_session";
export type NoteType = "general" | "reflection" | "question" | "summary" | "admin_internal";
export type AuthorRole = "admin" | "client" | "system";

export interface CreateNoteInput {
  bookingId?: string;
  bundlePurchaseId?: string;
  authorRole: AuthorRole;
  authorName?: string;
  authorEmail?: string;
  noteType?: NoteType;
  visibility?: NoteVisibility;
  title?: string;
  body: string;
  pinned?: boolean;
}

export interface UpdateNoteInput {
  body?: string;
  title?: string;
  pinned?: boolean;
  visibility?: NoteVisibility;
}

export interface ListNotesInput {
  bookingId?: string;
  bundlePurchaseId?: string;
  viewerRole: AuthorRole;
  viewerEmail?: string;
  resourceEmail?: string;
  includeDeleted?: boolean;
}

export interface PortalNote {
  id: string;
  bookingId: string | null;
  bundlePurchaseId: string | null;
  authorRole: string;
  authorName: string | null;
  authorEmail: string | null;
  noteType: string;
  visibility: string;
  title: string | null;
  body: string;
  pinned: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── List notes ───────────────────────────────────────────────────

export async function listPortalNotes(
  input: ListNotesInput
): Promise<PortalNote[]> {
  assertPortalAccess(
    input.viewerRole,
    input.viewerEmail,
    input.resourceEmail
  );

  const where: Record<string, unknown> = {};

  if (input.bookingId) where.bookingId = input.bookingId;
  if (input.bundlePurchaseId)
    where.bundlePurchaseId = input.bundlePurchaseId;

  // Soft delete filter
  if (!input.includeDeleted) {
    where.deletedAt = null;
  }

  // Visibility filtering based on viewer role
  if (input.viewerRole === "client") {
    // Clients see: shared + client notes (not admin or private_session)
    where.visibility = { in: ["shared", "client"] };
  }
  // Admins see everything

  const notes = await db.portalNote.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return notes as PortalNote[];
}

// ─── Create note ──────────────────────────────────────────────────

export async function createPortalNote(
  input: CreateNoteInput
): Promise<PortalNote> {
  assertPortalAccess(input.authorRole, input.authorEmail);

  if (!input.body || input.body.trim().length === 0) {
    throw new Error("Note body is required");
  }

  if (input.body.length > 10000) {
    throw new Error("Note body must be under 10,000 characters");
  }

  const note = await db.portalNote.create({
    data: {
      bookingId: input.bookingId || null,
      bundlePurchaseId: input.bundlePurchaseId || null,
      authorRole: input.authorRole,
      authorName: input.authorName || null,
      authorEmail: input.authorEmail || null,
      noteType: input.noteType || "general",
      visibility: input.visibility || "admin",
      title: input.title || null,
      body: input.body.trim(),
      pinned: input.pinned || false,
    },
  });

  // Log activity (fire-and-forget with catch)
  db.portalActivity.create({
    data: {
      bookingId: input.bookingId || null,
      bundlePurchaseId: input.bundlePurchaseId || null,
      eventType: "note_created",
      eventSource: input.authorRole,
      payloadJson: JSON.stringify({
        noteId: note.id,
        noteType: note.noteType,
        visibility: note.visibility,
      }),
    },
  }).catch((err) => {
    console.error("[NotesService] Failed to log activity:", err);
  });

  return note as PortalNote;
}

// ─── Update note ──────────────────────────────────────────────────

export async function updatePortalNote(
  noteId: string,
  input: UpdateNoteInput,
  viewerRole: AuthorRole,
  viewerEmail?: string
): Promise<PortalNote> {
  const existing = await db.portalNote.findUnique({
    where: { id: noteId },
  });

  if (!existing) {
    throw new Error("Note not found");
  }

  if (existing.deletedAt) {
    throw new Error("Cannot edit a deleted note");
  }

  // Verify access with resource email
  assertPortalAccess(viewerRole, viewerEmail, existing.authorEmail || undefined);

  // Clients can only edit their own notes
  if (viewerRole === "client" && existing.authorRole !== "client") {
    throw new Error("You can only edit your own notes");
  }

  const updateData: Record<string, unknown> = {};
  if (input.body !== undefined) {
    if (input.body.trim().length === 0) {
      throw new Error("Note body cannot be empty");
    }
    if (input.body.length > 10000) {
      throw new Error("Note body must be under 10,000 characters");
    }
    updateData.body = input.body.trim();
  }
  if (input.title !== undefined) updateData.title = input.title;
  if (input.pinned !== undefined) updateData.pinned = input.pinned;
  if (input.visibility !== undefined)
    updateData.visibility = input.visibility;

  const note = await db.portalNote.update({
    where: { id: noteId },
    data: updateData,
  });

  return note as PortalNote;
}

// ─── Soft delete note ─────────────────────────────────────────────

export async function softDeletePortalNote(
  noteId: string,
  viewerRole: AuthorRole,
  viewerEmail?: string
): Promise<void> {
  const existing = await db.portalNote.findUnique({
    where: { id: noteId },
  });

  if (!existing) {
    throw new Error("Note not found");
  }

  if (existing.deletedAt) {
    throw new Error("Note is already deleted");
  }

  // Verify access with resource email
  assertPortalAccess(viewerRole, viewerEmail, existing.authorEmail || undefined);

  // Clients can only delete their own notes
  if (viewerRole === "client" && existing.authorRole !== "client") {
    throw new Error("You can only delete your own notes");
  }

  await db.portalNote.update({
    where: { id: noteId },
    data: { deletedAt: new Date() },
  });

  // Log activity (fire-and-forget with catch)
  db.portalActivity.create({
    data: {
      bookingId: existing.bookingId,
      bundlePurchaseId: existing.bundlePurchaseId,
      eventType: "note_deleted",
      eventSource: viewerRole,
      payloadJson: JSON.stringify({ noteId }),
    },
  }).catch((err) => {
    console.error("[NotesService] Failed to log activity:", err);
  });
}
