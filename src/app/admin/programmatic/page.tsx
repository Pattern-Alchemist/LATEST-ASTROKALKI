"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Play,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  Filter,
  Search,
} from "lucide-react";

/**
 * /admin/programmatic — manage programmatic SEO pages.
 *
 * Layout matches /admin/leads and /admin/tts:
 *   - dark bg #050505, gold accent #c9a96e
 *   - header with back-link + refresh
 *   - summary panel (generated / missing / total)
 *   - "Generate all" button (calls /api/admin/programmatic/generate-all)
 *   - filter by pattern + city
 *   - table of generated pages with view link
 *
 * Endpoints:
 *   GET  /api/admin/programmatic              — list + matrix + summary
 *   POST /api/admin/programmatic              — generate one combo (or all for a pattern/city)
 *   POST /api/admin/programmatic/generate-all — bulk generate all 200 (sequential, 1s/call)
 */

interface PageRow {
  id: string;
  slug: string;
  pattern: string;
  city: string;
  state: string | null;
  searchQuery: string;
  createdAt: string;
  updatedAt: string;
}

interface PatternMeta {
  slug: string;
  name: string;
  tagline: string;
}

interface CityMeta {
  name: string;
  state: string;
  slug: string;
}

interface ListResponse {
  pages: PageRow[];
  summary: { total: number; generated: number; missing: number };
  patterns: PatternMeta[];
  cities: CityMeta[];
}

interface GenerateResult {
  slug: string;
  pattern: string;
  city: string;
  status: "generated" | "skipped" | "failed";
  error?: string;
}

export default function ProgrammaticAdmin() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [patterns, setPatterns] = useState<PatternMeta[]>([]);
  const [cities, setCities] = useState<CityMeta[]>([]);
  const [summary, setSummary] = useState({ total: 0, generated: 0, missing: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterPattern, setFilterPattern] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/programmatic");
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as ListResponse;
      setPages(data.pages);
      setPatterns(data.patterns);
      setCities(data.cities);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ─── Filtered rows ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = pages.slice();
    if (filterPattern !== "all") list = list.filter((p) => p.pattern === filterPattern);
    if (filterCity !== "all") list = list.filter((p) => p.city.toLowerCase().replace(/\s+/g, "-") === filterCity);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.slug.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.searchQuery.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pages, filterPattern, filterCity, search]);

  // ─── Generate a single combo ────────────────────────────────────────
  const generateCombo = useCallback(
    async (patternSlug: string, citySlug: string) => {
      setBusyKey(`${patternSlug}:${citySlug}`);
      setError(null);
      try {
        const res = await fetch("/api/admin/programmatic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pattern: patternSlug, city: citySlug, force: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        const result = (data.results as GenerateResult[])?.[0];
        if (result?.status === "failed") {
          setError(`Failed: ${result.error || "unknown error"}`);
        } else {
          await load();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setBusyKey(null);
      }
    },
    [load]
  );

  // ─── Generate all 200 ───────────────────────────────────────────────
  const generateAll = useCallback(async () => {
    const missing = summary.missing;
    if (missing === 0) {
      if (!confirm("All 200 pages already generated. Regenerate every page from scratch?")) return;
    } else {
      const msg =
        missing === summary.total
          ? `Generate all ${missing} programmatic pages? This runs sequentially (1 call/sec) and takes 7-8 minutes. Leave this tab open.`
          : `Generate ${missing} missing programmatic pages? This runs sequentially (1 call/sec) and may take a few minutes. Leave this tab open.`;
      if (!confirm(msg)) return;
    }
    setBatchRunning(true);
    setError(null);
    setBatchResult(null);
    try {
      const res = await fetch("/api/admin/programmatic/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Bulk generation failed (${res.status})`);
      }
      const s = data.summary;
      setBatchResult(
        `Done. Generated ${s.generated} / ${s.processed}. Failed: ${s.failed}. Skipped: ${s.skipped}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk generation failed");
    } finally {
      setBatchRunning(false);
    }
  }, [summary, load]);

  // ─── Matrix view: which (pattern × city) are generated ──────────────
  // Render a compact grid — patterns as rows, cities as columns. Cell is
  // gold if generated, dim if missing. Click a cell to (re)generate that
  // combo. Skipped if the page list is empty (no point showing a 10×20
  // empty grid).
  const matrixCellState = useCallback(
    (patternSlug: string, cityName: string): "generated" | "missing" => {
      const slug = `${patternSlug}-${cityName.toLowerCase().replace(/\s+/g, "-")}`;
      return pages.some((p) => p.slug === slug) ? "generated" : "missing";
    },
    [pages]
  );

  const pct = summary.total > 0 ? Math.round((summary.generated / summary.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <a
              href="/admin"
              className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] block mb-2"
            >
              ← Back to /admin
            </a>
            <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-[-0.02em] flex items-center gap-3">
              <Globe className="size-7 text-[#c9a96e]" />
              Programmatic SEO
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-2 font-light">
              City × Pattern landing pages — 10 patterns × 20 cities = 200 indexed pages.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {/* Summary panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-white/[0.04] p-5 bg-white/[0.015]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">Generated</p>
            <p className="text-3xl font-serif font-light text-[#c9a96e]">
              {summary.generated}
              <span className="text-base text-[#5a5a5a]"> / {summary.total}</span>
            </p>
          </div>
          <div className="border border-white/[0.04] p-5 bg-white/[0.015]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">Missing</p>
            <p className="text-3xl font-serif font-light text-[#f0eee9]">
              {summary.missing}
            </p>
          </div>
          <div className="border border-white/[0.04] p-5 bg-white/[0.015]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">Coverage</p>
            <p className="text-3xl font-serif font-light text-[#f0eee9]">{pct}%</p>
            <div className="mt-3 h-1 bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-[#c9a96e] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bulk action toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 border border-white/[0.04] bg-white/[0.015]">
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1">
              Bulk generation
            </p>
            <p className="text-xs text-[#9a9a9a] font-light">
              Generates every missing page sequentially with a 1-second delay between LLM calls.
              {summary.missing > 0
                ? ` ${summary.missing} page${summary.missing === 1 ? "" : "s"} to generate.`
                : " All 200 already generated — click to regenerate."}
            </p>
          </div>
          <button
            onClick={generateAll}
            disabled={batchRunning}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b879] px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {batchRunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" fill="currentColor" />
            )}
            {batchRunning
              ? "Generating…"
              : summary.missing === 0
                ? "Regenerate all"
                : `Generate all (${summary.missing})`}
          </button>
        </div>

        {/* Status / error / result messages */}
        {batchResult && (
          <div className="mb-4 p-3 border border-[#c9a96e]/30 bg-[#c9a96e]/[0.06] text-[#c9a96e] text-sm font-light flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {batchResult}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 border border-red-500/30 bg-red-500/[0.06] text-red-300 text-sm font-light flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Matrix — patterns × cities coverage grid */}
        {patterns.length > 0 && cities.length > 0 && (
          <section className="mb-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-3 font-light">
              Coverage matrix
            </p>
            <div className="border border-white/[0.04] overflow-x-auto">
              <table className="w-full text-[10px] tracking-[0.05em]">
                <thead>
                  <tr className="text-left text-[#5a5a5a] border-b border-white/[0.04]">
                    <th className="px-3 py-2 font-normal sticky left-0 bg-[#050505] z-10">Pattern</th>
                    {cities.map((c) => (
                      <th
                        key={c.slug}
                        className="px-1 py-2 font-normal text-center"
                        title={c.name}
                      >
                        {c.slug.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patterns.map((p) => (
                    <tr key={p.slug} className="border-b border-white/[0.03]">
                      <td
                        className="px-3 py-2 text-[#9a9a9a] font-light sticky left-0 bg-[#050505] z-10 whitespace-nowrap"
                        title={p.name}
                      >
                        {p.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "")}
                      </td>
                      {cities.map((c) => {
                        const state = matrixCellState(p.slug, c.name);
                        const key = `${p.slug}:${c.slug}`;
                        const isBusy = busyKey === key;
                        return (
                          <td key={c.slug} className="px-1 py-1 text-center">
                            <button
                              onClick={() => generateCombo(p.slug, c.slug)}
                              disabled={isBusy || batchRunning}
                              title={`${p.name} · ${c.name} — ${state === "generated" ? "regenerate" : "generate"}`}
                              className={`inline-block size-4 rounded-sm transition-colors disabled:opacity-40 ${
                                state === "generated"
                                  ? "bg-[#c9a96e] hover:bg-[#d4b879]"
                                  : "bg-white/[0.06] hover:bg-[#c9a96e]/40"
                              }`}
                            >
                              {isBusy && (
                                <Loader2 className="size-3 animate-spin text-[#050505] mx-auto" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-2 font-light">
              Gold = generated · Dim = missing · Click any cell to (re)generate that combo
            </p>
          </section>
        )}

        {/* Generated pages table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 font-light">
              Generated pages ({filtered.length})
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="size-3.5 text-[#5a5a5a]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search slug, city, query…"
                className="flex-1 bg-[#050505] border border-white/[0.08] px-3 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-[#5a5a5a]" />
              <select
                value={filterPattern}
                onChange={(e) => setFilterPattern(e.target.value)}
                className="bg-[#050505] border border-white/[0.08] px-3 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
              >
                <option value="all">All patterns</option>
                {patterns.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="bg-[#050505] border border-white/[0.08] px-3 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
              >
                <option value="all">All cities</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-white/[0.04] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border-b border-white/[0.04]">
                  <th className="px-4 py-3 font-normal">Pattern</th>
                  <th className="px-4 py-3 font-normal">City</th>
                  <th className="px-4 py-3 font-normal">Slug</th>
                  <th className="px-4 py-3 font-normal hidden md:table-cell">Search Query</th>
                  <th className="px-4 py-3 font-normal hidden sm:table-cell">Created</th>
                  <th className="px-4 py-3 font-normal text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const pattern = patterns.find((x) => x.slug === p.pattern);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.015]"
                    >
                      <td className="px-4 py-3 text-[#c9a96e] font-light">
                        {pattern?.name ?? p.pattern}
                      </td>
                      <td className="px-4 py-3 text-[#f0eee9] font-light">
                        {p.city}
                        {p.state ? (
                          <span className="text-[#5a5a5a] text-xs ml-1">· {p.state}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[#9a9a9a] font-light font-mono text-xs">
                        {p.slug}
                      </td>
                      <td className="px-4 py-3 text-[#9a9a9a] font-light text-xs hidden md:table-cell">
                        {p.searchQuery}
                      </td>
                      <td className="px-4 py-3 text-[#5a5a5a] font-light text-xs hidden sm:table-cell">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/local/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] tracking-[0.2em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                          title="View live page"
                        >
                          <ExternalLink className="size-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-[#5a5a5a] font-light"
                    >
                      {pages.length === 0
                        ? "No pages generated yet. Click “Generate all” to begin."
                        : "No pages match the current filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
