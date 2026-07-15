import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import AnalyticsDashboard, { type AnalyticsData } from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * /admin/analytics
 *
 * Server-component shell for the analytics dashboard. Auth-gated by the
 * middleware (any unauthenticated visitor is redirected to /admin/login
 * before this component ever renders). Fetches the first 30-day window
 * server-side so the page paints with data on first load; the client
 * component takes over from there and re-fetches whenever the user
 * changes the range selector.
 */

// ─── Initial server-side fetch ───────────────────────────────────────
// We forward the original request's Cookie header so the middleware's
// admin-session check passes on the internal round-trip to /api/admin/analytics.

async function fetchInitialAnalytics(days: number): Promise<AnalyticsData | null> {
  try {
    const h = await headers();
    const cookie = h.get('cookie') || '';
    const host = h.get('host') || 'localhost:3000';
    const proto =
      h.get('x-forwarded-proto') ||
      (host.startsWith('localhost') ? 'http' : 'https');
    const url = `${proto}://${host}/api/admin/analytics?days=${days}`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { cookie },
    });
    if (!res.ok) return null;
    return (await res.json()) as AnalyticsData;
  } catch (err) {
    console.error('Failed to load initial analytics data:', err);
    return null;
  }
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  const initial = await fetchInitialAnalytics(30);

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
                <BarChart3 className="size-3.5" />
                <span>Analytics</span>
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
            Admin · Analytics
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Behaviour & conversion
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Every section view, micro-reading, booking and newsletter signup
            flows into a single funnel. Watch where attention enters, where it
            drops, and which hours of the day AstroKalki resonates loudest.
          </p>
        </div>

        {/* Client dashboard takes it from here */}
        <AnalyticsDashboard initialData={initial} />
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-body-cinematic text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase">
            AstroKalki · Analytics Dashboard
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
