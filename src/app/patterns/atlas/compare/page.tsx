import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import CompareTable, {
  type CompareColumn,
} from "./CompareTable";
import {
  ATLAS_PATTERNS,
  getAtlasPattern,
} from "@/lib/content/patterns/atlas";
import { getAtlasMeta } from "@/lib/content/patterns/micro-to-atlas";
import { SERVICE_BY_SLUG } from "@/lib/content/services";

/**
 * Atlas compare page — side-by-side comparison of 2-3 Atlas patterns.
 *
 * Server component. Reads `searchParams.patterns` (comma-separated slugs,
 * max 3 enforced). Renders the CompareTable client component with
 * pre-resolved columns. If fewer than 2 patterns selected, shows a prompt.
 *
 * Emits ItemList JSON-LD so AI search systems see the comparison as a
 * structured list of compared entities (helps surface the Atlas patterns
 * as related/citable items).
 */

interface PageProps {
  searchParams: Promise<{ patterns?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { patterns } = await searchParams;
  const slugs = parseSlugs(patterns);
  const names = slugs
    .map((s) => getAtlasPattern(s)?.name ?? null)
    .filter(Boolean);

  const title =
    names.length >= 2
      ? `Comparing ${names.slice(0, 2).join(" vs ")}${
          names.length === 3 ? ` vs ${names[2]}` : ""
        } — AstroKalki Pattern Atlas`
      : "Compare Patterns — AstroKalki Pattern Atlas";

  const description =
    names.length >= 2
      ? `A side-by-side comparison of ${names.join(", ")} — core wound, common trigger, how it shows up, what it costs you, and the way through. Decoded by AstroKalki.`
      : "Compare two or three Atlas patterns side-by-side — symptoms, origin, shadow side, and what each is mistaken for.";

  return {
    title,
    description,
    alternates: { canonical: "https://astrokalki.com/patterns/atlas/compare" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "https://astrokalki.com/patterns/atlas/compare",
      siteName: "AstroKalki",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: false, follow: true }, // utility page — don't compete with hub
  };
}

function parseSlugs(patternsParam: string | undefined): string[] {
  if (!patternsParam) return [];
  // Split, trim, drop empties, dedupe (preserving first-seen order), cap at 3.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of patternsParam.split(",")) {
    const slug = raw.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= 3) break;
  }
  return out;
}

function buildColumns(slugs: string[]): CompareColumn[] {
  return slugs.map((slug) => {
    const pattern = getAtlasPattern(slug);
    const meta = getAtlasMeta(slug);
    const serviceSlug = pattern?.relatedService ?? null;
    const service = serviceSlug ? SERVICE_BY_SLUG[serviceSlug] : undefined;
    return {
      slug,
      pattern,
      cluster: meta.cluster,
      intensity: meta.intensity,
      relatedServiceTitle: service?.title ?? null,
      relatedServiceSlug: serviceSlug,
    };
  });
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { patterns } = await searchParams;
  const slugs = parseSlugs(patterns);
  const columns = buildColumns(slugs);
  const enoughPatterns = columns.length >= 2;

  // ItemList JSON-LD — surfaces the compared patterns as a structured list
  // of DefinedTerm entries. AI search systems can use this to associate the
  // patterns with each other.
  const itemListSchema =
    columns.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "AstroKalki Pattern Comparison",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: columns.length,
          itemListElement: columns.map((c, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            ...(c.pattern
              ? {
                  item: {
                    "@type": "DefinedTerm",
                    name: c.pattern.name,
                    description: c.pattern.tagline,
                    url: `https://astrokalki.com/patterns/atlas/${c.slug}`,
                  },
                }
              : { item: { "@type": "Thing", name: "Unknown pattern" } }),
          })),
        }
      : null;

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}

      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Pattern Atlas", href: "/patterns/atlas" },
                { label: "Compare" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Pattern Atlas · Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Side by side.
            <br />
            <span className="text-[#7a7a7a]">Same architecture.</span>
            <br />
            <span className="text-[#c9a96e] italic">Different wound.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            {enoughPatterns
              ? "Two or three patterns, laid against each other — so the differences you can feel but cannot yet name become differences you can see."
              : "Pick two or three Atlas patterns to lay against each other. The same nine-field structure, side by side, makes the architecture visible."}
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {enoughPatterns ? (
          <>
            <div className="mb-10 flex items-center justify-between flex-wrap gap-4">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
                {columns.length} patterns · {columns.length === 2 ? "duo" : "trio"} comparison
              </p>
              <Link
                href="/patterns/atlas"
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
              >
                ← Back to Atlas
              </Link>
            </div>

            <CompareTable columns={columns} />
          </>
        ) : (
          <NotEnoughPatterns columns={columns} />
        )}
      </div>
    </main>
  );
}

function NotEnoughPatterns({ columns }: { columns: CompareColumn[] }) {
  return (
    <div className="py-16 sm:py-24 text-center max-w-2xl mx-auto">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
        Select more patterns
      </p>
      <h2 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.015em] mb-6 leading-tight">
        {columns.length === 1
          ? "One more pattern to compare against."
          : "Choose at least two patterns to begin."}
      </h2>
      <p className="text-[#9a9a9a] text-base leading-[1.8] font-light mb-10">
        Open the Atlas, toggle compare mode, and pick two or three patterns.
        They will appear here side by side — same nine-field structure, so the
        architecture becomes visible.
      </p>
      <Link
        href="/patterns/atlas"
        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
      >
        Open the Pattern Atlas
        <span aria-hidden>→</span>
      </Link>

      {/* Suggested pairings — uses the first pattern (if any) to seed */}
      {columns.length === 1 && (
        <SuggestedPairings excludeSlug={columns[0].slug} />
      )}
    </div>
  );
}

function SuggestedPairings({ excludeSlug }: { excludeSlug: string }) {
  // Surface three patterns the user hasn't selected, prioritising ones in a
  // different cluster from the one they have. This is a small editorial nudge
  // to make the comparison illuminating rather than redundant.
  const selected = getAtlasPattern(excludeSlug);
  const selectedMeta = getAtlasMeta(excludeSlug);
  const candidates = ATLAS_PATTERNS.filter((p) => p.slug !== excludeSlug)
    .map((p) => ({ p, meta: getAtlasMeta(p.slug) }))
    .sort((a, b) => {
      // Different cluster first, then preserve atlas order.
      const aDiff = a.meta.cluster !== selectedMeta.cluster ? 0 : 1;
      const bDiff = b.meta.cluster !== selectedMeta.cluster ? 0 : 1;
      return aDiff - bDiff;
    })
    .slice(0, 3);

  if (!selected) return null;

  return (
    <div className="mt-16 pt-10 border-t border-white/[0.04] text-left">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light text-center">
        Suggested pairings
      </p>
      <ul className="space-y-3">
        {candidates.map(({ p, meta }) => {
          const compareUrl = `/patterns/atlas/compare?patterns=${encodeURIComponent(
            `${excludeSlug},${p.slug}`
          )}`;
          return (
            <li key={p.slug}>
              <Link
                href={compareUrl}
                className="block py-4 border-b border-white/[0.06] hover:border-[#c9a96e]/30 hover:bg-white/[0.01] transition-colors px-2 -mx-2 group"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-base sm:text-lg font-serif text-[#f0eee9] group-hover:text-[#c9a96e] transition-colors">
                      {selected.name} <span className="text-[#5a5a5a]">vs</span>{" "}
                      {p.name}
                    </p>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mt-1">
                      {selectedMeta.cluster} ↔ {meta.cluster}
                    </p>
                  </div>
                  <span className="text-[#c9a96e] text-sm shrink-0">→</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
