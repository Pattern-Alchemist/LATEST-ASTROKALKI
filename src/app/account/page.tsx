import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import SignInForm from "@/components/astrokalki/sign-in-form";
import SignOutButton from "@/components/astrokalki/sign-out-button";
import PortalLink from "@/components/astrokalki/portal-link";
import PreferencesForm from "@/components/astrokalki/preferences-form";
import AiChat from "@/components/astrokalki/ai-chat";
import RecordingsList, {
  type AccountRecording,
} from "@/app/account/RecordingsList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";
import {
  getTodaysTransits,
  formatTransitDegree,
  transitPlanetGlyph,
  transitPlanetVedicName,
  TRANSIT_PLANET_ORDER,
  retrogradeCount,
  type TransitData,
} from "@/lib/astrology/transits";
import { ZODIAC_SIGNS } from "@/lib/astrology/zodiac";

/**
 * /account — the AstroKalki member portal.
 *
 * Two states, both server-rendered:
 *
 *   ─── Not signed in ─────────────────────────────────────────────────────
 *   Renders the magic-link sign-in form. The form POSTs to NextAuth's
 *   /api/auth/signin/email; NextAuth sends the branded magic-link email
 *   via the sendVerificationRequest configured in /src/lib/auth.ts. After
 *   the user clicks the link, they land back on /account signed in.
 *
 *   ─── Signed in ─────────────────────────────────────────────────────────
 *   Renders four panels:
 *     I.   Membership status — plan, current period end, cancel-at-period flag
 *     II.  Subscription management — Stripe Billing Portal launcher
 *     III. Session history — recent bookings tied to this email
 *     IV.  Email preferences — drip / session / blog toggles
 *
 * The page reads everything directly from the database (server component).
 * The /api/stripe/usage route exists as a client-refresh fallback for when
 * the user returns from Stripe with ?status=success or ?status=portal.
 */

export const metadata: Metadata = {
  title: "Account — AstroKalki",
  description:
    "AstroKalki member portal — manage your membership, view your session history, and tune your email preferences.",
  alternates: { canonical: "https://astrokalki.com/account" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "AstroKalki Member Portal",
    description: "Manage your membership, sessions, and email preferences.",
    type: "website",
    url: "https://astrokalki.com/account",
    siteName: "AstroKalki",
  },
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  cancelled: "Cancelled",
  expired: "Expired",
};

const STATUS_COLOR: Record<string, string> = {
  active: "text-[#c9a96e]",
  cancelled: "text-[#a58a54]",
  expired: "text-[#5a5a5a]",
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions).catch(() => null);

  // ─── Not signed in ─────────────────────────────────────────────────────
  if (!session?.user?.email) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
        <header className="border-b border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
            <div className="mb-8">
              <Breadcrumbs
                items={[{ label: "Home", href: "/" }, { label: "Account" }]}
              />
            </div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
              Member portal
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
              Sign in to your account.
            </h1>
            <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              Enter the email tied to your membership. We&apos;ll send a one-time sign-in link — no password to remember, no account to create. The membership, sessions, and preferences live on the other side.
            </p>
          </div>
        </header>

        <section className="py-16 sm:py-24 px-6 sm:px-10">
          <div className="max-w-3xl mx-auto">
            <div className="border-t border-white/[0.06] pt-12">
              <SignInForm />
            </div>

            <div className="mt-16 pt-10 border-t border-white/[0.04]">
              <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
                Not a member yet?
              </p>
              <p className="text-base text-[#cfcabf] font-light leading-[1.8] mb-6 max-w-md">
                Membership starts at ₹999/month — recurring sessions, recording archive, Pattern Atlas access, and priority booking.
              </p>
              <Link
                href="/membership"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                See membership options
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ─── Signed in ─────────────────────────────────────────────────────────
  const email = session.user.email;
  const userId = (session.user as { id?: string }).id;
  const name = session.user.name || email.split("@")[0];

  // Parallel data fetch: membership + bookings + chart analyses + birth charts + recordings + pattern portraits + journal entries + newsletter prefs.
  const [membership, bookings, chartAnalyses, birthCharts, recordings, portraits, journalAgg, newsletter] = await Promise.all([
    db.membership.findFirst({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          { email },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
        stripeCustomerId: true,
      },
    }),
    db.booking.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        duration: true,
        price: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        contexts: true,
      },
    }),
    db.chartAnalysis.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        imageUrl: true,
        analysis: true,
        identifiedPatterns: true,
        createdAt: true,
      },
    }),
    // ─── Birth charts (M10-a) — calculated Vedic charts the user has
    //     cast via /birth-chart. Stored against the email so members
    //     can revisit them. Limited to 6 most recent to keep the page
    //     payload light (each SVG is ~5KB inline).
    db.birthChart.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        svgChart: true,
        createdAt: true,
      },
    }),
    db.recordedReading.findMany({
      where: {
        booking: { email },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        duration: true,
        price: true,
        createdAt: true,
        booking: {
          select: {
            name: true,
            email: true,
            scheduledAt: true,
          },
        },
      },
    }),
    db.patternPortrait.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        pattern: true,
        imageUrl: true,
        createdAt: true,
      },
    }),
    // Journal aggregate — total count + most recent entry date.
    db.journalEntry
      .aggregate({
        where: { email },
        _count: { _all: true },
        _max: { date: true },
      })
      .catch(() => ({ _count: { _all: 0 }, _max: { date: null } })),
    db.newsletter.findUnique({
      where: { email },
      select: {
        prefSessions: true,
        prefBlog: true,
        prefDrip: true,
        optedOut: true,
      },
    }),
  ]).catch(() => [
    null,
    [],
    [],
    [],
    [],
    [],
    { _count: { _all: 0 }, _max: { date: null } },
    null,
  ] as const);

  // ─── Today's transits (M10-b/c) — fetched separately so a transient
  //     ephemeris failure doesn't break the rest of the page. The fetch
  //     hits the DB cache (TransitCache) first, so it's cheap.
  let todaysTransits: TransitData | null = null;
  try {
    todaysTransits = await getTodaysTransits();
  } catch (err) {
    console.error('[/account] transit fetch failed (non-fatal):', err);
    todaysTransits = null;
  }

  const accountRecordings: AccountRecording[] = (recordings || []).map((r) => ({
    id: r.id,
    title: r.title,
    duration: r.duration,
    price: r.price,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    booking: r.booking
      ? {
          name: r.booking.name,
          email: r.booking.email,
          scheduledAt:
            r.booking.scheduledAt instanceof Date
              ? r.booking.scheduledAt.toISOString()
              : r.booking.scheduledAt,
        }
      : null,
  }));

  const activeMembership = membership && membership.status === "active";

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Account" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Member portal
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Welcome back, <span className="text-[#c9a96e] italic">{name}</span>.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Signed in as <span className="text-[#cfcabf]">{email}</span>. This is your private portal — membership status, subscription management, session history, and email preferences.
          </p>
          <div className="mt-8">
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        {/* ─── Ask AstroKalki — AI assistant (member exclusive) ───────────── */}
        {/* The killer feature of the portal. Surfaced at the top so members
            see it before the account-management panels below. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            AI Assistant · Member exclusive
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            Ask AstroKalki.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-6">
            An AI trained on the 10 Atlas patterns and 25 essays — available
            24/7. Ask about the loops you can&apos;t break, the partners who
            keep returning, the feelings that have no name. The voice is
            direct, second-person, no mystical jargon. Not prediction.
            Pattern recognition.
          </p>
          <div className="mb-6">
            <Link
              href="/ask-astrokalki"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Open full chat experience
              <span>→</span>
            </Link>
          </div>
          {/* Suspense boundary required because AiChat uses useSearchParams
              (Next.js 16 static-render guard). */}
          <Suspense
            fallback={
              <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-lg h-[640px] flex items-center justify-center">
                <p className="text-[11px] text-[#5a5a5a] font-light tracking-wide">
                  Loading chat…
                </p>
              </div>
            }
          >
            <AiChat
              isAuthenticated
              email={email}
              variant="embedded"
            />
          </Suspense>
        </section>

        {/* ─── I. Membership status ─────────────────────────────────────── */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">I.</span>
            Membership
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-8">
            Your current status.
          </h2>

          {membership ? (
            <div className="border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-white/[0.06]">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                    Plan
                  </p>
                  <p className="text-xl font-serif text-[#f0eee9] font-light capitalize">
                    {membership.plan}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                    Status
                  </p>
                  <p
                    className={`text-xl font-serif font-light ${STATUS_COLOR[membership.status] || "text-[#9a9a9a]"}`}
                  >
                    {STATUS_LABEL[membership.status] || membership.status}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                    {membership.cancelAtPeriodEnd ? "Cancels at" : "Renews on"}
                  </p>
                  <p className="text-base text-[#cfcabf] font-light">
                    {formatDate(membership.currentPeriodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                    Member since
                  </p>
                  <p className="text-base text-[#cfcabf] font-light">
                    {formatDate(membership.createdAt)}
                  </p>
                </div>
              </div>

              {membership.cancelAtPeriodEnd && (
                <p className="py-6 text-sm text-[#a58a54]/80 font-light leading-[1.7] border-b border-white/[0.06]">
                  Your membership is set to cancel at the end of the current period. You&apos;ll keep access until {formatDate(membership.currentPeriodEnd)}, after which it will expire. You can reverse this from the billing portal below.
                </p>
              )}

              {!activeMembership && (
                <div className="py-8 border-b border-white/[0.06]">
                  <p className="text-base text-[#cfcabf] font-light leading-[1.8] mb-6">
                    Your membership is no longer active. You can re-subscribe at any time — your recording archive and Atlas access remain available.
                  </p>
                  <Link
                    href="/membership"
                    className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                  >
                    Re-subscribe
                    <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-white/[0.06] py-8 border-b border-white/[0.06]">
              <p className="text-base text-[#cfcabf] font-light leading-[1.8] mb-6 max-w-2xl">
                You don&apos;t have a membership yet. Membership unlocks recurring sessions, the recording archive, Pattern Atlas access, and priority booking.
              </p>
              <Link
                href="/membership"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Become a member
                <span>→</span>
              </Link>
            </div>
          )}
        </section>

        {/* ─── II. Subscription management ──────────────────────────────── */}
        {activeMembership && (
          <section className="mb-20">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              <span className="font-mono mr-3">II.</span>
              Subscription
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
              Manage your subscription.
            </h2>
            <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
              Update your payment method, change plans, switch between monthly and annual, or cancel — all through the secure Stripe billing portal. You&apos;ll return to this page when you&apos;re done.
            </p>
            <PortalLink />
          </section>
        )}

        {/* ─── III. Session history ─────────────────────────────────────── */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "III." : "II."}</span>
            Session history
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-8">
            Your recent bookings.
          </h2>

          {bookings && bookings.length > 0 ? (
            <div className="border-t border-white/[0.06]">
              {bookings.map((booking, idx) => {
                let contexts: string[] = [];
                try {
                  const parsed = JSON.parse(booking.contexts);
                  if (Array.isArray(parsed)) contexts = parsed;
                } catch {
                  // ignore — contexts stays []
                }
                return (
                  <div
                    key={booking.id}
                    className="py-6 border-b border-white/[0.06] grid grid-cols-1 sm:grid-cols-12 gap-4"
                  >
                    <div className="sm:col-span-1">
                      <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/40 font-mono">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="sm:col-span-5">
                      <p className="text-base text-[#f0eee9] font-serif font-light mb-1">
                        {booking.duration} minutes
                      </p>
                      <p className="text-xs text-[#7a7a7a] font-light tracking-wide">
                        Booked on {formatDateTime(booking.createdAt)}
                        {booking.scheduledAt
                          ? ` · Scheduled for ${formatDateTime(booking.scheduledAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="sm:col-span-3">
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 font-light">
                        Status
                      </p>
                      <p className="text-sm text-[#cfcabf] font-light capitalize">
                        {booking.status}
                      </p>
                    </div>
                    <div className="sm:col-span-3">
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1 font-light">
                        Investment
                      </p>
                      <p className="text-sm text-[#c9a96e] font-light">
                        {booking.price}
                      </p>
                    </div>
                    {contexts.length > 0 && (
                      <div className="sm:col-span-11 sm:col-start-2 mt-2">
                        <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-2 font-light">
                          Focus areas
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {contexts.map((c) => (
                            <span
                              key={c}
                              className="text-[11px] text-[#7a7a7a] border border-white/[0.06] px-3 py-1 font-light"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
              <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                No sessions booked yet under this email. When you book your first session, it&apos;ll appear here.
              </p>
              <Link
                href="/#booking"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Book a session
                <span>→</span>
              </Link>
            </div>
          )}
        </section>

        {/* ─── Chart analyses (VLM-powered birth chart readings) ───────── */}
        {/* Placed between session history and recordings so members see the
            pattern-recognition work they've done before the session audio.
            Roman numeral is dynamic based on whether the subscription
            management section (active members only) is shown. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "IV." : "III."}</span>
            Chart analyses
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            Your pattern-recognition readings.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            Every chart you upload to the chart-reading tool is archived here.
            The model&apos;s analysis and the identified Atlas patterns stay
            with your account so you can revisit them — and track how your
            patterns shift over time.
          </p>

          {chartAnalyses && chartAnalyses.length > 0 ? (
            <div className="border-t border-white/[0.06]">
              {chartAnalyses.map((analysis, idx) => {
                let identifiedPatterns: string[] = [];
                try {
                  const parsed = JSON.parse(analysis.identifiedPatterns);
                  if (Array.isArray(parsed)) {
                    identifiedPatterns = parsed.filter(
                      (s): s is string => typeof s === "string"
                    );
                  }
                } catch {
                  // Malformed JSON in DB — leave empty.
                }
                return (
                  <div
                    key={analysis.id}
                    className="py-6 border-b border-white/[0.06] grid grid-cols-1 sm:grid-cols-12 gap-4"
                  >
                    <div className="sm:col-span-1">
                      <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/40 font-mono">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="sm:col-span-7">
                      <p className="text-xs text-[#7a7a7a] font-light tracking-wide mb-2">
                        {formatDateTime(analysis.createdAt)}
                      </p>
                      <p
                        className="text-sm text-[#cfcabf] font-light leading-[1.8] line-clamp-3"
                        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                      >
                        {analysis.analysis}
                      </p>
                    </div>
                    <div className="sm:col-span-4">
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-2 font-light">
                        Patterns
                      </p>
                      {identifiedPatterns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {identifiedPatterns.map((slug) => (
                            <Link
                              key={slug}
                              href={`/patterns/atlas/${slug}`}
                              className="text-[10px] text-[#c9a96e] border border-[#c9a96e]/30 hover:bg-[#c9a96e]/10 px-3 py-1 font-light rounded-full uppercase tracking-[0.15em] transition-colors"
                              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                            >
                              {slug
                                .replace(/^the-/, "")
                                .replace(/-/g, " ")}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5a5a5a] font-light italic">
                          No patterns identified
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
              <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                No chart analyses yet. Upload a birth chart image to get a
                pattern-recognition reading from the model.
              </p>
              <Link
                href="/chart-reading"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Upload your chart
                <span>→</span>
              </Link>
            </div>
          )}
        </section>

        {/* ─── Birth charts (M10-a) — ephemeris-based Vedic charts ───── */}
        {/* Calculated via /birth-chart using the astronomy-engine
            ephemeris. Stored against the email so members can revisit
            them. Roman numeral is dynamic based on whether the
            subscription-management section (active members only) is
            shown. Placed between chart analyses and recordings so the
            two chart sections sit together. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "V." : "IV."}</span>
            Birth charts
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            Charts you&apos;ve cast.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            Vedic charts calculated from the JPL planetary ephemeris,
            using the Lahiri ayanamsa. Each one is a snapshot of the
            sky at the moment of birth — sidereal positions, Ascendant,
            and the twelve whole-sign houses. Cast a new chart from the
            public calculator; the results land here.
          </p>

          {birthCharts && birthCharts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {birthCharts.map((chart) => {
                const created =
                  chart.createdAt instanceof Date
                    ? chart.createdAt
                    : new Date(chart.createdAt);
                return (
                  <Link
                    key={chart.id}
                    href={`/birth-chart`}
                    className="group block border border-[#c9a96e]/20 p-4 bg-[#0a0a0a] hover:border-[#c9a96e]/40 transition-colors duration-300"
                  >
                    <div
                      className="aspect-square w-full bg-[#050505] mb-4 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: chart.svgChart ?? "" }}
                      aria-label={`Birth chart for ${chart.name}`}
                    />
                    <p
                      className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] mb-1 font-light"
                      style={{ fontFamily: "var(--font-cinzel)" }}
                    >
                      {chart.birthPlace || "—"}
                    </p>
                    <p className="text-[11px] tracking-wide text-[#7a7a7a] font-mono">
                      {chart.birthDate} · {chart.birthTime}
                    </p>
                    <p className="text-[10px] tracking-wide text-[#5a5a5a] font-mono mt-1">
                      Cast {created.toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
              <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                No birth charts yet. Enter your date, time, and place of
                birth in the calculator — the chart is computed from
                the JPL ephemeris and saved here against your email.
              </p>
              <Link
                href="/birth-chart"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              >
                Cast my birth chart
                <span>→</span>
              </Link>
            </div>
          )}
        </section>

        {/* ─── "Your recordings" section ────────────────────────────────── */}
        {/* Placed between chart analyses and email preferences so members
            who have completed a session can find the audio right after the
            booking record. Roman numeral is dynamic based on whether the
            subscription-management section (active members only) is shown. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "VI." : "V."}</span>
            Your recordings
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            Session audio, when it&apos;s ready.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            Recorded sessions attached to your bookings appear here. Playback
            is gated by a signed link issued to your email — only you can
            stream them. Tokens expire after 24 hours; click play again to
            refresh access.
          </p>

          <RecordingsList recordings={accountRecordings} memberEmail={email} />
        </section>

        {/* ─── Pattern portraits ─────────────────────────────────────────── */}
        {/* AI-generated visuals the user created from a micro-reading or
            quiz result. Each portrait is keyed by their email + the Atlas
            pattern slug. Renders as an editorial gallery — image is the
            hero, pattern name + date as caption, click-through to the
            pattern page. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "VII." : "VI."}</span>
            Pattern portraits
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            The visuals you&apos;ve generated.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            One-of-a-kind AI portraits created from your pattern results — abstract, cinematic, yours. Click any portrait to revisit the pattern it came from.
          </p>

          {portraits && portraits.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {portraits.map((p) => {
                const atlasPattern = getAtlasPattern(p.pattern);
                const created =
                  p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
                return (
                  <Link
                    key={p.id}
                    href={
                      atlasPattern
                        ? `/patterns/atlas/${atlasPattern.slug}`
                        : "/patterns/atlas"
                    }
                    className="group block border border-[#c9a96e]/20 p-2 bg-[#0a0a0a] hover:border-[#c9a96e]/40 transition-colors duration-300"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#050505]">
                      <img
                        src={p.imageUrl}
                        alt={`AI pattern portrait for ${atlasPattern?.name ?? p.pattern}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#c9a96e]/10" />
                    </div>
                    <p
                      className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] mt-3 mb-1 font-light"
                      style={{ fontFamily: "var(--font-cinzel)" }}
                    >
                      {atlasPattern?.name?.replace(" Pattern", "") ?? "Pattern"}
                    </p>
                    <p className="text-[10px] tracking-wide text-[#5a5a5a] font-mono">
                      {created.toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
              <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                No pattern portraits yet. Take the micro-reading or the Atlas quiz, then generate a one-of-a-kind visual of your pattern.
              </p>
              <div className="flex flex-wrap gap-6">
                <Link
                  href="/#micro-reading"
                  className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                >
                  Take the micro-reading
                  <span>→</span>
                </Link>
                <Link
                  href="/patterns/atlas/quiz"
                  className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.08] pb-2 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-colors"
                >
                  Take the Atlas quiz
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ─── Pattern Journal ────────────────────────────────────────────── */}
        {/* A daily emotional weather log — members log mood, energy, trigger,
            and pattern daily; weekly, the LLM synthesises what surfaced.
            Surfaces here as a teaser card with the entry count + last-log
            date, linking to /journal for the full experience. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "VIII." : "VII."}</span>
            Pattern Journal
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            The shape of your week.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            A daily emotional weather log — five quiet minutes a day. Over
            time, the patterns you can&apos;t see in any single day surface on
            their own. Each week, the LLM reads your entries and writes back
            a synthesis in the AstroKalki voice.
          </p>

          <div className="border-t border-white/[0.06] border-b border-white/[0.06] py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Total entries
                </p>
                <p className="text-2xl font-serif text-[#f0eee9] font-light font-mono">
                  {journalAgg?._count?._all ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Last logged
                </p>
                <p className="text-base text-[#cfcabf] font-light">
                  {journalAgg?._max?.date
                    ? formatDate(journalAgg._max.date)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Cadence
                </p>
                <p className="text-base text-[#cfcabf] font-light">
                  Daily · 5 minutes
                </p>
              </div>
            </div>
            <Link
              href="/journal"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              {(journalAgg?._count?._all ?? 0) > 0
                ? "Open your journal"
                : "Begin your journal"}
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* ─── Pattern Calendar (M10-d) ──────────────────────────────────── */}
        {/* A 30-day forecast of which Atlas patterns are likely to surface
            for the member, based on upcoming transits against their birth
            chart. Pairs with the Pattern Journal — the journal logs what
            DID surface; the calendar forecasts what's APPROACHING.
            Roman numeral is dynamic based on whether the subscription-
            management section (active members only) is shown. */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "IX." : "VIII."}</span>
            Pattern Calendar
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            What&apos;s approaching.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            A 30-day forecast of when your patterns are likely to
            surface — based on upcoming planetary transits against your
            birth chart. A planning tool: next week your abandonment
            pattern may be activated, here&apos;s how to prepare. Not
            prediction. Pattern weather.
          </p>

          <div className="border-t border-white/[0.06] border-b border-white/[0.06] py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Forecast window
                </p>
                <p className="text-base text-[#cfcabf] font-light">
                  Next 30 days
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Based on
                </p>
                <p className="text-base text-[#cfcabf] font-light">
                  {birthCharts && birthCharts.length > 0
                    ? "Your latest birth chart"
                    : "General transits · cast a chart to personalise"}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Refresh cadence
                </p>
                <p className="text-base text-[#cfcabf] font-light">
                  Hourly · cached server-side
                </p>
              </div>
            </div>
            <Link
              href="/pattern-calendar"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Open the pattern calendar
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* ─── Email preferences ────────────────────────────────────────── */}
        <section className="mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">{activeMembership ? "X." : "IX."}</span>
            Email preferences
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
            What reaches your inbox.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Tune which emails you receive. Session-related emails (booking confirmations, reminders) are always recommended — they&apos;re transactional, not marketing.
          </p>

          {newsletter ? (
            <PreferencesForm
              initial={{
                prefSessions: newsletter.prefSessions,
                prefBlog: newsletter.prefBlog,
                prefDrip: newsletter.prefDrip,
              }}
            />
          ) : (
            <PreferencesForm
              initial={{
                prefSessions: true,
                prefBlog: true,
                prefDrip: true,
              }}
            />
          )}

          {newsletter?.optedOut && (
            <p className="mt-6 text-[11px] text-[#a58a54]/80 font-light leading-relaxed">
              You previously unsubscribed from all emails. Toggling any preference above will resubscribe you to that specific category.
            </p>
          )}
        </section>

        {/* ─── Footer of the portal ─────────────────────────────────────── */}
        <div className="pt-10 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              Need help?
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
              Reply to any email from us, or message us on WhatsApp — we usually reply within 24 hours.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
          >
            Back to site
            <span>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
