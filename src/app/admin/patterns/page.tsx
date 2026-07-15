import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Star, Calendar, TrendingUp } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface PatternItem {
  label: string;
  count: number;
}

interface PatternsData {
  totals: {
    microReadings: number;
    bookings: number;
    recentMicroReadings: number;
    recentBookings: number;
  };
  emotionalPatterns: PatternItem[];
  relationshipFrustrations: PatternItem[];
  bookingContexts: PatternItem[];
  bookingDurations: PatternItem[];
}

// ─── Data fetch ─────────────────────────────────────────────────────
// Server component calls the local API route. We construct an absolute URL
// from request headers so this works on any preview domain, not just localhost.

async function fetchPatternsData(): Promise<PatternsData | null> {
  try {
    const h = await headers();
    const host = h.get('host') || 'localhost:3000';
    const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const url = `${proto}://${host}/api/admin/patterns`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PatternsData;
  } catch (err) {
    console.error('Failed to load patterns data:', err);
    return null;
  }
}

// ─── Pretty label helpers ───────────────────────────────────────────
// Pattern keys like "emotional-numbness" and frustration keys like "cant-leave"
// are stored raw in the DB. These maps humanise them for the publisher view.
// Anything unmapped falls through unchanged so we never hide real data.

const PATTERN_LABELS: Record<string, string> = {
  abandonment: 'The Abandonment Loop',
  control: 'The Control Architecture',
  'people-pleasing': 'The Chameleon Pattern',
  'emotional-numbness': 'The Deep Freeze',
  overthinking: 'The Mental Labyrinth',
  'self-doubt': 'The Erosion Pattern',
  heartbreak: 'Heartbreak / Grief',
  sabotage: 'Self-sabotage',
  misunderstood: 'Feeling Misunderstood',
  exhaustion: 'Emotional Exhaustion',
  purpose: 'Loss of Purpose',
  attachment: 'Anxious Attachment',
};

const FRUSTRATION_LABELS: Record<string, string> = {
  trust: "I can't trust them — or myself",
  'cant-leave': "I can't leave, even when I should",
  conflict: 'Every conversation becomes conflict',
  distance: "They're emotionally unreachable",
  repeat: 'I keep dating the same person',
  invisible: 'I feel invisible in the relationship',
};

function prettyLabel(raw: string, map: Record<string, string>): string {
  return map[raw] || raw;
}

// Duration labels: "30" → "30 minutes"
function durationLabel(raw: string): string {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return raw;
  return `${n} minutes`;
}

// ─── Bar visualisation ──────────────────────────────────────────────

function BarRow({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="text-[#cfcabf] text-sm font-light flex-1 truncate">{label}</span>
      <div className="flex-1 h-2 bg-white/[0.04] relative">
        <div
          className="h-full bg-[#c9a96e]/60 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[#c9a96e] font-mono text-xs w-8 text-right">{count}</span>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  eyebrow,
  value,
  subtitle,
  icon,
  delay,
}: {
  eyebrow: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="bg-[#0a0a0a] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-500 p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-body-cinematic text-[10px] uppercase tracking-[0.25em] text-[#7a7a7a]">
          {eyebrow}
        </p>
        <div className="text-[#c9a96e]">{icon}</div>
      </div>
      <p className="text-editorial text-3xl sm:text-4xl text-[#f0eee9] mb-2">{value}</p>
      <p className="text-body-cinematic text-xs text-[#9a9a9a] flex items-center gap-1">
        <TrendingUp className="size-3 text-emerald-400/70" />
        {subtitle}
      </p>
    </div>
  );
}

// ─── Section block (bordered, with eyebrow + subtitle + bar list) ───

function SectionBlock({
  eyebrow,
  subtitle,
  items,
  labelMap,
  emptyMessage,
}: {
  eyebrow: string;
  subtitle: string;
  items: PatternItem[];
  labelMap?: Record<string, string>;
  emptyMessage: string;
}) {
  const maxCount = items.length > 0 ? items[0].count : 0;
  return (
    <section className="border border-white/[0.04] bg-[#0a0a0a]/40 p-6 sm:p-8">
      <div className="mb-6 pb-5 border-b border-white/[0.04]">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light">
          {eyebrow}
        </p>
        <p className="text-[#cfcabf] text-sm sm:text-base font-serif font-light italic">
          “{subtitle}”
        </p>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.02]">
          {items.map((item) => (
            <BarRow
              key={item.label}
              label={labelMap ? prettyLabel(item.label, labelMap) : item.label}
              count={item.count}
              maxCount={maxCount}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default async function AdminPatternsPage() {
  const data = await fetchPatternsData();

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
              <Link
                href="/admin/patterns"
                className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5"
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
        <div className="mb-12 sm:mb-16">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Admin · Patterns
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Pattern data
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Aggregated from micro-diagnosis selections and booking contexts. After 100+ users,
            this data shows what language resonates and which patterns to write more about.
          </p>
        </div>

        {data ? (
          <>
            {/* ─── Totals row ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
              <StatCard
                eyebrow="Total Micro-readings"
                value={data.totals.microReadings}
                subtitle={`${data.totals.recentMicroReadings} in last 30 days`}
                icon={<Star className="size-5" />}
                delay={0}
              />
              <StatCard
                eyebrow="Recent Micro-readings"
                value={data.totals.recentMicroReadings}
                subtitle="Last 30 days"
                icon={<TrendingUp className="size-5" />}
                delay={80}
              />
              <StatCard
                eyebrow="Total Bookings"
                value={data.totals.bookings}
                subtitle={`${data.totals.recentBookings} in last 30 days`}
                icon={<Calendar className="size-5" />}
                delay={160}
              />
              <StatCard
                eyebrow="Recent Bookings"
                value={data.totals.recentBookings}
                subtitle="Last 30 days"
                icon={<TrendingUp className="size-5" />}
                delay={240}
              />
            </div>

            {/* ─── Aggregate sections ─────────────────────────── */}
            <div className="space-y-6 sm:space-y-8">
              <SectionBlock
                eyebrow="Micro-diagnosis · Step 1"
                subtitle="Which pattern feels familiar? — what users actually click"
                items={data.emotionalPatterns}
                labelMap={PATTERN_LABELS}
                emptyMessage="No micro-readings captured yet. The pattern data will populate as users engage with the micro-diagnosis flow."
              />

              <SectionBlock
                eyebrow="Micro-diagnosis · Step 3"
                subtitle="What frustrates you most in relationships?"
                items={data.relationshipFrustrations}
                labelMap={FRUSTRATION_LABELS}
                emptyMessage="No relationship-frustration data yet. This fills in as users complete step 3 of the micro-diagnosis."
              />

              <SectionBlock
                eyebrow="Booking contexts"
                subtitle="What users say they want to work on"
                items={data.bookingContexts}
                emptyMessage="No booking contexts captured yet. Focus-area data appears here as users submit the booking form."
              />

              <SectionBlock
                eyebrow="Session tier"
                subtitle="30 / 60 / 90 minute bookings — proxy for service demand"
                items={data.bookingDurations.map((d) => ({
                  label: durationLabel(d.label),
                  count: d.count,
                }))}
                emptyMessage="No bookings yet. Session-tier distribution fills in as bookings land."
              />
            </div>
          </>
        ) : (
          <div className="py-24 text-center">
            <p className="text-[#c0392b] text-sm mb-3">Failed to load pattern data.</p>
            <Link
              href="/admin/patterns"
              className="btn-outline-gold inline-flex items-center gap-2 px-4 py-2 text-xs"
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
            AstroKalki · Pattern Dashboard
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3" />
              Back to admin
            </Link>
            <Link
              href="/admin/patterns"
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="size-3" />
              Refresh
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
