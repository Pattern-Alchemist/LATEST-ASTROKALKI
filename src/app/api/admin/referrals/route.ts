import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * /api/admin/referrals — admin-gated referral dashboard API.
 *
 * GET : list all referrals with their use counts + recent ReferralUse rows.
 *       Paginated. Supports ?sort=uses|recent|name (default: uses desc) and an
 *       optional ?email= filter (case-insensitive contains match against
 *       referrerEmail — used by the admin dashboard's "find a referrer" search).
 *
 * Auth: enforced by /src/middleware.ts on /api/admin/* — no manual session
 * check needed in this handler.
 */

type SortKey = 'uses' | 'recent' | 'name';

const VALID_SORTS: SortKey[] = ['uses', 'recent', 'name'];

interface AdminReferralRow {
  id: string;
  code: string;
  referrerName: string;
  referrerEmail: string;
  uses: number;
  lastUsedAt: string | null;
  createdAt: string;
  _count: { referralUses: number };
}

interface AdminReferralListResponse {
  referrals: AdminReferralRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    totalReferrals: number;
    totalUses: number;
    topReferrer: {
      code: string;
      referrerName: string;
      uses: number;
    } | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10))
    );
    const sortParam = (searchParams.get('sort') || 'uses') as SortKey;
    const sort: SortKey = VALID_SORTS.includes(sortParam) ? sortParam : 'uses';
    const skip = (page - 1) * limit;

    // Optional email filter — case-insensitive contains. Trim + cap at 254 to
    // keep the query cheap. Empty string is treated as "no filter".
    const emailRaw = (searchParams.get('email') || '').trim().toLowerCase();
    const emailFilter = emailRaw.slice(0, 254);
    const where = emailFilter
      ? { referrerEmail: { contains: emailFilter } }
      : {};

    // Map sort key to Prisma orderBy
    const orderBy =
      sort === 'uses'
        ? [{ uses: 'desc' as const }, { createdAt: 'desc' as const }]
        : sort === 'recent'
          ? [{ lastUsedAt: 'desc' as const }, { createdAt: 'desc' as const }]
          : [{ referrerName: 'asc' as const }, { createdAt: 'desc' as const }];

    const [rows, total, totalReferrals, totalUsesAgg, topRef] = await Promise.all([
      db.referral.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: { select: { referralUses: true } },
        },
      }),
      db.referral.count({ where }),
      // Stats are global — not affected by the email filter, so the publisher
      // still sees programme-wide totals while browsing a specific referrer.
      db.referral.count(),
      db.referral.aggregate({ _sum: { uses: true } }),
      db.referral.findFirst({
        orderBy: { uses: 'desc' },
        select: { code: true, referrerName: true, uses: true },
      }),
    ]);

    const totalUses = totalUsesAgg._sum.uses ?? 0;

    // Serialize Date fields
    const referrals: AdminReferralRow[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      referrerName: r.referrerName,
      referrerEmail: r.referrerEmail,
      uses: r.uses,
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      _count: { referralUses: r._count.referralUses },
    }));

    const response: AdminReferralListResponse = {
      referrals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalReferrals,
        totalUses,
        topReferrer: topRef && topRef.uses > 0
          ? {
              code: topRef.code,
              referrerName: topRef.referrerName,
              uses: topRef.uses,
            }
          : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[admin/referrals] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}
