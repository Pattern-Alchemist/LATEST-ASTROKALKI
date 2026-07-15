import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  TrendingUp,
  Users,
  Award,
  Star,
} from "lucide-react";
import { db } from "@/lib/db";
import ReferralRow, { type ReferralRowData } from "./ReferralRow";

/**
 * /admin/referrals — admin referral dashboard.
 *
 * Server component. Reads directly from the DB (auth enforced by middleware
 * on /admin/* paths). Renders:
 *   - Stats: total referrals, total uses, top referrer
 *   - Sortable table of all referrals (default: uses desc)
 *   - Expandable rows revealing each referral's ReferralUse history
 *   - CSV export link
 *
 * Visual language matches /admin/leads + /admin/testimonials + /admin/patterns:
 *   - sticky header with back-link + refresh
 *   - eyebrow + serif H1 title block
 *   - StatCard pattern for totals
 *   - bordered table with hover-highlight
 *   - mt-auto sticky footer
 */

export const dynamic = "force-dynamic";

type SortKey = "uses" | "recent" | "name";

const TABS: { id: SortKey; label: string }[] = [
  { id: "uses", label: "Most used" },
  { id: "recent", label: "Recently used" },
  { id: "name", label: "By name" },
];

interface AdminPageData {
  rows: ReferralRowData[];
  stats: {
    totalReferrals: number;
    totalUses: number;
    topReferrer: {
      code: string;
      referrerName: string;
      uses: number;
    } | null;
    recentReferrals: number; // created in last 30 days
  };
}

async function loadData(sort: SortKey): Promise<AdminPageData> {
  const orderBy =
    sort === "uses"
      ? ([{ uses: "desc" as const }, { createdAt: "desc" as const }])
      : sort === "recent"
        ? ([{ lastUsedAt: "desc" as const }, { createdAt: "desc" as const }])
        : ([{ referrerName: "asc" as const }, { createdAt: "desc" as const }]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [rows, totalReferrals, totalUsesAgg, topRef, recentReferrals] =
    await Promise.all([
      db.referral.findMany({
        orderBy,
        take: 200,
        include: {
          referralUses: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              name: true,
              createdAt: true,
            },
          },
        },
      }),
      db.referral.count(),
      db.referral.aggregate({ _sum: { uses: true } }),
      db.referral.findFirst({
        orderBy: { uses: "desc" },
        select: { code: true, referrerName: true, uses: true },
      }),
      db.referral.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

  const serialized: ReferralRowData[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    referrerName: r.referrerName,
    referrerEmail: r.referrerEmail,
    uses: r.uses,
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    referralUses: r.referralUses.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
    })),
  }));

  return {
    rows: serialized,
    stats: {
      totalReferrals,
      totalUses: totalUsesAgg._sum.uses ?? 0,
      topReferrer:
        topRef && topRef.uses > 0
          ? {
              code: topRef.code,
              referrerName: topRef.referrerName,
              uses: topRef.uses,
            }
          : null,
      recentReferrals,
    },
  };
}

// ─── Stat Card (matches /admin/patterns StatCard visual language) ───────

function StatCard({
  eyebrow,
  value,
  subtitle,
  icon,
}: {
  eyebrow: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-500 p-6">
      <div className="flex items-start justify-between mb-4">
        <p className="text-body-cinematic text-[10px] uppercase tracking-[0.25em] text-[#7a7a7a]">
          {eyebrow}
        </p>
        <div className="text-[#c9a96e]">{icon}</div>
      </div>
      <p className="text-editorial text-3xl sm:text-4xl text-[#f0eee9] mb-2">
        {value}
      </p>
      <p className="text-body-cinematic text-xs text-[#9a9a9a]">{subtitle}</p>
    </div>
  );
}

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sp = await searchParams;
  const sortParam = (sp.sort || "uses") as SortKey;
  const sort: SortKey = TABS.some((t) => t.id === sortParam)
    ? sortParam
    : "uses";

  let data: AdminPageData | null = null;
  try {
    data = await loadData(sort);
  } catch (err) {
    console.error("[admin/referrals] Failed to load data:", err);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#050505]/85 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link
              href="/admin"
              className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="size-3.5" />
              Back to /admin
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="/api/admin/export?type=referrals"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] tracking-[0.3em] uppercase text-[#9a9a9a] border border-white/[0.08] px-3 py-1.5 hover:border-[#c9a96e]/50 hover:text-[#c9a96e] transition-colors flex items-center gap-1.5"
              >
                <Download className="size-3" />
                <span className="hidden sm:inline">Export CSV</span>
              </a>
              <Link
                href={`/admin/referrals?sort=${sort}`}
                className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-3 py-1.5 hover:bg-[#c9a96e]/10 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="size-3" />
                <span className="hidden sm:inline">Refresh</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Title block */}
        <div className="mb-10 sm:mb-14">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Admin · Referrals
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Referral programme
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Every referral code generated on{" "}
            <Link
              href="/refer"
              className="text-[#c9a96e] hover:text-[#f0eee9] transition-colors underline-offset-4 hover:underline"
            >
              /refer
            </Link>{" "}
            lands here. Click a row to see every individual email that used the
            code. The <span className="text-[#cfcabf]">uses</span> counter
            reflects the booking flow&apos;s &ldquo;referred by&rdquo; field too —
            it can be ahead of the tracked-use list.
          </p>
        </div>

        {data ? (
          <>
            {/* ─── Stats row ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
              <StatCard
                eyebrow="Total referrals"
                value={data.stats.totalReferrals}
                subtitle={`${data.stats.recentReferrals} created in last 30 days`}
                icon={<Users className="size-5" />}
              />
              <StatCard
                eyebrow="Total uses"
                value={data.stats.totalUses}
                subtitle="Across all codes"
                icon={<TrendingUp className="size-5" />}
              />
              <StatCard
                eyebrow="Top referrer"
                value={data.stats.topReferrer?.uses ?? 0}
                subtitle={
                  data.stats.topReferrer
                    ? `${data.stats.topReferrer.referrerName} · ${data.stats.topReferrer.code}`
                    : "No referrals used yet"
                }
                icon={<Award className="size-5" />}
              />
              <StatCard
                eyebrow="Avg uses / code"
                value={
                  data.stats.totalReferrals > 0
                    ? (data.stats.totalUses / data.stats.totalReferrals).toFixed(1)
                    : "0.0"
                }
                subtitle="Conversion across all codes"
                icon={<Star className="size-5" />}
              />
            </div>

            {/* ─── Sort tabs ──────────────────────────────────── */}
            <div className="flex gap-2 mb-8 border-b border-white/[0.06] overflow-x-auto">
              {TABS.map((t) => {
                const isActive = sort === t.id;
                return (
                  <Link
                    key={t.id}
                    href={`/admin/referrals?sort=${t.id}`}
                    className={`px-4 py-3 text-[11px] tracking-[0.25em] uppercase font-light transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
                      isActive
                        ? "border-[#c9a96e] text-[#c9a96e]"
                        : "border-transparent text-[#7a7a7a] hover:text-[#f0eee9]"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>

            {/* ─── Table ──────────────────────────────────────── */}
            {data.rows.length === 0 ? (
              <div className="border border-white/[0.04] bg-[#0a0a0a]/40 py-20 text-center">
                <Users className="size-8 text-[#333] mx-auto mb-3" />
                <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
                  No referral codes generated yet. Once visitors start using the
                  form on{" "}
                  <Link
                    href="/refer"
                    className="text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                  >
                    /refer
                  </Link>
                  , their codes will appear here.
                </p>
              </div>
            ) : (
              <div className="border border-white/[0.04] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border-b border-white/[0.04]">
                      <th className="px-4 py-3 font-normal w-8"></th>
                      <th className="px-4 py-3 font-normal">Code</th>
                      <th className="px-4 py-3 font-normal">Referrer</th>
                      <th className="px-4 py-3 font-normal">Email</th>
                      <th className="px-4 py-3 font-normal">Uses</th>
                      <th className="px-4 py-3 font-normal">Last used</th>
                      <th className="px-4 py-3 font-normal">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <ReferralRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── Count + note ───────────────────────────────── */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-[#5a5a5a] tracking-[0.2em] uppercase font-light">
                Showing {data.rows.length} of {data.stats.totalReferrals} referrals
              </p>
              <p className="text-[11px] text-[#5a5a5a] font-light leading-relaxed max-w-md text-right">
                <span className="text-[#c9a96e]">Tip:</span> Click any row to
                expand the per-use history.
              </p>
            </div>
          </>
        ) : (
          <div className="py-24 text-center">
            <p className="text-red-400/80 text-sm mb-4">
              Failed to load referral data.
            </p>
            <Link
              href={`/admin/referrals?sort=${sort}`}
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Link>
          </div>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-body-cinematic text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase">
            AstroKalki · Referral Dashboard
          </p>
          <Link
            href="/admin"
            className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3" />
            Back to admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
