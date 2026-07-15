"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Search } from "lucide-react";
import {
  ATLAS_PATTERNS,
  type AtlasPattern,
} from "@/lib/content/patterns/atlas";
import {
  ATLAS_CLUSTERS,
  ATLAS_INTENSITIES,
  getAtlasMeta,
  type AtlasCluster,
  type AtlasIntensity,
} from "@/lib/content/patterns/micro-to-atlas";

/**
 * AtlasExplorer — interactive client component that replaces the static
 * atlas grid on /patterns/atlas.
 *
 * Features:
 *   - Filter bar: cluster pills, intensity pills, search-by-name input
 *   - Card grid: name (Playfair), cluster tag (Cinzel), 1-line tagline,
 *     3-dot intensity indicator (gold filled / dimmed)
 *   - Compare mode: toggle on, select 2-3 patterns via card click, then
 *     "Compare selected" routes to /patterns/atlas/compare?patterns=...
 *   - "Find your pattern" CTA → /patterns/atlas/quiz
 *   - Filter state syncs to URL query params (cluster, intensity, q) so
 *     filtered views are shareable/bookmarkable. URL is the source of
 *     truth — back/forward restores filters, and pasting a filtered URL
 *     opens the page already filtered.
 *   - Framer-motion AnimatePresence for smooth card enter/exit on filter
 *
 * Design system: bg #050505, gold #c9a96e, Playfair Display for names,
 * Cinzel for labels, mono for numbers. NO borders on cards — bottom
 * underline on hover. NO blue/indigo anywhere.
 *
 * SSR-safety: useSearchParams requires a Suspense boundary in Next.js 16
 * when used in a client component that may be streamed. We split the
 * component into AtlasExplorer (Suspense wrapper) and AtlasExplorerInner
 * (the actual implementation) so the page-level server component can
 * render <AtlasExplorer /> without needing to know about Suspense.
 */

const CINZEL = { fontFamily: "var(--font-cinzel)" } as const;

const MAX_COMPARE = 3;
const MIN_COMPARE = 2;

type ClusterFilter = AtlasCluster | "All";
type IntensityFilter = AtlasIntensity | "All";

// Re-export the patterns list with cluster + intensity inlined so the
// render path doesn't re-call getAtlasMeta on every render.
interface ExplorerPattern extends AtlasPattern {
  cluster: AtlasCluster | "Uncategorised";
  intensity: AtlasIntensity | "Unknown";
}

const PATTERNS: ExplorerPattern[] = ATLAS_PATTERNS.map((p) => {
  const meta = getAtlasMeta(p.slug);
  return { ...p, cluster: meta.cluster, intensity: meta.intensity };
});

function IntensityDots({
  intensity,
}: {
  intensity: AtlasIntensity | "Unknown";
}) {
  const level =
    intensity === "High" ? 3 : intensity === "Medium" ? 2 : intensity === "Low" ? 1 : 0;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Intensity: ${intensity}`}
      title={`Intensity: ${intensity}`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`block h-1.5 w-1.5 rounded-full transition-colors ${
            i < level ? "bg-[#c9a96e]" : "bg-[#2a2a2a]"
          }`}
        />
      ))}
      <span className="ml-1 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-mono">
        {intensity}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// URL ↔ state helpers
// ─────────────────────────────────────────────────────────────────────────

const VALID_CLUSTERS = new Set<string>([...ATLAS_CLUSTERS]);
const VALID_INTENSITIES = new Set<string>([...ATLAS_INTENSITIES]);

function parseCluster(value: string | null): ClusterFilter {
  if (value && VALID_CLUSTERS.has(value)) return value as AtlasCluster;
  return "All";
}

function parseIntensity(value: string | null): IntensityFilter {
  if (value && VALID_INTENSITIES.has(value)) return value as AtlasIntensity;
  return "All";
}

/**
 * Builds the URL search string for the current filter state. Empty / "All"
 * values are omitted so the URL stays clean. Returns null when no filters
 * are active (caller can skip the router.push in that case).
 */
function buildSearchString(
  cluster: ClusterFilter,
  intensity: IntensityFilter,
  query: string
): string {
  const params = new URLSearchParams();
  if (cluster !== "All") params.set("cluster", cluster);
  if (intensity !== "All") params.set("intensity", intensity);
  const q = query.trim();
  if (q) params.set("q", q);
  const str = params.toString();
  return str ? `?${str}` : "";
}

// ─────────────────────────────────────────────────────────────────────────
// Public export — Suspense wrapper so useSearchParams is safe
// ─────────────────────────────────────────────────────────────────────────

export default function AtlasExplorer() {
  return (
    <Suspense fallback={<AtlasExplorerFallback />}>
      <AtlasExplorerInner />
    </Suspense>
  );
}

function AtlasExplorerFallback() {
  // Minimal skeleton — same outer shell as the real explorer so the page
  // doesn't visually jump when the client mounts.
  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      <div className="h-px bg-white/[0.04]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inner — owns the filter + selection state, syncs to URL
// ─────────────────────────────────────────────────────────────────────────

function AtlasExplorerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL is the single source of truth for the filter state. We derive
  // cluster / intensity / query directly from searchParams on each render
  // (no useState), and the setters below write to the URL via router.replace.
  // This means back/forward navigation re-renders with the right filters
  // for free, and the URL is always shareable. No useEffect needed.
  const cluster: ClusterFilter = parseCluster(searchParams.get("cluster"));
  const intensity: IntensityFilter = parseIntensity(searchParams.get("intensity"));
  const query: string = searchParams.get("q") ?? "";

  // Local UI state — not URL-synced (compare selection is ephemeral).
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const updateUrl = useCallback(
    (next: { cluster?: ClusterFilter; intensity?: IntensityFilter; query?: string }) => {
      const merged = {
        cluster: next.cluster ?? cluster,
        intensity: next.intensity ?? intensity,
        query: next.query ?? query,
      };
      const searchString = buildSearchString(
        merged.cluster,
        merged.intensity,
        merged.query
      );
      router.replace(`/patterns/atlas${searchString}`, { scroll: false });
    },
    [router, cluster, intensity, query]
  );

  const setCluster = useCallback(
    (c: ClusterFilter) => updateUrl({ cluster: c }),
    [updateUrl]
  );
  const setIntensity = useCallback(
    (i: IntensityFilter) => updateUrl({ intensity: i }),
    [updateUrl]
  );
  const setQuery = useCallback(
    (q: string) => updateUrl({ query: q }),
    [updateUrl]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PATTERNS.filter((p) => {
      if (cluster !== "All" && p.cluster !== cluster) return false;
      if (intensity !== "All" && p.intensity !== intensity) return false;
      if (q) {
        const haystack = `${p.name} ${p.tagline} ${p.targetKeyword}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cluster, intensity, query]);

  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, slug];
    });
  };

  const clearSelection = () => setSelected([]);

  const compareUrl =
    selected.length >= MIN_COMPARE
      ? `/patterns/atlas/compare?patterns=${encodeURIComponent(selected.join(","))}`
      : null;

  const compareCount = selected.length;

  const resetFilters = useCallback(() => {
    updateUrl({ cluster: "All", intensity: "All", query: "" });
  }, [updateUrl]);

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      {/* ─── Filter bar ─── */}
      <div className="mb-10 sm:mb-12 space-y-6">
        {/* Cluster pills */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <span
            className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mr-2"
            style={CINZEL}
          >
            Cluster
          </span>
          {(["All", ...ATLAS_CLUSTERS] as const).map((c) => {
            const active = cluster === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCluster(c)}
                className={`relative pb-1.5 text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 cursor-pointer ${
                  active
                    ? "text-[#f0eee9]"
                    : "text-[#7a7a7a] hover:text-[#cfcabf]"
                }`}
                style={CINZEL}
              >
                {c}
                <span
                  className={`absolute left-0 right-0 -bottom-px h-px bg-[#c9a96e] transition-transform duration-300 origin-left ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Intensity pills + search + compare toggle */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span
              className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mr-2"
              style={CINZEL}
            >
              Intensity
            </span>
            {(["All", ...ATLAS_INTENSITIES] as const).map((i) => {
              const active = intensity === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensity(i)}
                  className={`relative pb-1.5 text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 cursor-pointer ${
                    active
                      ? "text-[#f0eee9]"
                      : "text-[#7a7a7a] hover:text-[#cfcabf]"
                  }`}
                  style={CINZEL}
                >
                  {i}
                  <span
                    className={`absolute left-0 right-0 -bottom-px h-px bg-[#c9a96e] transition-transform duration-300 origin-left ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Search + compare toggle */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="relative flex items-center group">
              <span className="sr-only">Search patterns</span>
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5a5a5a] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-44 sm:w-56 bg-transparent pl-6 pr-6 pb-1.5 text-[12px] text-[#f0eee9] placeholder:text-[#3a3a3a] font-light focus:outline-none border-b border-white/[0.06] focus:border-[#c9a96e]/60 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#c9a96e] transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>

            <button
              type="button"
              onClick={() => {
                setCompareMode((m) => !m);
                if (compareMode) clearSelection();
              }}
              className={`relative pb-1.5 text-[11px] tracking-[0.25em] uppercase transition-colors duration-300 cursor-pointer ${
                compareMode
                  ? "text-[#c9a96e]"
                  : "text-[#9a9a9a] hover:text-[#f0eee9]"
              }`}
              style={CINZEL}
              aria-pressed={compareMode}
            >
              {compareMode ? "Cancel compare" : "Compare"}
              <span
                className={`absolute left-0 right-0 -bottom-px h-px bg-[#c9a96e] transition-transform duration-300 origin-left ${
                  compareMode ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Result count + compare action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.04]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            {filtered.length} {filtered.length === 1 ? "pattern" : "patterns"}
            {cluster !== "All" && ` · ${cluster}`}
            {intensity !== "All" && ` · ${intensity} intensity`}
            {query.trim() && ` · “${query.trim()}”`}
          </p>

          <AnimatePresence>
            {compareMode && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-4"
              >
                <span
                  className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a]"
                  style={CINZEL}
                >
                  {compareCount} of {MAX_COMPARE} selected
                  {compareCount < MIN_COMPARE &&
                    ` · select ${MIN_COMPARE - compareCount} more`}
                </span>
                {compareUrl ? (
                  <Link
                    href={compareUrl}
                    className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/50 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                    style={CINZEL}
                  >
                    Compare selected
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#3a3a3a] pb-1"
                    style={CINZEL}
                  >
                    Compare selected
                  </span>
                )}
                {compareCount > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors cursor-pointer"
                    style={CINZEL}
                  >
                    Clear
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Card grid ─── */}
      {filtered.length === 0 ? (
        <div className="py-32 text-center">
          <p
            className="text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-4"
            style={CINZEL}
          >
            No patterns match
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1.5 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors cursor-pointer"
            style={CINZEL}
          >
            Reset filters
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-0"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((p, idx) => {
              const isSelected = selected.includes(p.slug);
              const isDisabled =
                compareMode && !isSelected && compareCount >= MAX_COMPARE;

              return (
                <motion.div
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative"
                >
                  {compareMode ? (
                    <button
                      type="button"
                      onClick={() => !isDisabled && toggleSelect(p.slug)}
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? "Remove" : "Add"} ${p.name} to comparison`}
                      className={`block w-full text-left group py-8 border-b transition-colors duration-300 ${
                        isSelected
                          ? "border-[#c9a96e]/60 bg-[#c9a96e]/[0.03]"
                          : isDisabled
                            ? "border-white/[0.04] opacity-40 cursor-not-allowed"
                            : "border-white/[0.06] hover:border-[#c9a96e]/40 hover:bg-white/[0.01] cursor-pointer"
                      } -mx-4 px-4`}
                    >
                      <PatternCardContents
                        pattern={p}
                        idx={idx}
                        isSelected={isSelected}
                      />
                    </button>
                  ) : (
                    <Link
                      href={`/patterns/atlas/${p.slug}`}
                      className="block group py-8 border-b border-white/[0.06] hover:border-[#c9a96e]/40 hover:bg-white/[0.01] transition-colors duration-300 -mx-4 px-4"
                    >
                      <PatternCardContents pattern={p} idx={idx} />
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── Find your pattern CTA ─── */}
      <div className="mt-24 pt-12 border-t border-white/[0.04]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
          <div>
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light"
              style={CINZEL}
            >
              Find your pattern
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-4">
              Don&apos;t know which of the ten patterns is yours? Take the
              seven-question Atlas quiz — it weighs your answers against the
              ten diagnostic structures and lands you on the one pattern that
              matches you most precisely.
            </p>
            <Link
              href="/patterns/atlas/quiz"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors"
              style={CINZEL}
            >
              Take the Atlas quiz
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div>
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light"
              style={CINZEL}
            >
              The sixty-second reading
            </p>
            <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-4">
              Shorter than the quiz, and shaped by your birth month: the
              micro-reading resolves your emotional pattern in three questions
              and links you back to the matching Atlas page.
            </p>
            <Link
              href="/#micro-reading"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              style={CINZEL}
            >
              Take the micro-reading
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card inner — kept stateless so it renders identically in compare-on,
// compare-off, and selected states. The wrapping element (Link vs button)
// is the only thing that changes.
// ─────────────────────────────────────────────────────────────────────────

function PatternCardContents({
  pattern,
  idx,
  isSelected = false,
}: {
  pattern: ExplorerPattern;
  idx: number;
  isSelected?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 items-baseline">
      <span className="col-span-2 sm:col-span-1 text-[#c9a96e]/50 font-mono text-xs pt-1">
        {String(idx + 1).padStart(2, "0")}
      </span>
      <div className="col-span-10 sm:col-span-11">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.015em] group-hover:text-[#c9a96e] transition-colors leading-tight">
            {pattern.name}
          </h2>
          {isSelected && (
            <span
              className="shrink-0 mt-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2 py-0.5"
              style={CINZEL}
            >
              Selected
            </span>
          )}
        </div>
        <p className="text-base sm:text-lg text-[#cfcabf] font-serif italic font-light leading-[1.5] mb-4">
          {pattern.tagline}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a]">
          <span style={CINZEL} className="text-[#c9a96e]/70">
            {pattern.cluster}
          </span>
          <span className="text-[#3a3a3a]">·</span>
          <IntensityDots intensity={pattern.intensity} />
          <span className="text-[#3a3a3a]">·</span>
          <span className="font-mono text-[10px]">
            {pattern.readTime} min
          </span>
        </div>
      </div>
    </div>
  );
}
