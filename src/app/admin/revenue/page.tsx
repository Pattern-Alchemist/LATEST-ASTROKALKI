import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import RevenueDashboard, {
  type RevenueData,
} from './RevenueDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Revenue · Admin · AstroKalki',
  robots: { index: false, follow: false },
};

/**
 * /admin/revenue
 *
 * Server-component shell for the revenue & cohort analytics dashboard.
 * Auth-gated by the central middleware (any unauthenticated visitor is
 * redirected to /admin/login before this component renders). Fetches
 * the default 30-day window server-side so the page paints with data
 * on first load; the client component re-fetches whenever the user
 * changes the range selector.
 *
 * Visual structure mirrors /admin/analytics (sticky header, eyebrow +
 * serif title block, mt-auto footer) so the two dashboards feel like
 * siblings in the same admin suite.
 */

async function fetchInitialRevenue(days: number): Promise<RevenueData | null> {
  try {
    const h = await headers();
    const cookie = h.get('cookie') || '';
    const host = h.get('host') || 'localhost:3000';
    const proto =
      h.get('x-forwarded-proto') ||
      (host.startsWith('localhost') ? 'http' : 'https');
    const url = `${proto}://${host}/api/admin/revenue?days=${days}`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { cookie },
    });
    if (!res.ok) return null;
    return (await res.json()) as RevenueData;
  } catch (err) {
    console.error('Failed to load initial revenue data:', err);
    return null;
  }
}

export default async function AdminRevenuePage() {
  const initial = await fetchInitialRevenue(30);

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
              <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]">
                <TrendingUp className="size-3.5" />
                <span>Revenue</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Title block */}
        <div className="mb-12 sm:mb-16">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Admin · Revenue
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Revenue, churn &amp; cohorts
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            The business layer beneath the behaviour layer. Monthly
            recurring revenue, lifetime value, churn, signup-cohort
            retention, and the full visitor → member conversion funnel
            across every channel AstroKalki monetises.
          </p>
        </div>

        {/* Client dashboard takes it from here */}
        <RevenueDashboard initialData={initial} />
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-body-cinematic text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase">
            AstroKalki · Revenue Dashboard
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
