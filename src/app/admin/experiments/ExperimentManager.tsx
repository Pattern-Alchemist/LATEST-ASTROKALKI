"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  Trophy,
  X,
} from "lucide-react";

/**
 * ExperimentManager — client-side admin UI for the A/B testing framework.
 *
 * Layout (matches /admin/leads visual language):
 *   - Header row: title + "New experiment" button
 *   - List of experiment cards, each showing:
 *       · Name, page, active toggle
 *       · Aggregate totals (assignments / conversions / rate)
 *       · Per-variant bar chart (gold bars on dark)
 *       · "Winner so far" badge on the leading variant (when sample
 *         size is meaningful — >=20 assignments per variant)
 *       · Delete button
 *   - Create-experiment panel (collapsible):
 *       · Name (kebab-case, validated)
 *       · Page select (hero / booking_cta)
 *       · Variant rows — name + weight + config JSON
 *       · Add / remove variant
 *
 * Mutations:
 *   - POST   /api/admin/experiments        → create
 *   - PATCH  /api/admin/experiments/[id]   → toggle active / edit variants
 *   - DELETE /api/admin/experiments/[id]   → delete
 *
 * After each mutation we re-fetch the summary so the bar charts reflect
 * the new state. The middleware handles auth + CSRF, so we don't need
 * to send any explicit credentials — the admin session cookie is
 * forwarded automatically by the browser.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface VariantDef {
  name: string;
  weight: number;
  config: Record<string, unknown>;
}

export interface PerVariantStat {
  name: string;
  assignments: number;
  conversions: number;
  conversionRate: number; // 0-100
}

export interface ExperimentSummary {
  id: string;
  name: string;
  page: string;
  active: boolean;
  variants: VariantDef[];
  totalAssignments: number;
  conversions: number;
  conversionRate: number; // 0-100
  perVariant: PerVariantStat[];
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const PAGE_OPTIONS = [
  { value: "hero", label: "Hero" },
  { value: "booking_cta", label: "Booking CTA" },
];

/** Minimum sample size before we'll badge a "winner". */
const WINNER_MIN_ASSIGNMENTS = 20;

// ─── Component ────────────────────────────────────────────────────────

export default function ExperimentManager({
  initialExperiments,
}: {
  initialExperiments: ExperimentSummary[];
}) {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>(
    initialExperiments
  );
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/experiments", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load experiments");
      const data = (await res.json()) as { experiments: ExperimentSummary[] };
      setExperiments(data.experiments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh after every mount — the initial server-render data may be
  // slightly stale if another admin tab created/toggled an experiment
  // in the last few seconds.
  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (exp: ExperimentSummary) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiments/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !exp.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to toggle experiment");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleDelete = async (exp: ExperimentSummary) => {
    if (
      !confirm(
        `Delete experiment "${exp.name}"?\n\nThis will also delete ${exp.totalAssignments} assignment${exp.totalAssignments === 1 ? "" : "s"} and cannot be undone.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiments/${exp.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete experiment");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleCreated = async () => {
    setShowCreate(false);
    await load();
  };

  return (
    <div>
      {/* ─── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a]">
            {experiments.length} experiment{experiments.length === 1 ? "" : "s"}
            {" · "}
            {experiments.filter((e) => e.active).length} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] px-4 py-2 hover:bg-[#d9b97e] transition-colors"
          >
            {showCreate ? (
              <>
                <X className="size-3.5" />
                Close
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                New Experiment
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 border border-red-400/30 bg-red-400/[0.04] px-4 py-3 flex items-start gap-3">
          <AlertCircle className="size-4 text-red-400/80 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.2em] uppercase text-red-400/90">
              Error
            </p>
            <p className="text-sm text-red-200/80 font-light mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400/60 hover:text-red-400"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ─── Create panel ─────────────────────────────────────────── */}
      {showCreate && (
        <CreateExperimentPanel
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ─── Experiments list ─────────────────────────────────────── */}
      {experiments.length === 0 && !showCreate ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-6">
          {experiments.map((exp) => (
            <ExperimentCard
              key={exp.id}
              experiment={exp}
              onToggle={() => handleToggleActive(exp)}
              onDelete={() => handleDelete(exp)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-white/[0.04] p-12 text-center">
      <FlaskConical className="size-8 text-[#3a3a3a] mx-auto mb-4" />
      <p className="text-[#9a9a9a] font-light mb-2">No experiments yet.</p>
      <p className="text-xs text-[#5a5a5a] font-light mb-6 max-w-md mx-auto leading-relaxed">
        Create your first experiment to start A/B testing hero headlines,
        CTAs, or any other surface where a different copy choice might
        move the conversion needle.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
      >
        <Plus className="size-3.5" />
        Create Experiment
      </button>
    </div>
  );
}

// ─── Experiment card ──────────────────────────────────────────────────

function ExperimentCard({
  experiment,
  onToggle,
  onDelete,
  onChanged,
}: {
  experiment: ExperimentSummary;
  onToggle: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  // "Winner so far" — the variant with the highest conversion rate,
  // but only if it has at least WINNER_MIN_ASSIGNMENTS samples. With
  // smaller samples, the leader is statistically meaningless and we
  // don't want to mislead the admin.
  const winner =
    experiment.perVariant.length > 0
      ? experiment.perVariant
          .filter((v) => v.assignments >= WINNER_MIN_ASSIGNMENTS)
          .sort((a, b) => b.conversionRate - a.conversionRate)[0]
      : undefined;

  return (
    <div className="border border-white/[0.04] bg-[#070707]">
      {/* ── Card header ── */}
      <div className="p-5 sm:p-6 border-b border-white/[0.04]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-serif font-light text-[#f0eee9] tracking-[-0.01em]">
                {experiment.name}
              </h3>
              <span
                className={`text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 border ${
                  experiment.active
                    ? "border-[#c9a96e]/40 text-[#c9a96e]"
                    : "border-white/[0.08] text-[#7a7a7a]"
                }`}
              >
                {experiment.active ? "Active" : "Paused"}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] border border-white/[0.06] px-2 py-0.5">
                {experiment.page}
              </span>
            </div>
            <p className="text-xs text-[#5a5a5a] font-light">
              Created {new Date(experiment.createdAt).toLocaleDateString()} ·
              Updated {new Date(experiment.updatedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onToggle}
              className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-colors ${
                experiment.active
                  ? "border-white/[0.08] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.15]"
                  : "border-[#c9a96e]/40 text-[#c9a96e] hover:bg-[#c9a96e]/10"
              }`}
              title={experiment.active ? "Pause experiment" : "Activate experiment"}
            >
              {experiment.active ? (
                <>
                  <PowerOff className="size-3" />
                  Pause
                </>
              ) : (
                <>
                  <Power className="size-3" />
                  Activate
                </>
              )}
            </button>
            <button
              onClick={() => setShowEdit((s) => !s)}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border border-white/[0.08] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.15] transition-colors"
              title="Edit variants"
            >
              {showEdit ? "Close" : "Edit"}
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center justify-center size-7 border border-white/[0.08] text-red-400/60 hover:text-red-400 hover:border-red-400/30 transition-colors"
              title="Delete experiment"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Aggregate totals row */}
        <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-6">
          <Stat label="Assignments" value={experiment.totalAssignments} />
          <Stat label="Conversions" value={experiment.conversions} />
          <Stat
            label="Conv. rate"
            value={`${experiment.conversionRate.toFixed(1)}%`}
            accent
          />
        </div>
      </div>

      {/* ── Per-variant bar chart ── */}
      <div className="p-5 sm:p-6">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-between w-full mb-4 group"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] group-hover:text-[#9a9a9a] transition-colors">
            Variant breakdown ({experiment.perVariant.length})
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-[#5a5a5a] group-hover:text-[#7a7a7a]" />
          ) : (
            <ChevronDown className="size-4 text-[#5a5a5a] group-hover:text-[#7a7a7a]" />
          )}
        </button>

        {expanded && (
          <div className="space-y-4">
            {experiment.perVariant.map((v) => {
              const isWinner = winner && v.name === winner.name;
              return (
                <VariantBar
                  key={v.name}
                  stat={v}
                  isWinner={!!isWinner}
                  hasEnoughSamples={
                    v.assignments >= WINNER_MIN_ASSIGNMENTS
                  }
                />
              );
            })}
            {experiment.perVariant.length === 0 && (
              <p className="text-sm text-[#5a5a5a] font-light py-4 text-center">
                No variants defined.
              </p>
            )}
            {experiment.totalAssignments > 0 &&
              !winner &&
              experiment.perVariant.some(
                (v) => v.assignments >= WINNER_MIN_ASSIGNMENTS
              ) === false && (
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] pt-2 text-center">
                  Need ≥{WINNER_MIN_ASSIGNMENTS} assignments per variant to call a winner.
                </p>
              )}
          </div>
        )}
      </div>

      {/* ── Edit panel ── */}
      {showEdit && (
        <div className="border-t border-white/[0.04] p-5 sm:p-6 bg-[#050505]">
          <EditVariantsPanel
            experiment={experiment}
            onSaved={() => {
              setShowEdit(false);
              onChanged();
            }}
            onCancel={() => setShowEdit(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
        {label}
      </p>
      <p
        className={`text-xl sm:text-2xl font-serif font-light ${
          accent ? "text-[#c9a96e]" : "text-[#f0eee9]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Variant bar (single row of the per-variant breakdown) ────────────

function VariantBar({
  stat,
  isWinner,
  hasEnoughSamples,
}: {
  stat: PerVariantStat;
  isWinner: boolean;
  hasEnoughSamples: boolean;
}) {
  // Width of the gold bar — proportional to conversion rate (0-100%).
  const barWidth = Math.min(100, Math.max(0, stat.conversionRate));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#f0eee9] font-light font-mono">
            {stat.name}
          </span>
          {isWinner && (
            <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.2em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-1.5 py-0.5">
              <Trophy className="size-2.5" />
              Leader
            </span>
          )}
          {!hasEnoughSamples && stat.assignments > 0 && (
            <span className="text-[9px] tracking-[0.2em] uppercase text-[#5a5a5a]">
              low sample
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-light">
          <span className="text-[#7a7a7a]">
            <span className="text-[#9a9a9a]">{stat.assignments}</span> assigned
          </span>
          <span className="text-[#7a7a7a]">
            <span className="text-[#9a9a9a]">{stat.conversions}</span> converted
          </span>
          <span className="text-[#c9a96e] tabular-nums w-14 text-right">
            {stat.conversionRate.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-white/[0.04] relative overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            isWinner ? "bg-[#c9a96e]" : "bg-[#c9a96e]/45"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// ─── Create-experiment panel ──────────────────────────────────────────

interface DraftVariant {
  name: string;
  weight: string; // string for input control, parsed on submit
  config: string; // JSON string
}

function CreateExperimentPanel({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [page, setPage] = useState("hero");
  const [variants, setVariants] = useState<DraftVariant[]>([
    { name: "a", weight: "1", config: "{}" },
    { name: "b", weight: "1", config: "{}" },
  ]);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariant = () => {
    setVariants((vs) => [
      ...vs,
      { name: "", weight: "1", config: "{}" },
    ]);
  };

  const removeVariant = (idx: number) => {
    setVariants((vs) => vs.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, patch: Partial<DraftVariant>) => {
    setVariants((vs) =>
      vs.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    );
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate name (kebab-case)
    if (!/^[a-z0-9-]+$/.test(name)) {
      setError(
        "Name must be lowercase kebab-case (a-z, 0-9, dashes). e.g. hero-headline"
      );
      return;
    }

    // Need at least 2 variants
    if (variants.length < 2) {
      setError("At least 2 variants are required.");
      return;
    }

    // Variant names must be unique + alphanumeric/dash/underscore
    const names = variants.map((v) => v.name.trim());
    if (names.some((n) => !n || !/^[a-zA-Z0-9_-]+$/.test(n))) {
      setError(
        "Each variant needs a name (alphanumeric, dash, or underscore)."
      );
      return;
    }
    if (new Set(names).size !== names.length) {
      setError("Variant names must be unique.");
      return;
    }

    // Parse weights + config
    const parsedVariants: VariantDef[] = [];
    for (const v of variants) {
      const weight = parseFloat(v.weight);
      if (isNaN(weight) || weight < 0) {
        setError(`Weight for variant "${v.name}" must be a non-negative number.`);
        return;
      }
      let config: Record<string, unknown> = {};
      try {
        config = v.config.trim() ? JSON.parse(v.config) : {};
        if (typeof config !== "object" || config === null || Array.isArray(config)) {
          throw new Error("not an object");
        }
      } catch {
        setError(`Config for variant "${v.name}" must be valid JSON object.`);
        return;
      }
      parsedVariants.push({ name: v.name.trim(), weight, config });
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, page, variants: parsedVariants, active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ||
            (data.details?.formErrors?.[0] as string | undefined) ||
            "Failed to create experiment"
        );
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-[#c9a96e]/30 bg-[#070707] p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-1">
            New experiment
          </p>
          <h3 className="text-lg font-serif font-light text-[#f0eee9]">
            Define a variant test
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="text-[#5a5a5a] hover:text-[#f0eee9]"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 border border-red-400/30 bg-red-400/[0.04] px-3 py-2 text-sm text-red-300/80 font-light flex items-start gap-2">
          <AlertCircle className="size-4 text-red-400/80 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Name + Page ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">
            Name (kebab-case)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="hero-headline"
            className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2">
            Page
          </label>
          <select
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
          >
            {PAGE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#050505]">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Variants ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a]">
            Variants
          </label>
          <button
            onClick={addVariant}
            className="inline-flex items-center gap-1 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#d9b97e]"
          >
            <Plus className="size-3" />
            Add variant
          </button>
        </div>

        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-[1fr_80px_1fr_auto] gap-3 items-start border border-white/[0.04] p-3"
            >
              <div>
                <label className="block text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => updateVariant(idx, { name: e.target.value })}
                  placeholder="b"
                  className="w-full bg-[#050505] border border-white/[0.08] px-2 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
                  Weight
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={v.weight}
                  onChange={(e) => updateVariant(idx, { weight: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.08] px-2 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
                />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
                  Config (JSON)
                </label>
                <input
                  type="text"
                  value={v.config}
                  onChange={(e) => updateVariant(idx, { config: e.target.value })}
                  placeholder='{"line2":"Same Story."}'
                  className="w-full bg-[#050505] border border-white/[0.08] px-2 py-1.5 text-xs text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light font-mono"
                />
              </div>
              <div className="flex items-end h-[34px]">
                {variants.length > 2 && (
                  <button
                    onClick={() => removeVariant(idx)}
                    className="text-red-400/60 hover:text-red-400 p-1"
                    title="Remove variant"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active toggle ── */}
      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-[#c9a96e] cursor-pointer"
        />
        <span className="text-sm text-[#9a9a9a] font-light">
          Activate immediately (visitors will start being assigned on next page load)
        </span>
      </label>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] px-5 py-2.5 hover:bg-[#d9b97e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              Create Experiment
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] px-4 py-2.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Edit-variants panel (inside a card) ──────────────────────────────

function EditVariantsPanel({
  experiment,
  onSaved,
  onCancel,
}: {
  experiment: ExperimentSummary;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [variants, setVariants] = useState<DraftVariant[]>(
    experiment.variants.map((v) => ({
      name: v.name,
      weight: String(v.weight),
      config: JSON.stringify(v.config, null, 0),
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariant = () => {
    setVariants((vs) => [...vs, { name: "", weight: "1", config: "{}" }]);
  };

  const removeVariant = (idx: number) => {
    setVariants((vs) => vs.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, patch: Partial<DraftVariant>) => {
    setVariants((vs) =>
      vs.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    );
  };

  const handleSave = async () => {
    setError(null);

    if (variants.length < 2) {
      setError("At least 2 variants are required.");
      return;
    }

    const names = variants.map((v) => v.name.trim());
    if (names.some((n) => !n || !/^[a-zA-Z0-9_-]+$/.test(n))) {
      setError("Each variant needs a valid name (alphanumeric, dash, underscore).");
      return;
    }
    if (new Set(names).size !== names.length) {
      setError("Variant names must be unique.");
      return;
    }

    const parsedVariants: VariantDef[] = [];
    for (const v of variants) {
      const weight = parseFloat(v.weight);
      if (isNaN(weight) || weight < 0) {
        setError(`Weight for variant "${v.name}" must be a non-negative number.`);
        return;
      }
      let config: Record<string, unknown> = {};
      try {
        config = v.config.trim() ? JSON.parse(v.config) : {};
        if (typeof config !== "object" || config === null || Array.isArray(config)) {
          throw new Error("not an object");
        }
      } catch {
        setError(`Config for variant "${v.name}" must be valid JSON object.`);
        return;
      }
      parsedVariants.push({ name: v.name.trim(), weight, config });
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/experiments/${experiment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants: parsedVariants }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update experiment");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]">
          Edit variants — {experiment.name}
        </p>
        <button
          onClick={addVariant}
          className="inline-flex items-center gap-1 text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#d9b97e]"
        >
          <Plus className="size-3" />
          Add variant
        </button>
      </div>

      {error && (
        <div className="mb-3 border border-red-400/30 bg-red-400/[0.04] px-3 py-2 text-sm text-red-300/80 font-light flex items-start gap-2">
          <AlertCircle className="size-4 text-red-400/80 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        {variants.map((v, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 sm:grid-cols-[1fr_80px_1fr_auto] gap-2 items-end border border-white/[0.04] p-2"
          >
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
                Name
              </label>
              <input
                type="text"
                value={v.name}
                onChange={(e) => updateVariant(idx, { name: e.target.value })}
                className="w-full bg-[#050505] border border-white/[0.08] px-2 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
                Weight
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={v.weight}
                onChange={(e) => updateVariant(idx, { weight: e.target.value })}
                className="w-full bg-[#050505] border border-white/[0.08] px-2 py-1.5 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1">
                Config (JSON)
              </label>
              <input
                type="text"
                value={v.config}
                onChange={(e) => updateVariant(idx, { config: e.target.value })}
                className="w-full bg-[#050505] border border-white/[0.08] px-2 py-1.5 text-xs text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light font-mono"
              />
            </div>
            <div className="flex items-end h-[34px]">
              {variants.length > 2 && (
                <button
                  onClick={() => removeVariant(idx)}
                  className="text-red-400/60 hover:text-red-400 p-1"
                  title="Remove variant"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={submitting}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] px-4 py-2 hover:bg-[#d9b97e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              Save Variants
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] px-4 py-2 transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-4 leading-relaxed">
        Note: editing variants does not retroactively reassign existing
        sessions. Visitors already assigned to a removed variant will be
        re-assigned (sticky) on their next page load.
      </p>
    </div>
  );
}

