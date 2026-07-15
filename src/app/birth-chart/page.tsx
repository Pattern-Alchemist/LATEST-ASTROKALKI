import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import ChartCalculator from "./ChartCalculator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * /birth-chart — the public Vedic birth chart calculator.
 *
 * Lead-gen page. Non-members enter their birth details (name, email,
 * date / time / place) and get back a calculated Vedic chart with
 * planetary positions, rendered as a North Indian style SVG.
 *
 * The page is server-rendered. It:
 *   1. Reads the NextAuth session (if any).
 *   2. Pre-fills the ChartCalculator form with the member's email/name
 *      if signed in.
 *   3. Renders the editorial intro + the form component.
 *
 * The chart is calculated by the API at /api/birth-chart, which uses
 * the astronomy-engine ephemeris and persists the result against the
 * user's email so it shows up in /account.
 */

export const metadata: Metadata = {
  title: "Free Vedic Birth Chart Calculator — AstroKalki",
  description:
    "Get a free Vedic birth chart calculated from the JPL planetary ephemeris. Enter your date, time, and place of birth — see your sidereal planetary positions, Ascendant (Lagna), and 12 houses rendered as a North Indian style chart. Lahiri ayanamsa, accurate to arcminutes.",
  alternates: { canonical: "https://astrokalki.com/birth-chart" },
  openGraph: {
    title: "Free Vedic Birth Chart Calculator — AstroKalki",
    description:
      "Enter your birth details. Get a calculated Vedic chart with sidereal planetary positions, Ascendant, and 12 houses — rendered as a North Indian style SVG. Powered by the JPL ephemeris. Lahiri ayanamsa.",
    type: "website",
    url: "https://astrokalki.com/birth-chart",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Vedic Birth Chart Calculator — AstroKalki",
    description:
      "Get your Vedic birth chart calculated from the JPL ephemeris. Sidereal positions, Ascendant, 12 houses — North Indian style SVG.",
  },
  keywords: [
    "vedic birth chart",
    "free birth chart calculator",
    "sidereal astrology chart",
    "lahiri ayanamsa",
    "north indian chart",
    "lagna calculator",
    "planetary positions",
    "jyotish chart",
    "rahu ketu calculator",
    "moon sign calculator",
  ],
};

/**
 * JSON-LD structured data for the calculator (SoftwareApplication /
    WebApplication). Helps search engines understand that this is an
    interactive tool, not just an article.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AstroKalki Vedic Birth Chart Calculator",
  url: "https://astrokalki.com/birth-chart",
  applicationCategory: "AstrologyApplication",
  operatingSystem: "Web",
  description:
    "Free Vedic birth chart calculator. Enter your date, time, and place of birth to get a sidereal chart with planetary positions and the Ascendant, rendered as a North Indian style SVG.",
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

export default async function BirthChartPage() {
  // Resolve session — pre-fill name/email if signed in.
  let sessionEmail: string | null = null;
  let sessionName: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      sessionEmail = session.user.email.toLowerCase();
      sessionName = session.user.name ?? null;
    }
  } catch {
    // Session lookup failed — treat as anonymous.
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Birth Chart" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Vedic chart · JPL ephemeris · Lahiri ayanamsa
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Calculate your{" "}
            <span className="text-[#c9a96e] italic">birth chart.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Enter your date, time, and place of birth. The ephemeris
            computes the sidereal positions of the Sun, Moon, planets,
            and lunar nodes — and the Ascendant (Lagna) — at the moment
            you arrived. Rendered as a North Indian style chart. Not
            prediction. Architecture.
          </p>
        </div>
      </header>

      {/* ─── How it works ──────────────────────────────────────────── */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            What gets calculated
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
            {[
              {
                placement: "Ascendant (Lagna)",
                detail:
                  "The sign rising on the eastern horizon at your moment of birth. Determines the 1st house and the architecture of the entire chart. Computed from your exact time + place.",
              },
              {
                placement: "Sun & Moon",
                detail:
                  "Surya and Chandra. The solar identity and the lunar emotional baseline. The two luminaries that anchor any Vedic reading — the foundation everything else is built on.",
              },
              {
                placement: "Five planets",
                detail:
                  "Mars, Mercury, Jupiter, Venus, Saturn — Mangala, Budha, Guru, Shukra, Shani. Their sidereal signs, degrees, and houses. Direct or retrograde motion detected by sampling their longitude across 12 hours.",
              },
              {
                placement: "Rahu & Ketu",
                detail:
                  "The lunar nodes — the points where the Moon's orbit crosses the ecliptic. Rahu is the ascending node ( obsession ); Ketu is the descending ( release ). Always retrograde. The axis of compulsion in the chart.",
              },
            ].map((item) => (
              <div key={item.placement}>
                <h3
                  className="text-xl sm:text-2xl font-serif text-[#c9a96e] font-light tracking-[-0.01em] mb-3"
                  style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                >
                  {item.placement}
                </h3>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The calculator ────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            The calculator
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-10">
            {sessionEmail
              ? "Cast a new chart."
              : "Enter your birth details."}
          </h2>

          <ChartCalculator
            email={sessionEmail}
            name={sessionName}
          />
        </div>
      </section>

      {/* ─── What this is (and isn't) ──────────────────────────────── */}
      <section className="border-t border-white/[0.04] py-16 sm:py-20 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            What this is — and what it isn&apos;t
          </p>
          <div className="space-y-6">
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
              This is a calculated chart. The planetary positions are
              computed from the same JPL ephemeris NASA uses for
              spacecraft navigation — accurate to arcseconds, far
              beyond what an SVG chart can display. The Lahiri
              (Chitrapaksha) ayanamsa converts tropical positions to
              the sidereal zodiac used in Vedic astrology.
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
              This is not a reading. A chart is a map of tendencies —
              the gravitational pull of patterns your nervous system
              has been running. The chart shows the architecture; the
              meaning comes from a live conversation that brings your
              actual life to the symbols.
            </p>
            <p className="text-[#9a9a9a] text-base leading-[1.8] font-light">
              The Ascendant requires an accurate birth time. If you
              don&apos;t know your birth time, the planetary positions
              will still be correct, but the houses and Ascendant will
              be off — potentially by an entire sign. Use the chart as
              a starting point; book a session for the full decode.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row gap-4">
            <Link
              href="/chart-reading"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Upload an existing chart image
              <span>→</span>
            </Link>
            <Link
              href="/patterns/atlas"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.08] pb-2 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-colors"
            >
              Browse the Pattern Atlas
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
