import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import ExperimentManager, {
  type ExperimentSummary,
} from './ExperimentManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * /admin/experiments
 *
 * Server-component shell for the A/B testing dashboard. Auth-gated by
 * the global middleware — unauthenticated visitors are redirected to
 * /admin/login before this component ever renders. Fetches the initial
 * list of experiments server-side so the page paints with data on first
 * load; the client component takes over for create/toggle/delete and
 * re-fetches the summary after each mutation.
 */

async function fetchInitialExperiments(): Promise<ExperimentSummary[]> {
  try {
    const h = await headers();
    const cookie = h.get('cookie') || '';
    const host = h.get('host') || 'localhost:3000';
    const proto =
      h.get('x-forwarded-proto') ||
      (host.startsWith('localhost') ? 'http' : 'https');
    const url = `${proto}://${host}/api/admin/experiments`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { cookie },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { experiments: ExperimentSummary[] };
    return data.experiments || [];
  } catch (err) {
    console.error('Failed to load initial experiments:', err);
    return [];
  }
}

export default async function AdminExperimentsPage() {
  const initial = await fetchInitialExperiments();

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
            <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]">
              <FlaskConical className="size-3.5" />
              <span>Experiments</span>
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
            Admin · A/B Testing
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4 font-serif font-light">
            Experiments & variants
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed font-light">
            Server-side, cookie-sticky A/B tests on the hero headline and
            booking flow. Visitors are assigned to a variant on first page
            load and stay in that bucket for the life of their session
            cookie. Conversions are tracked when they complete the target
            action — booking a session, signing up, etc.
          </p>
        </div>

        {/* Client dashboard takes it from here */}
        <ExperimentManager initialExperiments={initial} />
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-body-cinematic text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase">
            AstroKalki · Experiments Dashboard
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
