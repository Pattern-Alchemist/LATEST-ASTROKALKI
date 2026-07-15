"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Plus } from "lucide-react";
import type { AtlasPattern } from "@/lib/content/patterns/atlas";
import type {
  AtlasCluster,
  AtlasIntensity,
} from "@/lib/content/patterns/micro-to-atlas";

/**
 * CompareTable — client component rendered by /patterns/atlas/compare/page.tsx.
 *
 * Renders a side-by-side comparison of 2-3 Atlas patterns. Supports:
 *   - Remove a column (× button) → rewrites the URL via router.push so the
 *     back button and shareable URL stay in sync.
 *   - Reorder columns left/right (← / → arrows).
 *   - "Add another pattern" link → back to /patterns/atlas (compare mode).
 *
 * Rows (in order):
 *   Pattern name · Cluster · Intensity · Core wound · Common trigger ·
 *   How it shows up · What it costs you · The way through · Related service
 *
 * Design system: bg #050505, gold #c9a96e, Cinzel uppercase row labels,
 * Playfair pattern names, Inter/serif values, gold dividers between columns.
 * NO borders on cells — dividers are 1px gold rules running vertically.
 * NO blue/indigo.
 */

const CINZEL = { fontFamily: "var(--font-cinzel)" } as const;

export interface CompareColumn {
  slug: string;
  pattern: AtlasPattern | null; // null → "Pattern not found" column
  cluster: AtlasCluster | "Uncategorised";
  intensity: AtlasIntensity | "Unknown";
  relatedServiceTitle: string | null;
  relatedServiceSlug: string | null;
}

interface CompareTableProps {
  columns: CompareColumn[];
}

// ── Sentence helpers (used by What it costs you / The way through) ─────────

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return m ? m[0].trim() : text.trim();
}

function lastSentence(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1].trim() : text.trim();
}

// ── Row definitions — drive the table layout ───────────────────────────────

type RowKey =
  | "name"
  | "cluster"
  | "intensity"
  | "coreWound"
  | "trigger"
  | "showsUp"
  | "cost"
  | "wayThrough"
  | "service";

interface RowDef {
  key: RowKey;
  label: string;
  /** Render style for the value cell. */
  variant: "name" | "tag" | "intensity" | "quote" | "prose" | "link";
}

const ROWS: RowDef[] = [
  { key: "name", label: "Pattern", variant: "name" },
  { key: "cluster", label: "Cluster", variant: "tag" },
  { key: "intensity", label: "Intensity", variant: "intensity" },
  { key: "coreWound", label: "Core wound", variant: "quote" },
  { key: "trigger", label: "Common trigger", variant: "prose" },
  { key: "showsUp", label: "How it shows up", variant: "prose" },
  { key: "cost", label: "What it costs you", variant: "prose" },
  { key: "wayThrough", label: "The way through", variant: "prose" },
  { key: "service", label: "Related service", variant: "link" },
];

function cellValue(col: CompareColumn, key: RowKey): {
  text?: string;
  href?: string;
} {
  if (!col.pattern) return {};
  const p = col.pattern;
  switch (key) {
    case "name":
      return { text: p.name, href: `/patterns/atlas/${p.slug}` };
    case "cluster":
      return { text: col.cluster };
    case "intensity":
      return { text: col.intensity };
    case "coreWound":
      return { text: p.tagline };
    case "trigger":
      return { text: p.symptoms[0] };
    case "showsUp":
      return { text: p.howItShowsUp[0] };
    case "cost":
      return { text: firstSentence(p.shadowSide) };
    case "wayThrough":
      return { text: lastSentence(p.conciseAnswer) };
    case "service":
      return col.relatedServiceSlug
        ? {
            text: col.relatedServiceTitle ?? "",
            href: `/services/${col.relatedServiceSlug}`,
          }
        : {};
  }
}

function IntensityCell({ value }: { value: string }) {
  const level =
    value === "High" ? 3 : value === "Medium" ? 2 : value === "Low" ? 1 : 0;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block h-1.5 w-1.5 rounded-full ${
              i < level ? "bg-[#c9a96e]" : "bg-[#2a2a2a]"
            }`}
          />
        ))}
      </span>
      <span
        className="text-[11px] tracking-[0.2em] uppercase text-[#c9a96e]/80"
        style={CINZEL}
      >
        {value}
      </span>
    </span>
  );
}

export default function CompareTable({ columns }: CompareTableProps) {
  const router = useRouter();
  // Local copy so reordering is instant; URL syncs on remove (full re-render).
  const [cols, setCols] = useState<CompareColumn[]>(columns);

  const pushNewUrl = (next: CompareColumn[]) => {
    if (next.length === 0) {
      router.push("/patterns/atlas");
      return;
    }
    const slugs = next.map((c) => c.slug).join(",");
    router.push(`/patterns/atlas/compare?patterns=${encodeURIComponent(slugs)}`);
  };

  const removeColumn = (idx: number) => {
    const next = cols.filter((_, i) => i !== idx);
    setCols(next);
    pushNewUrl(next);
  };

  const moveColumn = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= cols.length) return;
    const next = [...cols];
    [next[idx], next[target]] = [next[target], next[idx]];
    setCols(next);
    pushNewUrl(next);
  };

  // ── Layout: CSS grid — first column is labels, rest are pattern columns ──
  const gridTemplate = `minmax(140px, 180px) repeat(${cols.length}, minmax(260px, 1fr))`;

  return (
    <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0 pb-4">
      <div
        className="grid min-w-full"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {/* ── Header row: empty label cell + pattern column headers ── */}
        <div className="py-4 pr-4" />
        {cols.map((col, idx) => (
          <div
            key={col.slug + "-" + idx}
            className="relative py-4 pl-6 border-l border-[#c9a96e]/20"
          >
            {/* Column controls */}
            <div className="flex items-center justify-end gap-1 mb-3">
              <button
                type="button"
                onClick={() => moveColumn(idx, -1)}
                disabled={idx === 0}
                aria-label={`Move ${col.pattern?.name ?? col.slug} left`}
                className="p-1 text-[#5a5a5a] hover:text-[#c9a96e] disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveColumn(idx, 1)}
                disabled={idx === cols.length - 1}
                aria-label={`Move ${col.pattern?.name ?? col.slug} right`}
                className="p-1 text-[#5a5a5a] hover:text-[#c9a96e] disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeColumn(idx)}
                aria-label={`Remove ${col.pattern?.name ?? col.slug} from comparison`}
                className="p-1 text-[#5a5a5a] hover:text-[#c9a96e] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Column header — pattern number + cluster eyebrow */}
            <p
              className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2"
              style={CINZEL}
            >
              {String(idx + 1).padStart(2, "0")} /{" "}
              {col.pattern ? col.cluster : "Not found"}
            </p>
            {col.pattern ? (
              <Link
                href={`/patterns/atlas/${col.slug}`}
                className="block text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.015em] leading-tight hover:text-[#c9a96e] transition-colors"
              >
                {col.pattern.name}
              </Link>
            ) : (
              <p className="text-xl sm:text-2xl font-serif text-[#7a7a7a] font-light italic leading-tight">
                Pattern not found
              </p>
            )}
            {col.pattern && (
              <p className="mt-2 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-mono">
                {col.pattern.readTime} min read
              </p>
            )}
          </div>
        ))}

        {/* ── Data rows (skip "name" since it's rendered above as the header) ── */}
        {ROWS.slice(1).map((row, rowIdx) => (
          <RowRenderer
            key={row.key}
            row={row}
            cols={cols}
            isLast={rowIdx === ROWS.length - 2}
          />
        ))}
      </div>

      {/* Add-another CTA */}
      {cols.length < 3 && (
        <div className="mt-12 pt-8 border-t border-white/[0.04]">
          <Link
            href="/patterns/atlas"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            style={CINZEL}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add another pattern
          </Link>
        </div>
      )}
    </div>
  );
}

function RowRenderer({
  row,
  cols,
  isLast,
}: {
  row: RowDef;
  cols: CompareColumn[];
  isLast: boolean;
}) {
  return (
    <>
      {/* Label cell */}
      <div
        className={`py-6 pr-4 ${isLast ? "" : "border-b border-white/[0.04]"}`}
      >
        <p
          className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a]"
          style={CINZEL}
        >
          {row.label}
        </p>
      </div>

      {/* Value cells */}
      {cols.map((col, idx) => {
        const value = cellValue(col, row.key);
        return (
          <div
            key={col.slug + "-" + idx + "-" + row.key}
            className={`relative py-6 pl-6 border-l border-[#c9a96e]/20 ${
              isLast ? "" : "border-b border-white/[0.04]"
            }`}
          >
            <CellValue row={row} value={value} />
          </div>
        );
      })}
    </>
  );
}

function CellValue({
  row,
  value,
}: {
  row: RowDef;
  value: { text?: string; href?: string };
}) {
  if (!value.text && !value.href) {
    return <p className="text-sm text-[#5a5a5a] italic font-light">—</p>;
  }

  switch (row.variant) {
    case "tag":
      return (
        <p
          className="text-[12px] tracking-[0.25em] uppercase text-[#c9a96e]/80"
          style={CINZEL}
        >
          {value.text}
        </p>
      );
    case "intensity":
      return <IntensityCell value={value.text ?? "Unknown"} />;
    case "quote":
      return (
        <p className="text-base sm:text-lg font-serif italic text-[#cfcabf] leading-[1.5] font-light">
          &ldquo;{value.text}&rdquo;
        </p>
      );
    case "link":
      return value.href ? (
        <Link
          href={value.href}
          className="text-sm text-[#c9a96e] border-b border-[#c9a96e]/40 pb-0.5 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
        >
          {value.text}
        </Link>
      ) : (
        <p className="text-sm text-[#5a5a5a] italic font-light">—</p>
      );
    case "name":
      return value.href ? (
        <Link
          href={value.href}
          className="text-lg font-serif text-[#f0eee9] hover:text-[#c9a96e] transition-colors"
        >
          {value.text}
        </Link>
      ) : (
        <p className="text-lg font-serif text-[#7a7a7a] italic">{value.text}</p>
      );
    case "prose":
    default:
      return (
        <p className="text-sm sm:text-[15px] text-[#cfcabf] leading-[1.7] font-light">
          {value.text}
        </p>
      );
  }
}
