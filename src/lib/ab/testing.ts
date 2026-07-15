/**
 * A/B testing core — variant assignment, conversion tracking, summary.
 *
 * Persistence model (already in prisma/schema.prisma, M9-c block):
 *
 *   Experiment
 *     id          String  @id @default(cuid())
 *     name        String  @unique            // e.g. "hero-headline"
 *     page        String                     // "hero" | "booking_cta" | ...
 *     variants    String                     // JSON-encoded array
 *     active      Boolean  @default(true)
 *     assignments ExperimentAssignment[]
 *
 *   ExperimentAssignment
 *     experimentId  String
 *     sessionId     String                   // from ak_sid cookie
 *     variant       String                   // chosen variant name
 *     converted     Boolean  @default(false)
 *     @@unique([experimentId, sessionId])    // one assignment per session
 *
 * Variant shape (the JSON-encoded `variants` string):
 *   {
 *     name:   string         // "a" | "b" | "control" | "treatment" ...
 *     weight: number         // relative weight (any non-negative number)
 *     config: Record<string, unknown>  // arbitrary payload — copy, color, etc.
 *   }
 *
 * Weighted random selection:
 *   - Weights are relative, not percentages. e.g. [1, 1, 2] → 25/25/50.
 *   - Weights of 0 are honoured — that variant will never be picked
 *     (useful for "pause this variant without deleting it").
 *   - If all weights are 0 (misconfiguration), falls back to uniform.
 */

import { db } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────

export interface VariantDef {
  name: string;
  weight: number;
  config: Record<string, unknown>;
}

export interface VariantAssignment {
  variant: string;
  config: Record<string, unknown>;
}

export interface ExperimentSummary {
  id: string;
  name: string;
  page: string;
  active: boolean;
  variants: VariantDef[];
  totalAssignments: number;
  conversions: number;
  conversionRate: number; // 0-100
  perVariant: Array<{
    name: string;
    assignments: number;
    conversions: number;
    conversionRate: number; // 0-100
  }>;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Parse the JSON-encoded `variants` column defensively. Returns `[]` on
 * any failure so callers can short-circuit to the "no experiment" path
 * rather than throwing to the visitor.
 */
function parseVariants(raw: string | null | undefined): VariantDef[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (v): v is VariantDef =>
          v !== null &&
          typeof v === 'object' &&
          typeof v.name === 'string' &&
          typeof v.weight === 'number' &&
          typeof v.config === 'object' &&
          v.config !== null
      )
      .map((v) => ({
        name: v.name,
        weight: Math.max(0, v.weight),
        config: v.config,
      }));
  } catch {
    return [];
  }
}

/**
 * Deterministic-but-random weighted selection.
 *
 * Picks one of the variants according to their relative `weight` values.
 * If all weights are 0, falls back to uniform random selection (so a
 * misconfigured experiment still produces an assignment rather than
 * throwing).
 *
 * Uses crypto.getRandomValues for unbiased randomness — Math.random()
 * would also work for assignment, but crypto RNG avoids the
 * modulo-bias pitfall and is appropriate here since we only call this
 * once per visitor per experiment.
 */
function pickWeightedVariant(variants: VariantDef[]): VariantDef | null {
  if (variants.length === 0) return null;

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);

  // All-zero guard — fall back to uniform so we always assign something.
  if (totalWeight <= 0) {
    const idx = Math.floor(cryptoRand() * variants.length);
    return variants[idx] ?? null;
  }

  // crypto.getRandomValues gives 32 bits of unbiased randomness. We
  // map it into [0, totalWeight) by treating it as a float in [0, 1)
  // — close enough for weight selection (off by less than 2^-31).
  const r = cryptoRand() * totalWeight;
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (r < cumulative) return v;
  }
  // Floating-point safety net — if rounding pushed us past the end,
  // return the last variant.
  return variants[variants.length - 1] ?? null;
}

/** Returns a float in [0, 1) using the Web Crypto API. */
function cryptoRand(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // 2^32 possible values → divide by 2^32 to map into [0, 1).
  return buf[0] / 0x100000000;
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Get the assigned variant for a session on a given experiment.
 *
 * Behaviour:
 *   - If the experiment doesn't exist OR is inactive OR has no variants
 *     → returns null (caller renders default content).
 *   - If an assignment already exists for this (experiment, session)
 *     → returns it (sticky — same visitor always sees the same variant).
 *   - Otherwise → performs weighted random selection, persists the
 *     assignment, and returns it.
 *
 * The assignment is created with `converted: false` — see
 * {@link trackConversion} for marking it converted.
 *
 * Errors are swallowed and null returned — A/B testing must NEVER
 * break the visitor's page render. The default content always renders
 * if anything goes wrong server-side.
 */
export async function getVariant(
  experimentName: string,
  sessionId: string
): Promise<VariantAssignment | null> {
  if (!experimentName || !sessionId) return null;

  try {
    const experiment = await db.experiment.findUnique({
      where: { name: experimentName },
      select: { id: true, variants: true, active: true },
    });

    if (!experiment || !experiment.active) return null;

    const variants = parseVariants(experiment.variants);
    if (variants.length === 0) return null;

    // Sticky assignment — check for an existing row first.
    const existing = await db.experimentAssignment.findUnique({
      where: {
        experimentId_sessionId: {
          experimentId: experiment.id,
          sessionId,
        },
      },
      select: { variant: true },
    });

    if (existing) {
      const match = variants.find((v) => v.name === existing.variant);
      if (match) {
        return { variant: match.name, config: match.config };
      }
      // Edge case: the variant name on the assignment no longer exists
      // in the experiment definition (admin removed it). Fall through to
      // re-assign rather than render a phantom variant. We delete the
      // stale row so the new assignment doesn't trip the unique constraint.
      await db.experimentAssignment
        .delete({
          where: {
            experimentId_sessionId: {
              experimentId: experiment.id,
              sessionId,
            },
          },
        })
        .catch(() => {
          /* ignore — best-effort cleanup */
        });
    }

    // New assignment — weighted random selection.
    const chosen = pickWeightedVariant(variants);
    if (!chosen) return null;

    try {
      await db.experimentAssignment.create({
        data: {
          experimentId: experiment.id,
          sessionId,
          variant: chosen.name,
        },
      });
    } catch {
      // Race condition: another concurrent request for the same session
      // created the assignment between our findUnique and our create.
      // Re-read it — that's the canonical assignment now.
      const raced = await db.experimentAssignment.findUnique({
        where: {
          experimentId_sessionId: {
            experimentId: experiment.id,
            sessionId,
          },
        },
        select: { variant: true },
      });
      if (raced) {
        const match = variants.find((v) => v.name === raced.variant);
        if (match) return { variant: match.name, config: match.config };
      }
      // If we still can't get an assignment, render default.
      return null;
    }

    return { variant: chosen.name, config: chosen.config };
  } catch (error) {
    console.error('[ab] getVariant failed:', error);
    return null;
  }
}

/**
 * Mark a session's assignment as converted.
 *
 * Idempotent — calling it multiple times for the same (experiment,
 * session) is safe; the `converted` flag simply stays true.
 *
 * Silently no-ops if no assignment exists (the visitor was never part
 * of the experiment — e.g. it was inactive when they first loaded the
 * page). Conversion tracking must never throw to the caller.
 */
export async function trackConversion(
  experimentName: string,
  sessionId: string
): Promise<void> {
  if (!experimentName || !sessionId) return;

  try {
    const experiment = await db.experiment.findUnique({
      where: { name: experimentName },
      select: { id: true },
    });
    if (!experiment) return;

    await db.experimentAssignment
      .updateMany({
        where: {
          experimentId: experiment.id,
          sessionId,
          converted: false, // Only update if not already converted —
          // tiny optimization, and avoids unnecessary writes.
        },
        data: { converted: true },
      })
      .catch(() => {
        /* swallow — see comment in getVariant */
      });
  } catch (error) {
    console.error('[ab] trackConversion failed:', error);
  }
}

/**
 * Build the summary for the admin dashboard.
 *
 * Returns one row per experiment with:
 *   - Aggregate totals (assignments, conversions, conversion rate)
 *   - Per-variant breakdown for the bar charts
 *
 * The per-variant breakdown is computed in JS from the assignment rows
 * (rather than via SQL GROUP BY) because:
 *   1. SQLite + Prisma's groupBy is fiddly with multi-column aggregates
 *   2. The variant list itself lives in the JSON-encoded `variants`
 *      column, which SQL can't join against. We need the variant
 *      definitions anyway to honour variants that have 0 assignments.
 *
 * Volume expectation: AstroKalki will have a handful of experiments,
 * each with thousands of assignments at most. Pulling them all into
 * memory and reducing in JS is fine here; for a higher-traffic site
 * this should move to a pre-aggregated rollup.
 */
export async function getExperimentsSummary(): Promise<ExperimentSummary[]> {
  try {
    const experiments = await db.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          select: { variant: true, converted: true },
        },
      },
    });

    return experiments.map((exp) => {
      const variants = parseVariants(exp.variants);

      // Build per-variant counters, seeded with 0 for every defined
      // variant — including ones that have never been assigned.
      const perVariantMap = new Map<
        string,
        { assignments: number; conversions: number }
      >();
      for (const v of variants) {
        perVariantMap.set(v.name, { assignments: 0, conversions: 0 });
      }
      // Also include "orphan" variants — assignments whose variant name
      // is no longer in the definition (admin removed it). These show up
      // in the breakdown so historical data isn't silently lost.
      for (const a of exp.assignments) {
        if (!perVariantMap.has(a.variant)) {
          perVariantMap.set(a.variant, { assignments: 0, conversions: 0 });
        }
        const bucket = perVariantMap.get(a.variant)!;
        bucket.assignments += 1;
        if (a.converted) bucket.conversions += 1;
      }

      const totalAssignments = exp.assignments.length;
      const conversions = exp.assignments.filter((a) => a.converted).length;
      const conversionRate =
        totalAssignments > 0
          ? Math.round((conversions / totalAssignments) * 1000) / 10
          : 0;

      const perVariant = Array.from(perVariantMap.entries()).map(
        ([name, bucket]) => ({
          name,
          assignments: bucket.assignments,
          conversions: bucket.conversions,
          conversionRate:
            bucket.assignments > 0
              ? Math.round((bucket.conversions / bucket.assignments) * 1000) /
                10
              : 0,
        })
      );

      return {
        id: exp.id,
        name: exp.name,
        page: exp.page,
        active: exp.active,
        variants,
        totalAssignments,
        conversions,
        conversionRate,
        perVariant,
        createdAt: exp.createdAt.toISOString(),
        updatedAt: exp.updatedAt.toISOString(),
      };
    });
  } catch (error) {
    console.error('[ab] getExperimentsSummary failed:', error);
    return [];
  }
}
