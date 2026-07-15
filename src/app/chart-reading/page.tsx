import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import ChartAnalysis, {
  type ChartHistoryItem,
} from "@/components/astrokalki/chart-analysis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * /chart-reading — the public VLM-powered birth chart analysis tool.
 *
 * This is a lead-generation page. Non-members can upload a chart image,
 * get a pattern-recognition reading from the VLM, and (if they enter their
 * email — which they must, since the analysis is saved against it) become
 * a lead. Members get the same tool with their email pre-filled and a
 * history of their past analyses below the upload zone.
 *
 * The page itself is server-rendered. It:
 *   1. Reads the NextAuth session (if any).
 *   2. If signed in, fetches the member's past analyses from the DB.
 *   3. Passes the email + initialHistory to the ChartAnalysis client
 *      component, which owns all the interactive state.
 *
 * SEO: this page is indexable. It targets the long-tail "birth chart
 * pattern recognition" + "Vedic chart analysis AI" cluster.
 */

export const metadata: Metadata = {
  title: "Birth Chart Pattern Recognition — AstroKalki",
  description:
    "Upload your birth chart and get a pattern-recognition reading. The VLM identifies the emotional and relational tendencies written into your chart's planetary placements — Moon, Saturn, Venus, Rahu/Ketu — and maps them to the AstroKalki Pattern Atlas. Not prediction. Pattern recognition.",
  alternates: { canonical: "https://astrokalki.com/chart-reading" },
  openGraph: {
    title: "Birth Chart Pattern Recognition — AstroKalki",
    description:
      "Upload your birth chart. Get a pattern-recognition reading. The VLM maps your planetary placements to the ten Atlas patterns — Rescuer, Abandonment, Performer, and the rest. Not prediction. Pattern recognition.",
    type: "website",
    url: "https://astrokalki.com/chart-reading",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "Birth Chart Pattern Recognition — AstroKalki",
    description:
      "Upload your chart. Get a VLM-powered pattern-recognition reading. Not prediction — pattern recognition.",
  },
  keywords: [
    "birth chart analysis",
    "vedic chart reading",
    "pattern recognition astrology",
    "AI chart analysis",
    "moon sign pattern",
    "saturn placement meaning",
    "rahu ketu axis",
    "emotional pattern astrology",
  ],
};

export default async function ChartReadingPage() {
  // ─── Resolve session + past analyses (server-side) ────────────────────
  let sessionEmail: string | null = null;
  let initialHistory: ChartHistoryItem[] = [];

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      sessionEmail = session.user.email.toLowerCase();
    }
  } catch {
    // Session lookup failed — treat as anonymous.
  }

  if (sessionEmail) {
    try {
      const rows = await db.chartAnalysis.findMany({
        where: { email: sessionEmail },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          email: true,
          imageUrl: true,
          analysis: true,
          identifiedPatterns: true,
          createdAt: true,
        },
      });

      initialHistory = rows.map((row) => {
        let identifiedPatterns: string[] = [];
        try {
          const parsed = JSON.parse(row.identifiedPatterns);
          if (Array.isArray(parsed)) {
            identifiedPatterns = parsed.filter(
              (s): s is string => typeof s === "string"
            );
          }
        } catch {
          // Malformed JSON — leave empty.
        }
        return {
          id: row.id,
          email: row.email,
          imageUrl: row.imageUrl,
          analysis: row.analysis,
          identifiedPatterns,
          createdAt:
            row.createdAt instanceof Date
              ? row.createdAt.toISOString()
              : row.createdAt,
        };
      });
    } catch (err) {
      console.error("chart-reading: history fetch failed:", err);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Chart Reading" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Pattern recognition · VLM-powered
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Upload your chart.{" "}
            <span className="text-[#c9a96e] italic">
              See the architecture.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Drop an image of your Vedic or Western birth chart. The model
            reads the planetary placements — Moon, Saturn, Venus, Rahu and
            Ketu, the houses — and identifies which of the ten Atlas
            patterns are most active in your chart. This is pattern
            recognition, not prediction.
          </p>
        </div>
      </header>

      {/* ─── How it works ──────────────────────────────────────────────── */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            What the model reads
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
            {[
              {
                placement: "Moon",
                detail:
                  "The emotional baseline. The attachment strategy installed in the early environment. The single most important planet for pattern work.",
              },
              {
                placement: "Saturn",
                detail:
                  "Where you learned to armour, control, or self-limit. The wound that hardened into a structure — and the structure that became your personality.",
              },
              {
                placement: "Venus",
                detail:
                  "How you approach love, value, and partnership. What you believe love costs, and the relational style the chart writes into your defaults.",
              },
              {
                placement: "Rahu / Ketu",
                detail:
                  "The axis of obsession and avoidance. Rahu is what you compulsively pursue; Ketu is what you compulsively flee. The lunar nodes mark the pattern's directional pull.",
              },
            ].map((item) => (
              <div key={item.placement}>
                <h3 className="text-xl sm:text-2xl font-serif text-[#c9a96e] font-light tracking-[-0.01em] mb-3">
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

      {/* ─── The tool ──────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            The tool
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-10">
            {sessionEmail
              ? "Upload a new chart."
              : "Upload your chart image."}
          </h2>

          <ChartAnalysis
            email={sessionEmail}
            initialHistory={initialHistory}
          />
        </div>
      </section>

      {/* ─── What this is (and isn't) ──────────────────────────────────── */}
      <section className="border-t border-white/[0.04] py-16 sm:py-20 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            What this is — and what it isn&apos;t
          </p>
          <div className="space-y-6">
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
              This is pattern recognition. The model reads the chart&apos;s
              geometry and identifies which Atlas patterns are most strongly
              marked by the placements. It is a mirror, not a verdict — a
              way of seeing the architecture of your tendencies written in a
              language older than your personality.
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
              This is not prediction. The chart does not name your future
              partner, time your success, or forecast the events of your
              life. It describes tendencies — the gravitational pull of the
              patterns your nervous system has been running. What you do
              with that recognition is yours.
            </p>
            <p className="text-[#9a9a9a] text-base leading-[1.8] font-light">
              The analysis is a fragment. The full decode requires your
              exact birth time, a live conversation, and the questions only
              you can bring. Book a session when you&apos;re ready.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <Link
              href="/patterns/atlas"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
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
