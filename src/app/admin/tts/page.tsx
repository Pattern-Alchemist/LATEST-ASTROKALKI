"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Play,
  RotateCcw,
  Download,
  Clock,
  HardDrive,
  Mic,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

/**
 * /admin/tts — manage TTS narrations for articles + guides.
 *
 * Layout matches /admin/leads:
 *   - dark bg #050505, gold accent #c9a96e
 *   - header with back-link + refresh button
 *   - toolbar with "Generate all missing" + voice selector
 *   - table with per-row status + per-row generate/regenerate button
 *   - duration + file size for generated rows
 *
 * Endpoints used:
 *   GET  /api/admin/tts             — list + status
 *   POST /api/admin/tts/generate-all — bulk generate
 *   POST /api/ai/tts                — per-slug generate (force=false → skip existing)
 *                                     with force=true → regenerate
 */

type Voice = 'tongtong' | 'chuichui' | 'xiaochen' | 'jam' | 'kazi' | 'douji' | 'luodo';

const VOICES: { id: Voice; label: string; description: string }[] = [
  { id: 'tongtong', label: 'Tong Tong', description: 'Warm narrator (default)' },
  { id: 'chuichui', label: 'Chui Chui', description: 'Calm, measured' },
  { id: 'xiaochen', label: 'Xiao Chen', description: 'Soft, intimate' },
  { id: 'jam', label: 'Jam', description: 'Crisp, articulate' },
  { id: 'kazi', label: 'Kazi', description: 'Lower register' },
  { id: 'douji', label: 'Dou Ji', description: 'Reflective' },
  { id: 'luodo', label: 'Luodo', description: 'Steady, deliberate' },
];

interface Item {
  slug: string;
  title: string;
  kind: 'article' | 'guide';
  cluster?: string;
  status: 'generated' | 'missing';
  durationSec?: number;
  fileSizeBytes?: number;
  voice?: string;
  createdAt?: string;
  audioUrl?: string;
}

interface Summary {
  total: number;
  generated: number;
  missing: number;
}

interface ListResponse {
  items: Item[];
  summary: Summary;
  voices: string[];
}

type SortKey = 'kind' | 'title' | 'status' | 'duration' | 'size';
type SortDir = 'asc' | 'desc';

function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function TtsAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, generated: 0, missing: 0 });
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState<Voice>('tongtong');
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'articles' | 'guides' | 'missing' | 'generated'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tts');
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as ListResponse;
      setItems(data.items);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ─── Per-slug generate ─────────────────────────────────────────────
  const generateSlug = useCallback(
    async (slug: string, force: boolean) => {
      setBusySlug(slug);
      setError(null);
      try {
        const res = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, force, voice }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.message || `Failed (${res.status})`);
        }
        if (data.skipped) {
          setError(`"${slug}" already has a narration — click "Regenerate" to overwrite.`);
        } else {
          // Refresh list so the row reflects new state.
          await load();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setBusySlug(null);
      }
    },
    [voice, load]
  );

  // ─── Bulk generate ─────────────────────────────────────────────────
  const generateAll = useCallback(async () => {
    if (summary.missing === 0) {
      setError('Nothing missing — all articles + guides already have narrations.');
      return;
    }
    if (
      !confirm(
        `Generate ${summary.missing} missing narration${summary.missing === 1 ? '' : 's'} in voice "${voice}"?\n\nThis runs sequentially and can take 5–10 minutes. Leave this tab open.`
      )
    ) {
      return;
    }
    setBatchRunning(true);
    setError(null);
    setBatchResult(null);
    try {
      const res = await fetch('/api/admin/tts/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Bulk generation failed (${res.status})`);
      }
      const s = data.summary;
      setBatchResult(
        `Generated ${s.generated} / ${s.processed}. Failed: ${s.failed}. Skipped: ${s.skipped}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk generation failed');
    } finally {
      setBatchRunning(false);
    }
  }, [summary.missing, voice, load]);

  // ─── Sorting + filtering ───────────────────────────────────────────
  const visibleItems = (() => {
    let list = items.slice();
    if (filter === 'articles') list = list.filter((i) => i.kind === 'article');
    if (filter === 'guides') list = list.filter((i) => i.kind === 'guide');
    if (filter === 'missing') list = list.filter((i) => i.status === 'missing');
    if (filter === 'generated') list = list.filter((i) => i.status === 'generated');

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'kind':
          cmp = a.kind.localeCompare(b.kind);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'duration':
          cmp = (a.durationSec ?? 0) - (b.durationSec ?? 0);
          break;
        case 'size':
          cmp = (a.fileSizeBytes ?? 0) - (b.fileSizeBytes ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  })();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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
              Audio Narrations
            </h1>
            <p className="text-sm text-[#7a7a7a] mt-2 font-light">
              Generate TTS narrations for articles + pillar guides. {summary.generated} of {summary.total} ready · {summary.missing} pending.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 border border-white/[0.04] bg-white/[0.015]">
          {/* Voice selector */}
          <div className="flex items-center gap-3">
            <Mic className="size-4 text-[#c9a96e]/70" />
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a]">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value as Voice)}
              className="bg-[#050505] border border-white/[0.08] px-3 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — {v.description}
                </option>
              ))}
            </select>
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
              ? 'Generating…'
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { id: 'all', label: 'All', count: summary.total },
            { id: 'generated', label: 'Generated', count: summary.generated },
            { id: 'missing', label: 'Missing', count: summary.missing },
            { id: 'articles', label: 'Articles', count: items.filter((i) => i.kind === 'article').length },
            { id: 'guides', label: 'Guides', count: items.filter((i) => i.kind === 'guide').length },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-[10px] tracking-[0.25em] uppercase font-light transition-colors border ${
                filter === f.id
                  ? 'border-[#c9a96e]/60 text-[#c9a96e] bg-[#c9a96e]/[0.05]'
                  : 'border-white/[0.06] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.12]'
              }`}
            >
              {f.label} <span className="ml-1 text-[#5a5a5a]">({f.count})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-white/[0.04] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border-b border-white/[0.04]">
                <th
                  className="px-4 py-3 font-normal cursor-pointer hover:text-[#c9a96e] transition-colors"
                  onClick={() => toggleSort('kind')}
                >
                  Type {sortKey === 'kind' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 font-normal cursor-pointer hover:text-[#c9a96e] transition-colors"
                  onClick={() => toggleSort('title')}
                >
                  Title {sortKey === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 font-normal cursor-pointer hover:text-[#c9a96e] transition-colors"
                  onClick={() => toggleSort('status')}
                >
                  Status {sortKey === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 font-normal cursor-pointer hover:text-[#c9a96e] transition-colors"
                  onClick={() => toggleSort('duration')}
                >
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> Duration
                  </span>{' '}
                  {sortKey === 'duration' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 font-normal cursor-pointer hover:text-[#c9a96e] transition-colors"
                  onClick={() => toggleSort('size')}
                >
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="size-3" /> Size
                  </span>{' '}
                  {sortKey === 'size' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-normal">Voice</th>
                <th className="px-4 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr
                  key={`${item.kind}-${item.slug}`}
                  className="border-b border-white/[0.04] hover:bg-white/[0.015]"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] tracking-[0.2em] uppercase ${
                        item.kind === 'guide' ? 'text-[#c9a96e]/80' : 'text-[#7a7a7a]'
                      }`}
                    >
                      {item.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={item.kind === 'guide' ? `/guides/${item.slug}` : `/insights/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#f0eee9] font-light hover:text-[#c9a96e] transition-colors block max-w-md truncate"
                      title={item.title}
                    >
                      {item.title}
                    </a>
                    {item.cluster && (
                      <span className="text-[10px] text-[#5a5a5a] font-light">{item.cluster}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'generated' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-emerald-400/80">
                        <CheckCircle2 className="size-3.5" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-yellow-400/70">
                        <AlertCircle className="size-3.5" />
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#9a9a9a] font-mono text-xs">
                    {formatDuration(item.durationSec)}
                  </td>
                  <td className="px-4 py-3 text-[#9a9a9a] font-mono text-xs">
                    {formatFileSize(item.fileSizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-[#9a9a9a] font-light text-xs">
                    {item.voice || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {item.status === 'generated' && item.audioUrl && (
                        <a
                          href={item.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
                          title="Download MP3"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                      {item.status === 'generated' ? (
                        <button
                          onClick={() => generateSlug(item.slug, true)}
                          disabled={busySlug === item.slug || batchRunning}
                          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2.5 py-1 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Regenerate (overwrite)"
                        >
                          {busySlug === item.slug ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          Regenerate
                        </button>
                      ) : (
                        <button
                          onClick={() => generateSlug(item.slug, false)}
                          disabled={busySlug === item.slug || batchRunning}
                          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2.5 py-1 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Generate narration"
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
                  </td>
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#5a5a5a] font-light">
                    {loading ? 'Loading…' : 'No items match the current filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-[11px] text-[#5a5a5a] font-light leading-relaxed max-w-3xl">
          TTS generation is rate-limited to 5 per hour per admin (single-article endpoint) and 1 batch per 10 minutes (bulk endpoint).
          Generation runs sequentially and can take 30–60 seconds per article, 2–4 minutes per pillar guide.
          Audio files are stored in <code className="text-[#7a7a7a] font-mono">public/audio/&lt;slug&gt;.mp3</code> and cached for 24h at the edge.
        </p>
      </div>
    </div>
  );
}
