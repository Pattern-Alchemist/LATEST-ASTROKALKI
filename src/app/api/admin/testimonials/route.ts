import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Admin testimonials API.
 *
 * This route is auth-gated by middleware — only authenticated admin sessions
 * can reach these handlers. (See /src/middleware.ts, /api/admin/* guard.)
 *
 * GET  — list all testimonials with optional ?status= filter, paginated.
 *        Returns full records including pending/rejected (unlike the public
 *        GET /api/testimonials which only returns approved+featured).
 *
 * POST — create a testimonial directly (admin seeding). Caller provides an
 *        explicit status (pending|approved|rejected). Used by the brand owner
 *        to seed curated testimonials without going through the public form.
 */

const VALID_STATUSES = ['pending', 'approved', 'rejected'] as const;

const adminCreateSchema = z.object({
  quote: z.string().trim().min(10).max(2000),
  context: z.string().trim().min(3).max(100),
  initials: z.string().trim().min(2).max(20),
  detail: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  email: z
    .string()
    .max(254)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  pattern: z
    .string()
    .max(60)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  avatarUrl: z
    .string()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  videoUrl: z
    .string()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  featured: z.boolean().optional().default(false),
  order: z.number().int().min(0).max(10000).optional().default(0),
  status: z.enum(VALID_STATUSES).optional().default('approved'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50'))
    );
    const skip = (page - 1) * limit;

    // Validate the status filter if provided — ignore junk values silently
    const status =
      statusParam &&
      VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])
        ? (statusParam as (typeof VALID_STATUSES)[number])
        : undefined;

    const where = status ? { status } : {};

    const [testimonials, total] = await Promise.all([
      db.testimonial.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.testimonial.count({ where }),
    ]);

    // ─── Fetch VerifiedReview rows for these testimonials in one query ──
    // There's no Prisma @relation between Testimonial and VerifiedReview,
    // so we resolve the link here and attach a `verified` boolean (plus
    // the linked bookingId + verifiedAt for the admin UI to display).
    // Empty `in: []` would crash Prisma, so guard with .length.
    const ids = testimonials.map((t) => t.id);
    const verifiedReviews = ids.length
      ? await db.verifiedReview.findMany({
          where: { testimonialId: { in: ids } },
          select: { testimonialId: true, bookingId: true, verifiedAt: true },
        })
      : [];
    const verifiedByTestimonial = new Map(
      verifiedReviews.map((v) => [v.testimonialId, v])
    );

    const withVerified = testimonials.map((t) => {
      const v = verifiedByTestimonial.get(t.id);
      return {
        ...t,
        verified: Boolean(v),
        verifiedBookingId: v ? (v as any)?.bookingId ?? null : null,
        verifiedAt: v ? (v as any)?.verifiedAt ?? null : null,
      };
    });

    return NextResponse.json({
      testimonials: withVerified,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin testimonials list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      const text = await request.text();
      if (text.length > 16 * 1024) {
        // Admin bodies can be slightly larger (curated testimonials) but
        // still capped to keep the request sane.
        return NextResponse.json(
          { error: 'Body too large' },
          { status: 413 }
        );
      }
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = adminCreateSchema.safeParse(raw);
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

    const t = parsed.data;

    const testimonial = await db.testimonial.create({
      data: {
        quote: t.quote,
        context: t.context,
        initials: t.initials,
        detail: t.detail || null,
        email: t.email || null,
        pattern: t.pattern || null,
        avatarUrl: t.avatarUrl || null,
        videoUrl: t.videoUrl || null,
        featured: t.featured,
        order: t.order,
        status: t.status,
      },
    });

    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (error) {
    console.error('Admin testimonial create error:', error);
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}
