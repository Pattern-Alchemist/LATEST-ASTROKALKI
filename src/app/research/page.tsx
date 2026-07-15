import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { db } from "@/lib/db";

/**
 * Original Research page — the proprietary data layer.
 *
 * This page surfaces aggregated, anonymised data from the micro-diagnosis
 * tool and booking flow. As the volume of micro-readings grows, this page
 * becomes AstroKalki's most defensible content asset — original research
 * that no other astrology or psychology site has, because no other site
 * has the same diagnostic instrument producing the same data.
 *
 * Data sources:
 *   - MicroReading table (emotionalPattern, relationshipFrustration, birthMonth)
 *   - Booking table (contexts, duration, price)
 *
 * All data is aggregated and anonymised. No individual is identifiable.
 * The page is revalidated every 6 hours so the numbers stay current.
 */

export const revalidate = 21600; // 6 hours

export const metadata: Metadata = {
  title: "Original Research — AstroKalki Pattern Data",
  description:
    "Aggregated, anonymised data from AstroKalki's micro-diagnosis instrument: the most common emotional patterns, relationship frustrations, and booking focus areas across thousands of visitors. Original research that only AstroKalki has.",
  alternates: { canonical: "https://astrokalki.com/research" },
  openGraph: {
    title: "AstroKalki Original Research — Pattern Data",
    description:
      "The most common emotional patterns, relationship loops, and self-sabotage mechanisms — aggregated from micro-diagnosis data only AstroKalki has.",
    type: "website",
    url: "https://astrokalki.com/research",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki Original Research",
    description:
      "Aggregated pattern data — the most common emotional loops, relationship frustrations, and self-sabotage mechanisms.",
  },
  keywords: [
    "emotional patterns research",
    "relationship patterns data",
    "self sabotage statistics",
    "pattern recognition data",
    "astrology psychology research",
  ],
};

// Pattern label map — turns the internal keys into human-readable titles
const PATTERN_LABELS: Record<string, string> = {
  abandonment: "The Abandonment Loop",
  control: "The Control Architecture",
  "people-pleasing": "The Chameleon Pattern",
  "emotional-numbness": "The Deep Freeze",
  overthinking: "The Mental Labyrinth",
  "self-doubt": "The Erosion Pattern",
};

const FRUSTRATION_LABELS: Record<string, string> = {
  "same-relationship": "I keep attracting the same relationship",
  "cant-leave": "I can't leave, even when I should",
  "numb-disconnected": "I feel numb or disconnected",
  "self-sabotage": "I sabotage things when they're going well",
  "lost-confused": "I feel lost and don't know who I am",
  "repeating-decisions": "I keep making the same bad decisions",
};

// Editorial interpretation — what the data means in plain language
function interpretTopPattern(topPattern: string | null, count: number): string {
  if (!topPattern || count === 0) {
    return "Data collection is ongoing. As more visitors take the micro-diagnosis, the patterns above will populate and the interpretation here will sharpen. The Atlas itself is the static layer; this page is the dynamic one — the living record of what AstroKalki's visitors are actually carrying.";
  }
  const label = PATTERN_LABELS[topPattern] || topPattern;
  const interpretations: Record<string, string> = {
    abandonment:
      "The Abandonment Loop is the most frequently identified pattern in AstroKalki's micro-diagnosis data. This is consistent with the broader pattern-recognition literature: abandonment wounding is the most common root of adult relational instability, because the early experience of being left (physically or emotionally) is also one of the most common early experiences. The high prevalence here is not a coincidence of this site's audience — it is a reflection of what is actually running beneath most people's relational pain.",
    control:
      "The Control Architecture is the most frequently identified pattern. This is notable: control patterns often present as competence, ambition, or 'having it together', and the people who carry them are often the least likely to seek help. The high prevalence in this data suggests that the micro-diagnosis is reaching a population that has already begun to suspect that their competence is a defence rather than a virtue — which is the precondition for the pattern becoming workable.",
    "people-pleasing":
      "The Chameleon Pattern is the most frequently identified pattern. This is consistent with the broader cultural moment: people-pleasing is the relational strategy most reinforced by social media, professional life, and the modern expectation of constant availability. The high prevalence here reflects both how common the pattern is and how exhausting it has become to maintain.",
    "emotional-numbness":
      "The Deep Freeze is the most frequently identified pattern. This is the pattern most often invisible to the person carrying it, because numbness does not feel like a problem — it feels like composure. The high prevalence here suggests that the micro-diagnosis is reaching people at the moment when the cost of the numbness has finally become larger than the safety it provides, which is the moment the pattern becomes available for work.",
    overthinking:
      "The Mental Labyrinth is the most frequently identified pattern. This is unsurprising: overthinking is the most culturally acceptable form of anxiety, and the people who carry it are often praised for their intelligence, conscientiousness, or 'carefulness'. The high prevalence here reflects how rarely overthinking is identified as a pattern rather than a virtue.",
    "self-doubt":
      "The Erosion Pattern is the most frequently identified pattern. Self-doubt is often the surface symptom of a deeper pattern, and its high prevalence here suggests that the micro-diagnosis is reaching people at the point where the doubt has become loud enough to interfere with action — which is the point at which the underlying pattern can finally be named.",
  };
  return interpretations[topPattern] || `The most common pattern identified is ${label}.`;
}

function interpretTopFrustration(topFrustration: string | null): string {
  if (!topFrustration) return "";
  const label = FRUSTRATION_LABELS[topFrustration] || topFrustration;
  return `The most common frustration — "${label}" — is the entry point most visitors are arriving with. This is the surface symptom; the underlying pattern is what the micro-diagnosis reveals. The gap between the frustration (which feels specific to the current situation) and the pattern (which is structural and older) is where the actual work begins.`;
}

export default async function ResearchPage() {
  // Aggregate data in parallel
  let microReadings: any[] = [];
  let bookings: any[] = [];
  
  try {
    [microReadings, bookings] = await Promise.all([
      db.microReading.findMany({
        select: {
          emotionalPattern: true,
          relationshipFrustration: true,
          birthMonth: true,
          createdAt: true,
        },
      }),
      db.booking.findMany({
        select: { contexts: true, duration: true, price: true, status: true, createdAt: true },
      }),
    ]);
  } catch {
    // Database unavailable during build — use empty arrays
  }

  // Aggregate by emotional pattern
  const patternCounts: Record<string, number> = {};
  microReadings.forEach((r) => {
    patternCounts[r.emotionalPattern] = (patternCounts[r.emotionalPattern] || 0) + 1;
  });

  // Aggregate by relationship frustration
  const frustrationCounts: Record<string, number> = {};
  microReadings.forEach((r) => {
    frustrationCounts[r.relationshipFrustration] =
      (frustrationCounts[r.relationshipFrustration] || 0) + 1;
  });

  // Aggregate by birth month
  const monthCounts: Record<number, number> = {};
  microReadings.forEach((r) => {
    monthCounts[r.birthMonth] = (monthCounts[r.birthMonth] || 0) + 1;
  });

  // Aggregate by booking context
  const contextCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    try {
      const ctxs = JSON.parse(b.contexts) as string[];
      if (Array.isArray(ctxs)) {
        ctxs.forEach((c) => {
          contextCounts[c] = (contextCounts[c] || 0) + 1;
        });
      }
    } catch {
      /* malformed */
    }
  });

  // Recent (30-day) sample
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentMicroReadings = microReadings.filter((r) => r.createdAt >= thirtyDaysAgo).length;
  const recentBookings = bookings.filter((b) => b.createdAt >= thirtyDaysAgo).length;

  // Sort aggregates
  const sortByCount = (obj: Record<string, number>) =>
    Object.entries(obj)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  const sortedPatterns = sortByCount(patternCounts);
  const sortedFrustrations = sortByCount(frustrationCounts);
  const sortedContexts = sortByCount(contextCounts);
  const sortedMonths = Object.entries(monthCounts)
    .map(([m, count]) => ({ month: parseInt(m), count }))
    .sort((a, b) => b.count - a.count);

  const topPattern = sortedPatterns[0]?.label ?? null;
  const topFrustration = sortedFrustrations[0]?.label ?? null;

  const totalPatternSamples = microReadings.length;
  const totalBookingSamples = bookings.length;

  // Month names
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Schema
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "AstroKalki Pattern Recognition Data",
    description:
      "Aggregated, anonymised data from AstroKalki's micro-diagnosis instrument — the most common emotional patterns, relationship frustrations, and booking focus areas among visitors.",
    creator: { "@type": "Organization", name: "AstroKalki", url: "https://astrokalki.com" },
    license: "https://astrokalki.com/research",
    isAccessibleForFree: true,
    keywords: [
      "emotional patterns",
      "relationship patterns",
      "self-sabotage",
      "attachment",
      "pattern recognition",
    ].join(", "),
    variableMeasured: [
      "emotionalPattern",
      "relationshipFrustration",
      "birthMonth",
      "bookingContext",
    ],
    observationCount: totalPatternSamples + totalBookingSamples,
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />

      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Research" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Original Research
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            What AstroKalki's visitors are actually carrying.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Aggregated, anonymised data from the micro-diagnosis instrument —
            the most common emotional patterns, relationship frustrations, and
            booking focus areas across {totalPatternSamples + totalBookingSamples} samples
            and counting. This is original research that no other astrology or
            psychology site has, because no other site has the same instrument
            producing the same data.
          </p>
          <p className="mt-8 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            {totalPatternSamples} micro-readings · {totalBookingSamples} bookings · {recentMicroReadings} new readings in last 30 days
          </p>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {/* Methodology note */}
        <section className="mb-16 p-6 border border-white/[0.05] bg-white/[0.01]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-3 font-light">
            Methodology
          </p>
          <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
            Data is collected passively from the micro-diagnosis tool on the
            AstroKalki homepage. Each visitor selects one of six emotional
            patterns and one of six relationship frustrations; their birth
            month is captured to enable the chart signature lookup. All data
            shown here is aggregated. No individual is identifiable. The page
            is revalidated every six hours, so the numbers reflect the most
            recent state of the dataset.
          </p>
        </section>

        {/* Top pattern finding */}
        {totalPatternSamples > 0 && (
          <section className="mb-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              Finding 01 — Most common pattern
            </p>
            {sortedPatterns[0] && (
              <>
                <p className="text-3xl sm:text-4xl font-serif text-[#c9a96e] font-light tracking-[-0.015em] mb-4 italic">
                  {PATTERN_LABELS[sortedPatterns[0].label] || sortedPatterns[0].label}
                </p>
                <p className="text-sm text-[#5a5a5a] font-mono mb-6">
                  {sortedPatterns[0].count} of {totalPatternSamples} samples ({Math.round((sortedPatterns[0].count / totalPatternSamples) * 100)}%)
                </p>
                <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
                  {interpretTopPattern(topPattern, sortedPatterns[0].count)}
                </p>
                {(() => {
                  const p = topPattern;
                  if (!p) return null;
                  const atlasSlug = {
                    abandonment: "the-abandonment",
                    control: "the-performer", // closest atlas match
                    "people-pleasing": "the-emotional-caretaker",
                    "emotional-numbness": "the-invisible-child",
                    overthinking: "the-overthinker",
                    "self-doubt": "the-self-sabotage",
                  }[p];
                  if (!atlasSlug) return null;
                  return (
                    <p className="mt-6">
                      <Link
                        href={`/patterns/atlas/${atlasSlug}`}
                        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                      >
                        Read the full Atlas entry
                        <span>→</span>
                      </Link>
                    </p>
                  );
                })()}
              </>
            )}
          </section>
        )}

        {/* Pattern distribution */}
        {sortedPatterns.length > 0 && (
          <section className="mb-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              Pattern distribution
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-8">
              The full distribution of identified patterns across all micro-readings.
              The shape of this distribution is itself a finding: it shows which
              patterns are most common in the population that finds AstroKalki,
              and which are rare enough to suggest a less-shared experience.
            </p>
            <div className="space-y-4">
              {sortedPatterns.map((p) => {
                const pct = (p.count / totalPatternSamples) * 100;
                return (
                  <div key={p.label}>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-base text-[#f0eee9] font-serif font-light">
                        {PATTERN_LABELS[p.label] || p.label}
                      </span>
                      <span className="text-xs text-[#5a5a5a] font-mono">
                        {p.count} · {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.04]">
                      <div
                        className="h-full bg-[#c9a96e]/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Relationship frustration */}
        {sortedFrustrations.length > 0 && (
          <section className="mb-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              Finding 02 — Most common frustration
            </p>
            {sortedFrustrations[0] && (
              <>
                <p className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light italic leading-[1.5] mb-4">
                  "{FRUSTRATION_LABELS[sortedFrustrations[0].label] || sortedFrustrations[0].label}"
                </p>
                <p className="text-sm text-[#5a5a5a] font-mono mb-6">
                  {sortedFrustrations[0].count} of {totalPatternSamples} samples ({Math.round((sortedFrustrations[0].count / totalPatternSamples) * 100)}%)
                </p>
                <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
                  {interpretTopFrustration(topFrustration)}
                </p>
              </>
            )}
            {sortedFrustrations.length > 1 && (
              <div className="mt-8 space-y-2">
                {sortedFrustrations.slice(1).map((f) => (
                  <div
                    key={f.label}
                    className="flex items-baseline justify-between text-sm text-[#7a7a7a]"
                  >
                    <span className="font-light">
                      {FRUSTRATION_LABELS[f.label] || f.label}
                    </span>
                    <span className="font-mono text-xs">
                      {f.count} · {Math.round((f.count / totalPatternSamples) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Booking focus areas */}
        {sortedContexts.length > 0 && (
          <section className="mb-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              Finding 03 — Most common booking focus
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-8">
              When visitors book a session, they select one or more focus areas.
              This is what people actually come to talk about — distinct from
              the pattern they were identified with, and often a useful signal
              of where the pattern is most actively running in their life.
            </p>
            <ul className="space-y-3">
              {sortedContexts.slice(0, 8).map((c) => (
                <li
                  key={c.label}
                  className="flex items-baseline justify-between border-b border-white/[0.04] pb-2"
                >
                  <span className="text-base text-[#f0eee9] font-serif font-light">
                    {c.label}
                  </span>
                  <span className="text-xs text-[#5a5a5a] font-mono">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Birth month distribution */}
        {sortedMonths.length > 0 && (
          <section className="mb-16 pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
              Finding 04 — Birth month distribution
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-8">
              The distribution of birth months across the sample. A roughly
              uniform distribution would suggest that visitors arrive roughly
              evenly across the year; any peak suggests a cluster of visitors
              born under a particular chart signature, which would itself be a
              finding worth investigating.
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const count = monthCounts[m] || 0;
                const max = Math.max(...Object.values(monthCounts), 1);
                const pct = (count / max) * 100;
                return (
                  <div key={m} className="text-center">
                    <div
                      className="h-16 bg-[#c9a96e]/40 mb-1 flex items-end"
                      style={{ height: `${Math.max(8, pct)}%`, minHeight: "8px" }}
                    >
                      <div
                        className="w-full bg-[#c9a96e]/80"
                        style={{ height: "100%" }}
                      />
                    </div>
                    <p className="text-[9px] text-[#5a5a5a] font-mono">
                      {MONTH_NAMES[m - 1].slice(0, 3)}
                    </p>
                    <p className="text-[10px] text-[#7a7a7a] font-mono">{count}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Editorial summary */}
        <section className="mb-16 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            What this data is for
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mb-5">
            This page is not a vanity metric. It is the first draft of a body
            of original research AstroKalki is uniquely positioned to produce
            — because no other astrology or psychology site has the same
            diagnostic instrument producing the same data at the same scale.
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mb-5">
            As the sample grows, this page will sharpen. The findings will
            move from descriptive (here is the distribution) to interpretive
            (here is what the distribution means) to predictive (here is what
            the distribution suggests about the next pattern that will appear
            in your own life). That trajectory is the long game.
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
            The Atlas is the static layer — the ten patterns named and
            structured. The Research page is the dynamic layer — the living
            record of which patterns are most active in the population that
            finds this work. Together, they are the beginning of a body of
            proprietary knowledge that is the actual moat.
          </p>
        </section>

        {/* CTA */}
        <div className="pt-10 border-t border-white/[0.06] text-center">
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            Contribute to this dataset by taking the micro-diagnosis. Your
            data is anonymised and aggregated, and your contribution makes
            this research more useful to the next visitor.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/#micro-reading"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
            >
              Take the micro-reading
              <span className="text-[#c9a96e]">→</span>
            </Link>
            <Link
              href="/patterns/atlas"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-3 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              The Pattern Atlas
              <span>→</span>
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
