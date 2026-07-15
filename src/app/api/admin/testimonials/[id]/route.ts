import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Admin testimonial by-id API.
 *
 * Auth-gated by middleware. Allows the admin to:
 *
 * PATCH  — update any field on a testimonial. Used by the /admin/testimonials
 *          UI to approve (status='approved'), reject (status='rejected'),
 *          feature/unfeature, edit quote/context, or reorder.
 *
 * DELETE — permanently remove a testimonial (rejected spam, accidental
 *          duplicates, etc.). Used for cleanup, not for moderation —
 *          moderation uses status='rejected' so the audit trail is kept.
 */

const VALID_STATUSES = ['pending', 'approved', 'rejected'] as const;

const adminPatchSchema = z
  .object({
    quote: z.string().trim().min(10).max(2000).optional(),
    context: z.string().trim().min(3).max(100).optional(),
    initials: z.string().trim().min(2).max(20).optional(),
    detail: z
      .string()
      .max(200)
      .nullable()
      .or(z.literal('').transform(() => null))
      .optional(),
    email: z
      .string()
      .max(254)
      .nullable()
      .or(z.literal('').transform(() => null))
      .optional(),
    pattern: z
      .string()
      .max(60)
      .nullable()
      .or(z.literal('').transform(() => null))
      .optional(),
    avatarUrl: z
      .string()
      .max(500)
      .nullable()
      .or(z.literal('').transform(() => null))
      .optional(),
    videoUrl: z
      .string()
      .max(500)
      .nullable()
      .or(z.literal('').transform(() => null))
      .optional(),
    featured: z.boolean().optional(),
    order: z.number().int().min(0).max(10000).optional(),
    status: z.enum(VALID_STATUSES).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let raw: unknown;
    try {
      const text = await request.text();
      if (text.length > 16 * 1024) {
        return NextResponse.json(
          { error: 'Body too large' },
          { status: 413 }
        );
      }
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = adminPatchSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue
            ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
            : 'Invalid input',
        },
        { status: 400 }
      );
    }

    const existing = await db.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    // Build update payload — only fields the admin actually sent.
    const updates: Record<string, unknown> = {};
    const data = parsed.data;
    if (data.quote !== undefined) updates.quote = data.quote;
    if (data.context !== undefined) updates.context = data.context;
    if (data.initials !== undefined) updates.initials = data.initials;
    if (data.detail !== undefined) updates.detail = data.detail;
    if (data.email !== undefined) updates.email = data.email;
    if (data.pattern !== undefined) updates.pattern = data.pattern;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    if (data.videoUrl !== undefined) updates.videoUrl = data.videoUrl;
    if (data.featured !== undefined) updates.featured = data.featured;
    if (data.order !== undefined) updates.order = data.order;
    if (data.status !== undefined) updates.status = data.status;

    const testimonial = await db.testimonial.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ testimonial });
  } catch (error) {
    console.error('Admin testimonial update error:', error);
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    await db.testimonial.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin testimonial delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}
