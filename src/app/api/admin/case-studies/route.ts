import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Admin case studies API.
 *
 * M9-d — long-form anonymised client journeys (Problem → Pattern → Session → Shift).
 *
 * Auth: admin-gated by middleware (/api/admin/* → 401 without valid admin session,
 * plus Origin/CSRF check). No need to call getServerSession in the handler —
 * middleware has already verified the session by the time we reach here.
 *
 * GET  /api/admin/case-studies?page=1&limit=20&q=&published=
 *      → list with pagination. Includes unpublished drafts (unlike public read).
 *
 * POST /api/admin/case-studies
 *      → create a new case study. Used by /admin/case-studies editor.
 *        Each markdown section can be long (600+ words), so we accept up to 64KB.
 */

// ─── Validation ──────────────────────────────────────────────────────────
// Slugs are URL-safe lowercase kebab-case, max 120 chars. Same convention as
// insights article slugs / atlas pattern slugs.
const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case');

const patternSchema = z.string().trim().min(2).max(80);

const createSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(5).max(200),
  pattern: patternSchema,
  clientInitials: z
    .string()
    .trim()
    .min(1)
    .max(20)
    // first-initial + age format e.g. "R., 34" — or just initials "R."
    .refine((s) => /^[A-Za-z]\.?(,?\s*\d+)?$|^[A-Za-z]{1,3}\.?$/.test(s.trim()), {
      message: 'Use first-initial + optional age (e.g. "R., 34" or "M.")',
    }),
  clientAge: z.number().int().min(0).max(120).nullable().optional(),
  consentGiven: z.boolean().optional().default(false),
  problem: z.string().trim().min(20).max(20000),
  patternSection: z.string().trim().min(20).max(20000),
  session: z.string().trim().min(20).max(20000),
  shift: z.string().trim().min(20).max(20000),
  published: z.boolean().optional().default(false),
});

// ─── GET — list ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20'))
    );
    const skip = (page - 1) * limit;
    const q = searchParams.get('q')?.trim() || null;
    const publishedParam = searchParams.get('published');

    // Build where clause
    const where: {
      OR?: Array<
        | { title: { contains: string } }
        | { clientInitials: { contains: string } }
        | { pattern: { contains: string } }
      >;
      published?: boolean;
    } = {};

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { clientInitials: { contains: q } },
        { pattern: { contains: q } },
      ];
    }

    if (publishedParam === 'true') where.published = true;
    else if (publishedParam === 'false') where.published = false;

    const [caseStudies, total] = await Promise.all([
      db.caseStudy.findMany({
        where,
        orderBy: [{ published: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        // Don't return the full markdown bodies in the list view — they're
        // huge. The list view only needs title, pattern, initials, excerpt.
        select: {
          id: true,
          slug: true,
          title: true,
          pattern: true,
          clientInitials: true,
          clientAge: true,
          consentGiven: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          // Truncate problem to ~280 chars for the excerpt
          problem: true,
        },
      }),
      db.caseStudy.count({ where }),
    ]);

    return NextResponse.json({
      caseStudies: caseStudies.map((c) => ({
        ...c,
        excerpt: c.problem.slice(0, 280).trim(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin case-studies list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case studies' },
      { status: 500 }
    );
  }
}

// ─── POST — create ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      const text = await request.text();
      // Case studies have 4 long markdown sections — allow up to 64KB.
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

    const parsed = createSchema.safeParse(raw);
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

    const d = parsed.data;

    // Enforce slug uniqueness manually (Prisma @unique will throw, but we
    // want a clean 409 instead of a raw P2002 error bubbling up).
    const existing = await db.caseStudy.findUnique({
      where: { slug: d.slug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Slug "${d.slug}" is already in use` },
        { status: 409 }
      );
    }

    const created = await db.caseStudy.create({
      data: {
        slug: d.slug,
        title: d.title,
        pattern: d.pattern,
        clientInitials: d.clientInitials,
        clientAge: d.clientAge ?? null,
        consentGiven: d.consentGiven,
        problem: d.problem,
        patternSection: d.patternSection,
        session: d.session,
        shift: d.shift,
        published: d.published,
      },
    });

    return NextResponse.json({ caseStudy: created }, { status: 201 });
  } catch (error) {
    console.error('Admin case-study create error:', error);
    return NextResponse.json(
      { error: 'Failed to create case study' },
      { status: 500 }
    );
  }
}
