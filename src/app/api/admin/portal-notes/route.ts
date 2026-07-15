/**
 * GET /api/admin/portal-notes — Search across all portal notes with admin-only visibility
 * POST /api/admin/portal-notes — Create an admin note for any booking/bundle
 *
 * Staff-only route. Admins see ALL notes including admin and private_session visibility.
 * Supports full-text search across body and title, filtering by visibility, noteType,
 * authorRole, bookingId, bundlePurchaseId, and date range.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET: Search portal notes ─────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Search params
    const q = searchParams.get("q") || undefined;
    const visibility = searchParams.get("visibility") || undefined;
    const noteType = searchParams.get("noteType") || undefined;
    const authorRole = searchParams.get("authorRole") || undefined;
    const bookingId = searchParams.get("bookingId") || undefined;
    const bundlePurchaseId = searchParams.get("bundlePurchaseId") || undefined;
    const authorEmail = searchParams.get("authorEmail") || undefined;
    const pinned = searchParams.get("pinned");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Soft delete filter
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Full-text search across body and title
    if (q && q.trim().length > 0) {
      const searchTerm = q.trim();
      where.OR = [
        { body: { contains: searchTerm } },
        { title: { contains: searchTerm } },
        { authorName: { contains: searchTerm } },
        { authorEmail: { contains: searchTerm } },
      ];
    }

    // Filters
    if (visibility) where.visibility = visibility;
    if (noteType) where.noteType = noteType;
    if (authorRole) where.authorRole = authorRole;
    if (bookingId) where.bookingId = bookingId;
    if (bundlePurchaseId) where.bundlePurchaseId = bundlePurchaseId;
    if (authorEmail) where.authorEmail = authorEmail;
    if (pinned === "true") where.pinned = true;
    if (pinned === "false") where.pinned = false;

    // Execute query with count
    const [notes, total] = await Promise.all([
      db.portalNote.findMany({
        where,
        include: {
          booking: {
            select: { id: true, name: true, email: true, status: true },
          },
          bundlePurchase: {
            select: {
              id: true,
              email: true,
              bundleProduct: { select: { slug: true, title: true } },
            },
          },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.portalNote.count({ where }),
    ]);

    // Shape response — admin sees everything
    const shapedNotes = notes.map((note) => ({
      id: note.id,
      bookingId: note.bookingId,
      bundlePurchaseId: note.bundlePurchaseId,
      authorRole: note.authorRole,
      authorName: note.authorName,
      authorEmail: note.authorEmail,
      noteType: note.noteType,
      visibility: note.visibility,
      title: note.title,
      body: note.body,
      pinned: note.pinned,
      deletedAt: note.deletedAt?.toISOString() || null,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      // Related entities for context
      booking: note.booking
        ? {
            id: note.booking.id,
            name: note.booking.name,
            email: note.booking.email,
            status: note.booking.status,
          }
        : null,
      bundlePurchase: note.bundlePurchase
        ? {
            id: note.bundlePurchase.id,
            email: note.bundlePurchase.email,
            bundle: note.bundlePurchase.bundleProduct,
          }
        : null,
    }));

    return NextResponse.json({
      notes: shapedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[AdminPortalNotes] GET error:", err);
    return NextResponse.json(
      { error: "Failed to search portal notes" },
      { status: 500 }
    );
  }
}

// ─── POST: Create admin note for any booking/bundle ───────────────

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
      authorName,
      authorEmail,
      noteType,
      visibility,
      title,
      body: noteBody,
      pinned,
    } = body as Record<string, string | boolean>;

    if (!noteBody || typeof noteBody !== "string" || noteBody.trim().length === 0) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    const note = await db.portalNote.create({
      data: {
        bookingId: (bookingId as string) || null,
        bundlePurchaseId: (bundlePurchaseId as string) || null,
        authorRole: "admin",
        authorName: (authorName as string) || "Admin",
        authorEmail: (authorEmail as string) || null,
        noteType: (noteType as string || "general") as any,
        visibility: (visibility as string || "admin") as any,
        title: (title as string) || null,
        body: (noteBody as string).trim(),
        pinned: pinned === true || pinned === "true",
      },
    });

    // Log activity
    db.portalActivity.create({
      data: {
        bookingId: (bookingId as string) || null,
        bundlePurchaseId: (bundlePurchaseId as string) || null,
        eventType: "note_created",
        eventSource: "admin",
        payloadJson: JSON.stringify({
          noteId: note.id,
          noteType: note.noteType,
          visibility: note.visibility,
        }),
      },
    }).catch((err) => {
      console.error("[AdminPortalNotes] Failed to log activity:", err);
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("[AdminPortalNotes] POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to create note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
