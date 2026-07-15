import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * /api/admin/experiments/[id]
 *
 *   PATCH  — update experiment (activate/deactivate, edit variants, rename page)
 *   DELETE — delete experiment (cascades to assignments)
 *
 * Admin-gated by global middleware. The `id` path parameter is the
 * Experiment.id (cuid) — NOT the experiment name, because the name is
 * user-editable and would make URL-stable admin links impossible.
 */

const VariantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  weight: z.number().min(0).max(1000),
  config: z.record(z.string(), z.unknown()).default({}),
});

const PatchSchema = z.object({
  page: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/)
    .optional(),
  variants: z.array(VariantSchema).min(2).optional(),
  active: z.boolean().optional(),
});

// ─── PATCH ────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Missing experiment id' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: { page?: string; variants?: string; active?: boolean } = {};
    if (parsed.data.page !== undefined) updates.page = parsed.data.page;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    if (parsed.data.variants !== undefined) {
      const variants = parsed.data.variants;
      const names = variants.map((v) => v.name);
      if (new Set(names).size !== names.length) {
        return NextResponse.json(
          { error: 'Variant names must be unique within an experiment.' },
          { status: 400 }
        );
      }
      updates.variants = JSON.stringify(variants);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 }
      );
    }

    const updated = await db.experiment.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        page: true,
        active: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ experiment: updated });
  } catch (error) {
    console.error('[/api/admin/experiments/[id] PATCH] error:', error);
    // P2025 = record not found — Prisma throws this from update() if
    // the row doesn't exist. Translate to a 404 so the admin UI can
    // surface a friendly message.
    const prismaErr = error as { code?: string };
    if (prismaErr.code === 'P2025') {
      return NextResponse.json(
        { error: 'Experiment not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update experiment' },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Missing experiment id' },
        { status: 400 }
      );
    }

    // Cascading delete — ExperimentAssignment rows are deleted
    // automatically thanks to `onDelete: Cascade` in the schema.
    await db.experiment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/admin/experiments/[id] DELETE] error:', error);
    const prismaErr = error as { code?: string };
    if (prismaErr.code === 'P2025') {
      return NextResponse.json(
        { error: 'Experiment not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete experiment' },
      { status: 500 }
    );
  }
}
