import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import SignOutButton from "@/components/astrokalki/sign-out-button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ATLAS_PATTERNS, getAtlasPattern } from "@/lib/content/patterns/atlas";
import type { ProgressData } from "@/lib/account/progress-types";
import ProgressCharts from "./ProgressCharts";
import MilestoneGrid from "./MilestoneGrid";
import ActivityTimeline from "./ActivityTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your journey — AstroKalki",
  description:
    "Your member progress dashboard — patterns identified, sessions completed, journal streaks, chart analyses, portraits, milestones.",
  alternates: { canonical: "https://astrokalki.com/account/progress" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your journey — AstroKalki",
    description:
      "Your member progress dashboard — patterns, sessions, journal streaks, and milestones.",
    type: "website",
    url: "https://astrokalki.com/account/progress",
    siteName: "AstroKalki",
  },
};

/**
 * /account/progress — the member-facing "your journey" dashboard.
 *
 * Auth-gated: if there is no NextAuth session, redirect to /account (the
 * member-portal sign-in page). Once signed in, the page server-fetches the
 * aggregated progress payload from /api/account/progress and renders the
 * full dashboard: 4 stat cards, milestone grid, patterns list, journal
 * mood calendar, growth-over-time area chart + pattern donut, and a recent
 * activity timeline.
 *
 * Design system: strict AstroKalki dark editorial palette. Background
 * #050505, gold #c9a96e + derivatives, text #f0eee9/#9a9a9a/#7a7a7a, dark
 * grid #2a2a2a, no blue/indigo anywhere. Stat numbers in Playfair
 * (text-4xl), labels in Cinzel (text-[10px] tracking-[0.3em] uppercase).
 */

// ─── Server-side fetch of progress data ──────────────────────────────
// We forward the request's Cookie header so the NextAuth session cookie
// is sent on the internal round-trip to /api/account/progress.

async function fetchProgress(): Promise<ProgressData | null> {
  try {
    const h = await headers();
    const cookie = h.get("cookie") || "";
    const host = h.get("host") || "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ||
      (host.startsWith("localhost") ? "http" : "https");
    const url = `${proto}://${host}/api/account/progress`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!res.ok) return null;
    return (await res.json()) as ProgressData;
  } catch (err) {
    console.error("[/account/progress] failed to load progress data:", err);
    return null;
  }
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function ProgressPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    // Not signed in — bounce to the member portal (sign-in form).
    redirect("/account");
  }

  const data = await fetchProgress();
  if (!data) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light">
              Something went wrong
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
              We couldn&apos;t load your journey.
            </h1>
            <p className="text-sm text-[#9a9a9a] font-light leading-relaxed mb-8">
              The progress data didn&apos;t come through. Please try again —
              if it keeps happening, reply to any email from us.
            </p>
            <Link
              href="/account"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Back to account
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const earnedMilestones = data.milestones.filter((m) => m.earned).length;

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
      <Header email={session.user.email} />

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-10 py-12 sm:py-16">
        {/* ─── Title block ─────────────────────────────────────────── */}
        <div className="mb-12 sm:mb-16">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Member · Journey
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-5">
            Your journey.
          </h1>
          <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            The work, made visible. Every pattern you&apos;ve identified,
            every session completed, every journal streak — gathered in one
            place so the shape of your attention becomes legible.
          </p>
          {data.memberSince && (
            <p className="mt-4 text-[11px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
              Member since {formatLongDate(data.memberSince)} ·{" "}
              <span className="text-[#c9a96e]/70">
                {data.memberDays} {data.memberDays === 1 ? "day" : "days"}
              </span>
            </p>
          )}
        </div>

        {/* ─── Stat cards (4) ─────────────────────────────────────── */}
        <section className="mb-16 sm:mb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              label="Sessions"
              value={data.sessionsCompleted}
              suffix={data.sessionsTotal > 0 ? ` / ${data.sessionsTotal}` : ""}
              hint={
                data.nextSession
                  ? `Next: ${formatShortDate(data.nextSession.scheduledAt)}`
                  : "No upcoming sessions"
              }
            />
            <StatCard
              label="Patterns Identified"
              value={data.patternsIdentified.length}
              suffix={
                data.distinctPatternsIdentified > 0
                  ? ` · ${data.distinctPatternsIdentified} distinct`
                  : ""
              }
              hint={
                data.patternsIdentified.length > 0
                  ? `Last: ${formatShortDate(data.patternsIdentified[0].date)}`
                  : "Begin a micro-reading"
              }
            />
            <StatCard
              label="Journal Streak"
              value={data.journalStreak}
              suffix={data.journalStreak === 1 ? " day" : " days"}
              hint={
                data.journalTotal > 0
                  ? `${data.journalTotal} ${data.journalTotal === 1 ? "entry" : "entries"} total`
                  : "Write your first entry"
              }
            />
            <StatCard
              label="Member Days"
              value={data.memberDays}
              hint={
                data.memberDays >= 30
                  ? "Month One — earned"
                  : `${30 - data.memberDays} days to Month One`
              }
            />
          </div>
        </section>

        {/* ─── Milestones ─────────────────────────────────────────── */}
        <section className="mb-16 sm:mb-20">
          <SectionEyebrow
            index="I."
            label="Milestones"
            right={`${earnedMilestones} earned`}
          />
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-8">
            The recognitions.
          </h2>
          <MilestoneGrid milestones={data.milestones} />
        </section>

        {/* ─── Patterns you've identified ─────────────────────────── */}
        <section className="mb-16 sm:mb-20">
          <SectionEyebrow index="II." label="Patterns identified" />
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            What&apos;s been named.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            Each pattern you&apos;ve identified — through a micro-reading or
            by uploading your birth chart — links to its Atlas page so you
            can return to the work whenever it calls.
          </p>

          {data.patternsIdentified.length > 0 ? (
            <PatternsList patterns={data.patternsIdentified} />
          ) : (
            <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
              <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                No patterns identified yet. A micro-reading is the fastest
                way to meet yours — six quiet questions, one pattern named.
              </p>
              <Link
                href="/patterns/atlas"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Visit the Pattern Atlas
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}
        </section>

        {/* ─── Journal activity ───────────────────────────────────── */}
        <section className="mb-16 sm:mb-20">
          <SectionEyebrow
            index="III."
            label="Journal activity"
            right={`${data.journalStreak}-day streak`}
          />
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            The thirty-day weather.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            A summary view of your last thirty days of journaling — the
            moods you&apos;ve moved through, the days you showed up.
          </p>

          <JournalMoodCalendar
            moodDays={data.journalMood30}
            streak={data.journalStreak}
            longestStreak={data.longestJournalStreak}
            total={data.journalTotal}
            last30={data.journalLast30}
          />
        </section>

        {/* ─── Growth over time + pattern donut ───────────────────── */}
        <section className="mb-16 sm:mb-20">
          <SectionEyebrow index="IV." label="The shape of attention" />
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            Your growth over time.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            Six months of activity, gathered. The charts below show where
            your attention has been — and which patterns return.
          </p>
          <ProgressCharts
            monthlyActivity={data.monthlyActivity}
            patternDistribution={data.patternDistribution}
          />
        </section>

        {/* ─── Recent activity ────────────────────────────────────── */}
        <section className="mb-16 sm:mb-20">
          <SectionEyebrow index="V." label="Recent activity" />
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-8">
            The last ten.
          </h2>
          <ActivityTimeline items={data.recentActivity} />
        </section>

        {/* ─── Footer of the page ─────────────────────────────────── */}
        <div className="pt-10 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              Continue the work
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
              Return to the member portal to manage your membership,
              recordings, and email preferences.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="size-3" />
            Back to account
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Header ──────────────────────────────────────────────────────────

function Header({ email }: { email?: string }) {
  return (
    <header className="border-b border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10 sm:py-14">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Account", href: "/account" },
              { label: "Progress" },
            ]}
          />
          {email ? <SignOutButton /> : null}
        </div>
      </div>
    </header>
  );
}

// ─── Section eyebrow ─────────────────────────────────────────────────

function SectionEyebrow({
  index,
  label,
  right,
}: {
  index: string;
  label: string;
  right?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 flex-wrap">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 font-light">
        <span className="font-mono mr-3">{index}</span>
        {label}
      </p>
      {right && (
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light font-mono">
          {right}
        </p>
      )}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="bg-white/[0.015] border border-white/[0.04] p-6 flex flex-col justify-between min-h-[140px]">
      <p
        className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] font-light"
        style={{ fontFamily: "var(--font-cinzel)" }}
      >
        {label}
      </p>
      <div className="my-4">
        <p className="text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] leading-none">
          {value}
          {suffix && (
            <span className="text-base text-[#7a7a7a] font-light ml-1">
              {suffix}
            </span>
          )}
        </p>
      </div>
      {hint && (
        <p className="text-[11px] text-[#5a5a5a] font-light leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Patterns list (visual list, links to Atlas) ─────────────────────

function PatternsList({
  patterns,
}: {
  patterns: ProgressData["patternsIdentified"];
}) {
  // Build a slug → Atlas pattern lookup. The `pattern` field on the API
  // response is the raw string (e.g. "the-rescuer" or "The Rescuer Pattern").
  // Try exact-slug match first; fall back to a normalized title match.
  const bySlug: Record<string, (typeof ATLAS_PATTERNS)[number]> = {};
  const byNameLower: Record<string, (typeof ATLAS_PATTERNS)[number]> = {};
  for (const p of ATLAS_PATTERNS) {
    bySlug[p.slug] = p;
    byNameLower[p.name.toLowerCase()] = p;
  }

  function resolveAtlas(raw: string) {
    const slug = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (bySlug[slug]) return bySlug[slug];
    if (byNameLower[raw.trim().toLowerCase()]) return byNameLower[raw.trim().toLowerCase()];
    // Try as a partial match against slug
    const partial = ATLAS_PATTERNS.find(
      (p) => p.slug.includes(slug) || slug.includes(p.slug)
    );
    if (partial) return partial;
    // Try getAtlasPattern directly (handles exact slug matches)
    return getAtlasPattern(slug);
  }

  return (
    <div className="border-t border-white/[0.06]">
      {patterns.map((p, idx) => {
        const atlas = resolveAtlas(p.pattern);
        const href = atlas ? `/patterns/atlas/${atlas.slug}` : "/patterns/atlas";
        const label = atlas ? atlas.name : prettyPattern(p.pattern);
        return (
          <Link
            key={`${p.pattern}-${idx}`}
            href={href}
            className="block py-5 border-b border-white/[0.06] hover:bg-white/[0.015] -mx-3 px-3 transition-colors group"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-baseline">
              <div className="sm:col-span-1">
                <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/40 font-mono">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="sm:col-span-7">
                <p className="text-base sm:text-lg font-serif text-[#f0eee9] font-light group-hover:text-[#c9a96e] transition-colors">
                  {label}
                </p>
                {atlas?.tagline && (
                  <p className="mt-0.5 text-xs text-[#7a7a7a] font-light italic leading-relaxed">
                    {atlas.tagline}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
                  {p.source === "chart-analysis" ? "Chart" : "Micro-reading"}
                </p>
              </div>
              <div className="sm:col-span-2 sm:text-right">
                <p className="text-xs text-[#7a7a7a] font-mono">
                  {formatShortDate(p.date)}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Journal mood calendar (summary view) ────────────────────────────

const MOOD_COLORS: Record<string, string> = {
  heavy: "#5a4a2e",
  numb: "#3a3a3a",
  anxious: "#8a7350",
  clear: "#c9a96e",
  angry: "#a0563a",
  tender: "#e2c98f",
};

function JournalMoodCalendar({
  moodDays,
  streak,
  longestStreak,
  total,
  last30,
}: {
  moodDays: ProgressData["journalMood30"];
  streak: number;
  longestStreak: number;
  total: number;
  last30: number;
}) {
  if (total === 0) {
    return (
      <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
        <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
          No journal entries yet. The journal lives inside the member
          portal — a few quiet minutes a day, and the weather of your
          inner life starts to become legible.
        </p>
        <Link
          href="/account#journal"
          className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
        >
          Begin your journal
          <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.015] border border-white/[0.04] p-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pb-6 mb-6 border-b border-white/[0.04]">
        <CalendarStat label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
        <CalendarStat label="Longest streak" value={`${longestStreak} ${longestStreak === 1 ? "day" : "days"}`} />
        <CalendarStat label="Last 30 days" value={`${last30} ${last30 === 1 ? "entry" : "entries"}`} />
        <CalendarStat label="Total" value={`${total} ${total === 1 ? "entry" : "entries"}`} />
      </div>

      {/* 30-day grid — 6 rows of 5 (like a calendar grid) on small screens,
          one long row on large. We'll do a 5-col grid so each week reads
          as a column of 6 days. */}
      <div className="mb-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] font-light mb-3" style={{ fontFamily: "var(--font-cinzel)" }}>
          Last 30 days
        </p>
        <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
          {moodDays.map((day) => {
            const color = day.mood ? MOOD_COLORS[day.mood] || "#2a2a2a" : "#0a0a0a";
            const filled = !!day.mood;
            return (
              <div
                key={day.date}
                title={filled ? `${day.date} — ${day.mood}` : day.date}
                className="aspect-square rounded-sm border"
                style={{
                  background: color,
                  borderColor: filled ? "rgba(201,169,110,0.18)" : "rgba(255,255,255,0.04)",
                  opacity: filled ? 0.95 : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Mood legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/[0.04]">
        {Object.entries(MOOD_COLORS).map(([mood, color]) => (
          <div key={mood} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: color }}
            />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
              {mood}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm border border-white/[0.04]"
            style={{ background: "#0a0a0a" }}
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
            No entry
          </span>
        </div>
      </div>
    </div>
  );
}

function CalendarStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light mb-1" style={{ fontFamily: "var(--font-cinzel)" }}>
        {label}
      </p>
      <p className="text-xl font-serif text-[#f0eee9] font-light">{value}</p>
    </div>
  );
}

// ─── Date helpers ────────────────────────────────────────────────────

function formatLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function prettyPattern(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
