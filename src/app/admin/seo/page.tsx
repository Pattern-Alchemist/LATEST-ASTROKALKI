"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Globe,
  RefreshCw,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/**
 * /admin/seo — manage programmatic SEO city × pattern landing pages.
 *
 * Layout matches /admin/leads and /admin/programmatic:
 *   - dark bg #050505, gold accent #c9a96e
 *   - sticky header with back-link + refresh
 *   - summary panel (generated / missing / total / coverage %)
 *   - "Generate all 200 pages" button (calls /api/admin/seo/generate)
 *   - search + pattern filter + city filter
 *   - paginated table of generated pages with view link
 *
 * Endpoints:
 *   GET  /api/admin/seo/pages     — paginated list + summary + matrix
 *   POST /api/admin/seo/generate  — bulk LOCAL generate (no LLM, fast)
 *
 * The page is intentionally distinct from the older /admin/programmatic
 * surface (which uses the slower LLM-based generator). This page uses
 * the LOCAL generator which runs in seconds, not minutes.
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
}

interface CityMeta {
  name: string;
  state: string;
  slug: string;
  population: string;
}

interface ListResponse {
  pages: PageRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { total: number; generated: number; missing: number };
  patterns: PatternMeta[];
  cities: CityMeta[];
}

interface GenerateResult {
  slug: string;
  pattern: string;
  city: string;
  action: "created" | "updated" | "skipped";
}

interface GenerateResponse {
  success: boolean;
  summary: { total: number; created: number; updated: number; skipped: number };
  results: GenerateResult[];
}

export default function SeoAdmin() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ total: 0, generated: 0, missing: 0 });
  const [patterns, setPatterns] = useState<PatternMeta[]>([]);
  const [cities, setCities] = useState<CityMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [filterPattern, setFilterPattern] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      });
      if (filterPattern !== "all") params.set("pattern", filterPattern);
      if (filterCity !== "all") params.set("city", filterCity);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/seo/pages?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as ListResponse;
      setPages(data.pages);
      setPagination(data.pagination);
      setSummary(data.summary);
      setPatterns(data.patterns);
      setCities(data.cities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [page, filterPattern, filterCity, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateAll = useCallback(async () => {
    const missing = summary.missing;
    let msg: string;
    if (missing === 0) {
      msg = "All 200 programmatic pages already exist in the DB. Regenerate every page from the LOCAL template? (This overwrites admin edits.)";
    } else if (missing === summary.total) {
      msg = `Generate all ${missing} programmatic pages? This uses the LOCAL generator (no LLM) and runs in a few seconds.`;
    } else {
      msg = `Generate ${missing} missing programmatic pages? This uses the LOCAL generator (no LLM) and runs in a few seconds.`;
    }
    if (!confirm(msg)) return;

    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error || `Generation failed (${res.status})`);
      }
      const s = data.summary;
      setResult(
        `Done in seconds. Created ${s.created} · Updated ${s.updated} · Skipped ${s.skipped} (of ${s.total} combos).`
      );
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [summary, load]);

  const pct = summary.total > 0 ? Math.round((summary.generated / summary.total) * 100) : 0;

  const filteredCount = pagination.total;
  const showingFrom = filteredCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const showingTo = Math.min(filteredCount, pagination.page * pagination.pageSize);

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
              Local SEO Pages
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-2 font-light">
              City × Pattern landing pages — {patterns.length} patterns × {cities.length} cities = {summary.total} indexed pages.
              LOCAL generator (no LLM). Runs in seconds.
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="border border-white/[0.04] p-5 bg-white/[0.015]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">Generated</p>
            <p className="text-3xl font-serif font-light text-[#c9a96e]">
              {summary.generated}
              <span className="text-base text-[#5a5a5a]"> / {summary.total}</span>
            </p>
          </div>
          <div className="border border-white/[0.04] p-5 bg-white/[0.015]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">Missing</p>
            <p className="text-3xl font-serif font-light text-[#f0eee9]">{summary.missing}</p>
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
          <div className="border border-white/[0.04] p-5 bg-white/[0.015]">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">Generator</p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.6] flex items-start gap-2">
              <Sparkles className="size-3.5 text-[#c9a96e] mt-0.5 shrink-0" />
              <span>
                LOCAL template — no LLM, no rate limit, no API cost. ~1 second per batch.
              </span>
            </p>
          </div>
        </div>

        {/* Bulk action toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 border border-white/[0.04] bg-white/[0.015]">
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1">
              Bulk generation
            </p>
            <p className="text-xs text-[#9a9a9a] font-light">
              {summary.missing > 0
                ? `${summary.missing} page${summary.missing === 1 ? "" : "s"} to generate. The LOCAL generator runs in a single batch — no per-page delay.`
                : "All pages already in DB. Click to regenerate every page (overwrites admin edits)."}
            </p>
          </div>
          <button
            onClick={generateAll}
            disabled={generating}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b879] px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" fill="currentColor" />
            )}
            {generating
              ? "Generating…"
              : summary.missing === 0
                ? "Regenerate all"
                : `Generate all (${summary.missing})`}
          </button>
        </div>

        {/* Status / error / result messages */}
        {result && (
          <div className="mb-4 p-3 border border-[#c9a96e]/30 bg-[#c9a96e]/[0.06] text-[#c9a96e] text-sm font-light flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {result}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 border border-red-500/30 bg-red-500/[0.06] text-red-300 text-sm font-light flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="size-3.5 text-[#5a5a5a]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search slug, city, query…"
              className="flex-1 bg-[#050505] border border-white/[0.08] px-3 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-[#5a5a5a]" />
            <select
              value={filterPattern}
              onChange={(e) => {
                setFilterPattern(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setFilterCity(e.target.value);
                setPage(1);
              }}
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
                <th className="px-4 py-3 font-normal hidden sm:table-cell">Updated</th>
                <th className="px-4 py-3 font-normal text-right"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const pattern = patterns.find((x) => x.slug === p.pattern);
                const city = cities.find((c) => c.name === p.city);
                const viewHref = city
                  ? `/patterns/${city.slug}/${p.pattern}`
                  : `/local/${p.slug}`;
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
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={viewHref}
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
              {pages.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[#5a5a5a] font-light"
                  >
                    {summary.generated === 0
                      ? "No pages generated yet. Click “Generate all” to begin — runs in seconds."
                      : "No pages match the current filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light">
              Showing {showingFrom}–{showingTo} of {filteredCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="inline-flex items-center gap-1 text-[11px] tracking-[0.2em] uppercase text-[#9a9a9a] hover:text-[#c9a96e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </button>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages || loading}
                className="inline-flex items-center gap-1 text-[11px] tracking-[0.2em] uppercase text-[#9a9a9a] hover:text-[#c9a96e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
