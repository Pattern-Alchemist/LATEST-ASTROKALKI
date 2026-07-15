import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Admin case-study by-id API.
 *
 * Auth-gated by middleware (/api/admin/* → 401 without admin session).
 *
 * GET    — fetch a single case study (full content, including unpublished).
 * PATCH  — update any field. Used by /admin/case-studies editor.
 *          Supports partial updates — only the fields sent in the body are
 *          written. Slug updates are allowed but checked for collisions.
 * DELETE — permanently remove. Used for cleanup of drafts / accidental
 *          duplicates. Published case studies should generally be unpublished
 *          (PATCH { published: false }) rather than deleted, but the option
 *          is there.
 */

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case');

const patchSchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().min(5).max(200).optional(),
    pattern: z.string().trim().min(2).max(80).optional(),
    clientInitials: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .refine((s) => /^[A-Za-z]\.?(,?\s*\d+)?$|^[A-Za-z]{1,3}\.?$/.test(s.trim()), {
        message: 'Use first-initial + optional age (e.g. "R., 34" or "M.")',
      })
      .optional(),
    clientAge: z.number().int().min(0).max(120).nullable().optional(),
    consentGiven: z.boolean().optional(),
    problem: z.string().trim().min(20).max(20000).optional(),
    patternSection: z.string().trim().min(20).max(20000).optional(),
    session: z.string().trim().min(20).max(20000).optional(),
    shift: z.string().trim().min(20).max(20000).optional(),
    published: z.boolean().optional(),
  })
  .strict();

// ─── GET — single ────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const caseStudy = await db.caseStudy.findUnique({ where: { id } });
    if (!caseStudy) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ caseStudy });
  } catch (error) {
    console.error('Admin case-study get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case study' },
      { status: 500 }
    );
  }
}

// ─── PATCH — update ──────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let raw: unknown;
    try {
      const text = await request.text();
      if (text.length > 64 * 1024) {
        return NextResponse.json(
          { error: 'Body too large (max 64KB)' },
          { status: 413 }
        );
      }
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(raw);
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

    const existing = await db.caseStudy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    const data = parsed.data;

    // If slug is being changed, ensure no collision with another record.
    if (data.slug && data.slug !== existing.slug) {
      const collision = await db.caseStudy.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (collision && collision.id !== id) {
        return NextResponse.json(
          { error: `Slug "${data.slug}" is already in use` },
          { status: 409 }
        );
      }
    }

    // Build update payload — only fields the admin actually sent.
    const updates: Record<string, unknown> = {};
    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.title !== undefined) updates.title = data.title;
    if (data.pattern !== undefined) updates.pattern = data.pattern;
    if (data.clientInitials !== undefined) updates.clientInitials = data.clientInitials;
    if (data.clientAge !== undefined) updates.clientAge = data.clientAge;
    if (data.consentGiven !== undefined) updates.consentGiven = data.consentGiven;
    if (data.problem !== undefined) updates.problem = data.problem;
    if (data.patternSection !== undefined) updates.patternSection = data.patternSection;
    if (data.session !== undefined) updates.session = data.session;
    if (data.shift !== undefined) updates.shift = data.shift;
    if (data.published !== undefined) updates.published = data.published;

    const updated = await db.caseStudy.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ caseStudy: updated });
  } catch (error) {
    console.error('Admin case-study update error:', error);
    return NextResponse.json(
      { error: 'Failed to update case study' },
      { status: 500 }
    );
  }
}

// ─── DELETE — remove ─────────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.caseStudy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    await db.caseStudy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin case-study delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete case study' },
      { status: 500 }
    );
  }
}
