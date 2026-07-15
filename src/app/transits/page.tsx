import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTodaysTransits, renderTransitWheelSVG, retrogradeCount, retrogradeSummary } from "@/lib/astrology/transits";
import TransitDisplay from "./TransitDisplay";

/**
 * /transits — the public transit tracker.
 *
 * Server component. Server-fetches today's transits (cached in DB),
 * renders the SVG wheel + planet table, and shows a general
 * "what this means" interpretation. No LLM call on this page — the
 * public page is hit by every visitor, so it stays deterministic.
 *
 * The personalised LLM-powered check-in lives behind the
 * /api/transits/check-in endpoint, gated by NextAuth.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Today’s Planetary Transits — AstroKalki",
  description:
    "Where the planets are right now — sidereal (Lahiri) positions of the Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu. Updated daily. A weather report for the patterns moving through your life.",
  alternates: { canonical: "https://astrokalki.com/transits" },
  openGraph: {
    title: "Today’s Planetary Transits — AstroKalki",
    description:
      "A daily weather report for the patterns moving through your life. Sidereal planetary positions, retrograde indicators, and a general interpretation. Powered by the JPL ephemeris.",
    type: "website",
    url: "https://astrokalki.com/transits",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "Today’s Planetary Transits — AstroKalki",
    description:
      "Sidereal planetary positions, retrograde indicators, and a general interpretation. Powered by the JPL ephemeris.",
  },
  keywords: [
    "planetary transits today",
    "vedic transits",
    "sidereal astrology",
    "mercury retrograde",
    "saturn transit",
    "rahu ketu transit",
    "current planetary positions",
    "jyotish transits",
    "lahiri ayanamsa",
  ],
};

/**
 * JSON-LD structured data — marks the page as an AstrologyApplication.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AstroKalki Transit Tracker",
  url: "https://astrokalki.com/transits",
  applicationCategory: "AstrologyApplication",
  operatingSystem: "Web",
  description:
    "Daily sidereal planetary transits — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu. Updated every UTC midnight. Powered by the JPL ephemeris with the Lahiri ayanamsa.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  creator: {
    "@type": "Organization",
    name: "AstroKalki",
    url: "https://astrokalki.com",
  },
};

/**
 * Build a deterministic, general "what this means" interpretation
 * from today's transits. No LLM call — this paragraph is generated
 * from rules so the public page stays cheap and predictable.
 *
 * The interpretation names:
 *   - Which signs the slow planets (Saturn, Jupiter, Rahu, Ketu) are
 *     transiting (these set the multi-month backdrop).
 *   - Which planets are retrograde (if any) — the inward-turning weather.
 *   - The Moon's sign today — the daily emotional weather.
 */
function buildGeneralInterpretation(transits: Awaited<ReturnType<typeof getTodaysTransits>>): {
  backdrop: string;
  weather: string;
  retro: string;
} {
  const sat = transits.planets.Saturn;
  const jup = transits.planets.Jupiter;
  const rahu = transits.planets.Rahu;
  const ketu = transits.planets.Ketu;
  const moon = transits.planets.Moon;
  const mars = transits.planets.Mars;
  const mercury = transits.planets.Mercury;

  const backdrop =
    `The slow planets set the backdrop. Saturn is transiting ${sat.signName} — the work of structure, limitation, and maturation is happening wherever ${sat.signName} sits in your chart. Jupiter is in ${jup.signName}, expanding whatever ${jup.signName} represents. The Rahu-Ketu axis is crossing ${rahu.signName}–${ketu.signName}: an 18-month arc of obsession and release along that pair of signs.`;

  const weather =
    `The Moon is in ${moon.signName} today — the daily emotional weather. Mars is in ${mars.signName}, Mercury in ${mercury.signName}. The inner weather shifts every couple of days; the slow-planet backdrop shifts every couple of years. The pattern weather you feel is the meeting of the two.`;

  const retroCount = retrogradeCount(transits);
  const retroStr = retrogradeSummary(transits);
  let retro: string;
  if (retroCount === 0) {
    retro =
      `No planets are retrograde today. The energy moves outward; new beginnings have wind behind them. This is a window for action, not for review.`;
  } else if (retroCount <= 2) {
    retro =
      `${retroStr} ${retroCount === 1 ? "is retrograde" : "are retrograde"}. The retrograde planet turns its energy inward — review, revisit, reconsider. The outer action slows; the inner accounting deepens.`;
  } else {
    retro =
      `${retroStr} — ${retroCount} planets retrograde at once. This is unusual weather. The collective pace slows; the inner work compounds. Use it.`;
  }

  return { backdrop, weather, retro };
}

export default async function TransitsPage() {
  // Resolve session — show a different CTA for signed-in members.
  let sessionEmail: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      sessionEmail = session.user.email.toLowerCase();
    }
  } catch {
    // Session lookup failed — treat as anonymous.
  }

  // Fetch today's transits (cached in DB; fresh calc on first hit of the day).
  let transits: Awaited<ReturnType<typeof getTodaysTransits>>;
  try {
    transits = await getTodaysTransits();
  } catch (err) {
    console.error('[/transits] failed to load transits:', err);
    return (
      <main className="min-h-screen bg-[#050505] text-[#f0eee9] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light">
            Transits
          </p>
          <h1 className="text-2xl font-serif text-[#f0eee9] font-light mb-4">
            The ephemeris is temporarily unavailable.
          </h1>
          <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
            Refresh in a moment. If the problem persists, the planetary
            positions will reappear as soon as the calculation engine
            recovers.
          </p>
        </div>
      </main>
    );
  }

  const wheelSvg = renderTransitWheelSVG(transits);
  const interpretation = buildGeneralInterpretation(transits);
  const retroCount = retrogradeCount(transits);
  const dateObj = new Date(transits.date);
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Transits" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            {dateStr} · Lahiri ayanamsa · {transits.ayanamsa.toFixed(3)}°
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Where the planets are{" "}
            <span className="text-[#c9a96e] italic">today.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            A daily weather report for the patterns moving through your
            life. Sidereal positions of the nine Vedic grahas, computed
            from the JPL ephemeris. Not prediction. Architecture.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24 space-y-20 sm:space-y-28">
        {/* ─── I. The wheel + planet table ───────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">I.</span>
            Today&apos;s positions
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            The wheel.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Each glyph marks a planet&apos;s current sidereal longitude.
            The outer ring shows the 12 signs; 0° Aries is at the left.
            Planets marked <span className="text-[#a58a54]">℞</span> are
            moving retrograde — their energy turns inward.
          </p>

          <TransitDisplay
            transits={transits}
            wheelSvg={wheelSvg}
            retrogradeCount={retroCount}
          />
        </section>

        {/* ─── II. What this means ──────────────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">II.</span>
            What this means
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-10">
            The current pattern weather.
          </h2>

          <div className="space-y-8 max-w-3xl">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light">
                The backdrop — slow planets
              </p>
              <p
                className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.85] italic"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                {interpretation.backdrop}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light">
                The inner weather — fast planets
              </p>
              <p
                className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.85] italic"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                {interpretation.weather}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light">
                Retrograde motion
              </p>
              <p
                className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.85] italic"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                {interpretation.retro}
              </p>
            </div>
          </div>
        </section>

        {/* ─── III. CTA: personalized check-in ──────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">III.</span>
            Your personalised check-in
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-6">
            What does today look like for you?
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-8">
            The page above is the public weather — the same for
            everyone. The personalised check-in cross-references
            today&apos;s transits against your natal chart, names which
            of your patterns are activated, and writes a 2-3 paragraph
            insight in the AstroKalki voice. One per day, members only.
          </p>

          <div className="border border-[#c9a96e]/20 bg-[#0a0a0a] p-8 sm:p-10">
            {sessionEmail ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p
                    className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light"
                    style={{ fontFamily: "var(--font-cinzel)" }}
                  >
                    You&apos;re signed in
                  </p>
                  <p className="text-base text-[#cfcabf] font-light leading-[1.7] max-w-md">
                    Open the Pattern Journal to run today&apos;s
                    personalised check-in. The insight, activated
                    patterns, and a journal prompt will be waiting.
                  </p>
                </div>
                <Link
                  href="/journal"
                  className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
                >
                  Open the journal
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p
                    className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light"
                    style={{ fontFamily: "var(--font-cinzel)" }}
                  >
                    Members only
                  </p>
                  <p className="text-base text-[#cfcabf] font-light leading-[1.7] max-w-md">
                    Sign in to your account, cast your birth chart if
                    you haven&apos;t, and run today&apos;s check-in from
                    the Pattern Journal.
                  </p>
                </div>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
                >
                  Sign in
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <div className="pt-10 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              The chart, not the forecast
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md">
              Transits are a map of timing. The architecture of your
              tendencies lives in the birth chart — the static
              snapshot. The two together are what a reading unpacks.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3">
            <Link
              href="/birth-chart"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
            >
              Cast your birth chart
              <span>→</span>
            </Link>
            <Link
              href="/patterns/atlas"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.08] pb-2 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-colors whitespace-nowrap"
            >
              Browse the Pattern Atlas
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
