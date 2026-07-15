import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getExperimentsSummary } from '@/lib/ab/testing';

/**
 * /api/admin/experiments
 *
 *   GET    — list all experiments with per-variant summary stats
 *   POST   — create a new experiment
 *
 * Both handlers are admin-gated by the global middleware (see
 * /src/middleware.ts section 2). The middleware also enforces a CSRF
 * Origin check, so we don't need to re-implement it here.
 */

// ─── Variant validation ──────────────────────────────────────────────
//
// Variants are stored as a JSON-encoded string in the `variants` TEXT
// column (Prisma can't model a list of structured objects as a scalar).
// We validate the input shape with Zod before stringifying.

const VariantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Variant name must be alphanumeric/dash/underscore'),
  weight: z.number().min(0).max(1000),
  config: z.record(z.string(), z.unknown()).default({}),
});

const CreateExperimentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(
      /^[a-z0-9-]+$/,
      'Experiment name must be lowercase kebab-case (a-z, 0-9, -)'
    ),
  page: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/, 'Page must be lowercase alphanumeric/dash/underscore'),
  variants: z.array(VariantSchema).min(2, 'At least 2 variants are required'),
  active: z.boolean().default(true),
});

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const summary = await getExperimentsSummary();
    return NextResponse.json({ experiments: summary });
  } catch (error) {
    console.error('[/api/admin/experiments GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to load experiments' },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = CreateExperimentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, page, variants, active } = parsed.data;

    // Enforce a sensible invariant: variant names must be unique within
    // an experiment. (Zod can do this with .refine but the explicit
    // check keeps the error message useful.)
    const names = variants.map((v) => v.name);
    if (new Set(names).size !== names.length) {
      return NextResponse.json(
        { error: 'Variant names must be unique within an experiment.' },
        { status: 400 }
      );
    }

    // Uniqueness guard on the experiment name itself. The DB column is
    // @unique so a race would still throw P2002 — but a friendly error
    // beats a raw Prisma message in the admin UI.
    const existing = await db.experiment.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `An experiment named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const created = await db.experiment.create({
      data: {
        name,
        page,
        variants: JSON.stringify(variants),
        active,
      },
      select: { id: true, name: true, page: true, active: true },
    });

    return NextResponse.json({ experiment: created }, { status: 201 });
  } catch (error) {
    console.error('[/api/admin/experiments POST] error:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}
