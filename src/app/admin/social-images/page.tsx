"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ImageIcon,
  ExternalLink,
  Sparkles,
} from "lucide-react";

/**
 * /admin/social-images — manage AI-generated social share images for every
 * article + atlas pattern + guide.
 *
 * Layout matches /admin/leads + /admin/tts:
 *   - dark bg #050505, gold accent #c9a96e
 *   - header with back-link + refresh button
 *   - toolbar with "Generate all missing" button
 *   - filter chips (all / generated / missing / articles / atlas / guides)
 *   - responsive grid of cards — each card shows the image preview (or a
 *     placeholder if not yet generated), title, status, and a per-row
 *     generate/regenerate button
 *
 * Endpoints used:
 *   GET  /api/admin/social-images              — list + status
 *   POST /api/ai/social-image                  — per-slug generate (force=false → skip)
 *                                                 with force=true → regenerate
 *   POST /api/ai/social-image/generate-all     — bulk generate missing
 */

type Kind = "article" | "atlas" | "guide";

interface Item {
  slug: string;
  title: string;
  kind: Kind;
  cluster?: string;
  category: string;
  status: "generated" | "missing";
  imageUrl?: string;
  prompt?: string;
  createdAt?: string;
}

interface Summary {
  total: number;
  generated: number;
  missing: number;
  byKind: {
    article: { total: number; generated: number };
    atlas: { total: number; generated: number };
    guide: { total: number; generated: number };
  };
}

interface ListResponse {
  items: Item[];
  summary: Summary;
}

type Filter = "all" | "generated" | "missing" | "articles" | "atlas" | "guides";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function articleHref(item: Item): string {
  if (item.kind === "guide") return `/guides/${item.slug}`;
  if (item.kind === "atlas") return `/patterns/atlas/${item.slug}`;
  return `/insights/${item.slug}`;
}

export default function SocialImagesAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    generated: 0,
    missing: 0,
    byKind: {
      article: { total: 0, generated: 0 },
      atlas: { total: 0, generated: 0 },
      guide: { total: 0, generated: 0 },
    },
  });
  const [loading, setLoading] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social-images");
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as ListResponse;
      setItems(data.items);
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

  // ─── Per-slug generate ─────────────────────────────────────────────
  const generateSlug = useCallback(
    async (item: Item, force: boolean) => {
      setBusySlug(item.slug);
      setError(null);
      try {
        const res = await fetch("/api/ai/social-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: item.slug,
            type: item.kind,
            force,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.error || data.message || `Failed (${res.status})`
          );
        }
        if (data.skipped) {
          setError(
            `"${item.title}" already has a social image — click "Regenerate" to overwrite.`
          );
        } else {
          // Refresh list so the card reflects new state.
          await load();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setBusySlug(null);
      }
    },
    [load]
  );

  // ─── Bulk generate ─────────────────────────────────────────────────
  const generateAll = useCallback(async () => {
    if (summary.missing === 0) {
      setError(
        "Nothing missing — all articles, atlas patterns, and guides already have social images."
      );
      return;
    }
    if (
      !confirm(
        `Generate ${summary.missing} missing social image${
          summary.missing === 1 ? "" : "s"
        }?\n\nThis runs sequentially and can take 10–25 minutes. Leave this tab open.`
      )
    ) {
      return;
    }
    setBatchRunning(true);
    setError(null);
    setBatchResult(null);
    try {
      const res = await fetch("/api/ai/social-image/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || `Bulk generation failed (${res.status})`
        );
      }
      const s = data.summary;
      setBatchResult(
        `Generated ${s.generated} / ${s.processed}. Failed: ${s.failed}. Skipped: ${s.skipped}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk generation failed");
    } finally {
      setBatchRunning(false);
    }
  }, [summary.missing, load]);

  // ─── Filtering ─────────────────────────────────────────────────────
  const visibleItems = (() => {
    let list = items.slice();
    if (filter === "articles") list = list.filter((i) => i.kind === "article");
    if (filter === "atlas") list = list.filter((i) => i.kind === "atlas");
    if (filter === "guides") list = list.filter((i) => i.kind === "guide");
    if (filter === "missing") list = list.filter((i) => i.status === "missing");
    if (filter === "generated")
      list = list.filter((i) => i.status === "generated");
    return list;
  })();

  const previewItem = previewSlug
    ? items.find((i) => i.slug === previewSlug)
    : null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <a
              href="/admin"
              className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] block mb-2"
            >
              ← Back to /admin
            </a>
            <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-[-0.02em]">
              Social Share Images
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-2 font-light">
              AI-generated OG cards in the AstroKalki aesthetic.{" "}
              {summary.generated} of {summary.total} ready · {summary.missing}{" "}
              pending.
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

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 border border-white/[0.04] bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <Sparkles className="size-4 text-[#c9a96e]/70" />
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
              One card per article · atlas pattern · guide · 1344 × 768 ·
              AstroKalki cinematic aesthetic
            </p>
          </div>

          <div className="flex-1" />

          {/* Generate all missing */}
          <button
            onClick={generateAll}
            disabled={batchRunning || summary.missing === 0}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b879] px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {batchRunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" fill="currentColor" />
            )}
            {batchRunning
              ? "Generating…"
              : `Generate all missing (${summary.missing})`}
          </button>
        </div>

        {/* Status / error messages */}
        {batchResult && (
          <div className="mb-4 p-3 border border-[#c9a96e]/30 bg-[#c9a96e]/[0.04] flex items-start gap-3">
            <CheckCircle2 className="size-4 text-[#c9a96e] mt-0.5 shrink-0" />
            <p className="text-sm text-[#cfcabf] font-light">{batchResult}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 border border-red-400/30 bg-red-400/[0.04] flex items-start gap-3">
            <AlertCircle className="size-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300/90 font-light">{error}</p>
          </div>
        )}

        {/* Per-kind summary chips */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(
            [
              {
                id: "article",
                label: "Articles",
                total: summary.byKind.article.total,
                generated: summary.byKind.article.generated,
              },
              {
                id: "atlas",
                label: "Atlas Patterns",
                total: summary.byKind.atlas.total,
                generated: summary.byKind.atlas.generated,
              },
              {
                id: "guide",
                label: "Guides",
                total: summary.byKind.guide.total,
                generated: summary.byKind.guide.generated,
              },
            ] as const
          ).map((k) => (
            <div
              key={k.id}
              className="border border-white/[0.04] bg-white/[0.015] p-3 text-center"
            >
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] font-light mb-1">
                {k.label}
              </p>
              <p className="text-lg font-serif text-[#f0eee9] font-light">
                {k.generated}
                <span className="text-[#5a5a5a] text-sm"> / {k.total}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            [
              { id: "all", label: "All", count: summary.total },
              { id: "generated", label: "Generated", count: summary.generated },
              { id: "missing", label: "Missing", count: summary.missing },
              {
                id: "articles",
                label: "Articles",
                count: summary.byKind.article.total,
              },
              {
                id: "atlas",
                label: "Atlas",
                count: summary.byKind.atlas.total,
              },
              {
                id: "guides",
                label: "Guides",
                count: summary.byKind.guide.total,
              },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-[10px] tracking-[0.25em] uppercase font-light transition-colors border ${
                filter === f.id
                  ? "border-[#c9a96e]/60 text-[#c9a96e] bg-[#c9a96e]/[0.05]"
                  : "border-white/[0.06] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.12]"
              }`}
            >
              {f.label}{" "}
              <span className="ml-1 text-[#5a5a5a]">({f.count})</span>
            </button>
          ))}
        </div>

        {/* Card grid */}
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="border border-white/[0.04] bg-[#0a0a0a] p-3 animate-pulse"
              >
                <div className="aspect-[1344/768] bg-[#141414] mb-3" />
                <div className="h-3 w-2/3 bg-[#141414] mb-2" />
                <div className="h-3 w-1/3 bg-[#141414]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map((item) => {
              const href = articleHref(item);
              return (
                <article
                  key={`${item.kind}-${item.slug}`}
                  className="border border-white/[0.04] bg-[#0a0a0a] p-3 flex flex-col hover:border-[#c9a96e]/20 transition-colors"
                >
                  {/* Image preview / placeholder */}
                  <div className="relative aspect-[1344/768] bg-[#050505] border border-[#c9a96e]/20 mb-3 overflow-hidden group">
                    {item.status === "generated" && item.imageUrl ? (
                      <img
                        src={`${item.imageUrl}?t=${item.createdAt ? Date.parse(item.createdAt) : 0}`}
                        alt={`Social share image for ${item.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => setPreviewSlug(item.slug)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#3a3a3a]">
                        <ImageIcon className="size-8" />
                        <span className="text-[10px] tracking-[0.3em] uppercase">
                          Not generated
                        </span>
                      </div>
                    )}

                    {/* Top-left status badge */}
                    <div className="absolute top-2 left-2">
                      {item.status === "generated" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#050505]/80 backdrop-blur-sm text-[9px] tracking-[0.2em] uppercase text-emerald-400/90 border border-emerald-400/20">
                          <CheckCircle2 className="size-2.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#050505]/80 backdrop-blur-sm text-[9px] tracking-[0.2em] uppercase text-yellow-400/80 border border-yellow-400/20">
                          <AlertCircle className="size-2.5" />
                          Missing
                        </span>
                      )}
                    </div>

                    {/* Top-right kind badge */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-1.5 py-0.5 bg-[#050505]/80 backdrop-blur-sm text-[9px] tracking-[0.2em] uppercase border ${
                          item.kind === "guide"
                            ? "text-[#c9a96e]/80 border-[#c9a96e]/20"
                            : item.kind === "atlas"
                              ? "text-[#d4b879]/80 border-[#d4b879]/20"
                              : "text-[#7a7a7a] border-white/[0.06]"
                        }`}
                      >
                        {item.kind}
                      </span>
                    </div>
                  </div>

                  {/* Title + cluster */}
                  <div className="flex-1 mb-3">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#f0eee9] text-sm font-light hover:text-[#c9a96e] transition-colors line-clamp-2 leading-snug"
                      title={item.title}
                    >
                      {item.title}
                    </a>
                    <p className="text-[10px] text-[#5a5a5a] mt-1.5 font-light tracking-wider">
                      {item.cluster || item.kind} ·{" "}
                      <span className="font-mono">{item.slug}</span>
                    </p>
                    {item.createdAt && (
                      <p className="text-[10px] text-[#5a5a5a] mt-0.5 font-light">
                        {formatDate(item.createdAt)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {item.status === "generated" ? (
                      <>
                        <button
                          onClick={() => setPreviewSlug(item.slug)}
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors px-2 py-1.5 border border-white/[0.06] hover:border-[#c9a96e]/30"
                          title="Preview image + prompt"
                        >
                          <ExternalLink className="size-3" />
                          Preview
                        </button>
                        <button
                          onClick={() => generateSlug(item, true)}
                          disabled={busySlug === item.slug || batchRunning}
                          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2.5 py-1.5 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Regenerate (overwrite)"
                        >
                          {busySlug === item.slug ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          Regenerate
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => generateSlug(item, false)}
                        disabled={busySlug === item.slug || batchRunning}
                        className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2.5 py-1.5 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Generate social image"
                      >
                        {busySlug === item.slug ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Play className="size-3" fill="currentColor" />
                        )}
                        Generate
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {visibleItems.length === 0 && !loading && (
          <div className="border border-white/[0.04] p-12 text-center text-[#5a5a5a] font-light">
            No items match the current filter.
          </div>
        )}

        {/* Footer note */}
        <p className="mt-6 text-[11px] text-[#5a5a5a] font-light leading-relaxed max-w-3xl">
          Image generation is rate-limited to 5 per hour per admin
          (single-card endpoint) and 1 batch per 10 minutes (bulk endpoint).
          Generation runs sequentially and can take 15–30 seconds per card.
          Images are stored in{" "}
          <code className="text-[#7a7a7a] font-mono">
            public/social-images/&lt;slug&gt;.png
          </code>{" "}
          and served at{" "}
          <code className="text-[#7a7a7a] font-mono">
            /api/ai/social-image/&lt;slug&gt;
          </code>{" "}
          (which falls back to{" "}
          <code className="text-[#7a7a7a] font-mono">/api/og</code> if no card
          has been generated yet).
        </p>
      </div>

      {/* ─── Preview modal ─────────────────────────────────────────── */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setPreviewSlug(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#0a0a0a] border border-[#c9a96e]/20 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-1">
                  {previewItem.kind} ·{" "}
                  {previewItem.cluster || previewItem.kind}
                </p>
                <h2 className="text-xl font-serif font-light text-[#f0eee9] truncate">
                  {previewItem.title}
                </h2>
                <p className="text-[10px] text-[#5a5a5a] mt-1 font-mono">
                  {previewItem.slug}
                </p>
              </div>
              <button
                onClick={() => setPreviewSlug(null)}
                className="text-[#7a7a7a] hover:text-[#c9a96e] transition-colors text-sm tracking-[0.2em] uppercase shrink-0"
              >
                Close ✕
              </button>
            </div>

            {previewItem.imageUrl && (
              <div className="border border-[#c9a96e]/20 mb-4">
                <img
                  src={previewItem.imageUrl}
                  alt={`Social share image for ${previewItem.title}`}
                  className="w-full h-auto"
                />
              </div>
            )}

            {previewItem.prompt && (
              <div className="space-y-2">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a]">
                  Generation prompt
                </p>
                <p className="text-xs text-[#9a9a9a] font-light leading-relaxed bg-[#050505] border border-white/[0.04] p-3">
                  {previewItem.prompt}
                </p>
              </div>
            )}

            {previewItem.imageUrl && (
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <a
                  href={previewItem.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-3 py-1.5 hover:bg-[#c9a96e]/10 transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="size-3" />
                  Open raw PNG
                </a>
                <a
                  href={`/api/ai/social-image/${encodeURIComponent(previewItem.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-3 py-1.5 hover:bg-[#c9a96e]/10 transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="size-3" />
                  Open via /api/ai/social-image
                </a>
                <a
                  href={`/api/og?slug=${encodeURIComponent(previewItem.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] border border-white/[0.06] hover:text-[#c9a96e] hover:border-[#c9a96e]/30 px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="size-3" />
                  Open via /api/og
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
