"use client";

/**
 * DraftPreview — client component for /admin/write.
 *
 * Renders the structured article draft returned by /api/ai/draft as a
 * sectioned preview that mirrors the live /insights/[slug] article page:
 *   - Title (large Playfair serif)
 *   - Excerpt (italic serif)
 *   - Concise answer card (gold-bordered, for AI Overviews)
 *   - Key takeaways (numbered 01–05, Cinzel monospace labels)
 *   - Body preview (markdown rendered to prose — NOT a full markdown renderer,
 *     just ## H2 + paragraphs. Inline edits happen on the raw markdown.)
 *   - FAQ (H3 question + paragraph answer)
 *   - References (numbered list with author / year / source)
 *   - Author bio (italic serif paragraph)
 *   - Related service CTA banner
 *
 * Every section is inline-editable:
 *   - Single-line fields (title, excerpt, conciseAnswer) → contentEditable
 *   - Multi-line fields (body, faqs, authorBio) → textarea on edit toggle
 *   - Array fields (keyTakeaways, faqs, references) → add/remove/reorder
 *
 * The component is a CONTROLLED draft — the parent owns the canonical
 * ArticleDraft state. Local edits call onChange(newDraft) which lifts the
 * change up.
 *
 * Design system: #050505 bg, gold #c9a96e accent, Playfair serif headlines,
 * Cinzel editorial labels, NO blue/indigo. Matches /admin/leads dark editorial.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  FileText,
} from "lucide-react";
import type { ArticleDraft } from "@/lib/ai/writing-prompt";

interface DraftPreviewProps {
  draft: ArticleDraft;
  onChange: (next: ArticleDraft) => void;
  onDownloadMarkdown: () => void;
  durationMs?: number;
}

const CLUSTER_LABELS: Record<string, string> = {
  "relationship-patterns": "Relationship Patterns",
  "self-sabotage": "Self-Sabotage",
  "identity-purpose": "Identity & Purpose",
  "astrology-psychology": "Astrology + Psychology",
  "psychological-observations": "Psychological Observations",
};

const SERVICE_LABELS: Record<string, string> = {
  "relationship-pattern-analysis": "Relationship Pattern Analysis",
  "karmic-relationship-reading": "Repeating-Partner Reading",
  "emotional-pattern-decode": "Emotional Pattern Decode",
  "shadow-work-consultation": "Shadow Work Consultation",
  "life-direction-session": "Life Direction Session",
};

/** Section label — small caps Cinzel-style label used as eyebrow. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-3 font-light">
      {children}
    </p>
  );
}

/** Inline-editable single-line text field. */
function InlineTextField({
  value,
  onChange,
  placeholder,
  className = "",
  multiline = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    const commit = () => {
      onChange(draft.trim());
      setEditing(false);
    };
    const cancel = () => {
      setDraft(value);
      setEditing(false);
    };
    return (
      <div className="relative">
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
            className={`w-full bg-[#0a0a0a] border border-[#c9a96e]/30 px-4 py-3 text-[#f0eee9] font-light focus:border-[#c9a96e] focus:outline-none resize-y ${className}`}
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-[#0a0a0a] border border-[#c9a96e]/30 px-4 py-2 text-[#f0eee9] font-light focus:border-[#c9a96e] focus:outline-none ${className}`}
          />
        )}
        <div className="absolute -top-3 right-2 flex gap-1">
          <button
            onClick={commit}
            className="size-7 rounded-full bg-[#c9a96e] text-[#050505] flex items-center justify-center hover:bg-[#d4b878] transition-colors"
            title="Save"
          >
            <Check className="size-3.5" />
          </button>
          <button
            onClick={cancel}
            className="size-7 rounded-full bg-[#1a1a1a] text-[#9a9a9a] border border-white/10 flex items-center justify-center hover:text-[#f0eee9] transition-colors"
            title="Cancel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`group relative cursor-text ${className}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Click to edit"
    >
      <span className={className}>{value || <span className="text-[#5a5a5a] italic">{placeholder}</span>}</span>
      <Pencil className="size-3 text-[#c9a96e] opacity-0 group-hover:opacity-70 transition-opacity inline-block ml-2 -mt-1" />
    </div>
  );
}

/** Numbered key-takeaway bullet with edit/remove/reorder controls. */
function TakeawayRow({
  index,
  total,
  value,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="flex gap-3 items-start">
        <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/60 mt-3 font-mono shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(6, Math.max(2, draft.split("\n").length + 1))}
          className="flex-1 bg-[#0a0a0a] border border-[#c9a96e]/30 px-3 py-2 text-[#cfcabf] text-sm font-light focus:border-[#c9a96e] focus:outline-none resize-y"
        />
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => {
              onChange(draft.trim());
              setEditing(false);
            }}
            className="size-7 rounded-full bg-[#c9a96e] text-[#050505] flex items-center justify-center hover:bg-[#d4b878] transition-colors"
            title="Save"
          >
            <Check className="size-3.5" />
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="size-7 rounded-full bg-[#1a1a1a] text-[#9a9a9a] border border-white/10 flex items-center justify-center hover:text-[#f0eee9] transition-colors"
            title="Cancel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start group">
      <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/60 mt-1 font-mono shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <p
        className="flex-1 text-[#cfcabf] text-sm leading-[1.7] font-light cursor-text"
        onClick={() => setEditing(true)}
      >
        {value}
      </p>
      <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-[#5a5a5a] hover:text-[#c9a96e] disabled:opacity-20 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="text-[#5a5a5a] hover:text-[#c9a96e] disabled:opacity-20 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="size-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="text-[#5a5a5a] hover:text-red-400"
          title="Remove"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Editable FAQ pair. */
function FaqRow({
  index,
  q,
  a,
  onChange,
  onRemove,
}: {
  index: number;
  q: string;
  a: string;
  onChange: (next: { q: string; a: string }) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qDraft, setQDraft] = useState(q);
  const [aDraft, setADraft] = useState(a);

  if (editing) {
    return (
      <div className="border border-[#c9a96e]/30 p-4 bg-[#0a0a0a]">
        <div className="flex justify-between mb-3">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70">
            FAQ {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                onChange({ q: qDraft.trim(), a: aDraft.trim() });
                setEditing(false);
              }}
              className="size-7 rounded-full bg-[#c9a96e] text-[#050505] flex items-center justify-center hover:bg-[#d4b878] transition-colors"
              title="Save"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => {
                setQDraft(q);
                setADraft(a);
                setEditing(false);
              }}
              className="size-7 rounded-full bg-[#1a1a1a] text-[#9a9a9a] border border-white/10 flex items-center justify-center hover:text-[#f0eee9] transition-colors"
              title="Cancel"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
        <input
          type="text"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="Question"
          className="w-full bg-transparent border-b border-white/10 px-1 py-2 mb-3 text-[#f0eee9] font-serif text-lg focus:border-[#c9a96e] focus:outline-none"
        />
        <textarea
          value={aDraft}
          onChange={(e) => setADraft(e.target.value)}
          placeholder="Answer"
          rows={Math.min(8, Math.max(3, aDraft.split("\n").length + 1))}
          className="w-full bg-transparent border border-white/10 px-3 py-2 text-[#cfcabf] text-sm font-light focus:border-[#c9a96e] focus:outline-none resize-y"
        />
      </div>
    );
  }

  return (
    <div className="group border-l border-[#c9a96e]/20 pl-5 py-2 cursor-text" onClick={() => setEditing(true)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light tracking-[-0.01em]">
          {q}
        </h3>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-[#5a5a5a] hover:text-red-400"
            title="Remove"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="text-[#cfcabf] text-base leading-[1.8] font-light mt-2">
        {a}
      </p>
    </div>
  );
}

/** Editable reference row. */
function ReferenceRow({
  index,
  reference,
  onChange,
  onRemove,
}: {
  index: number;
  reference: { title: string; author?: string; year?: number; source?: string; url?: string };
  onChange: (next: typeof reference) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reference);

  if (editing) {
    return (
      <div className="border border-[#c9a96e]/30 p-4 bg-[#0a0a0a] space-y-2">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70">
            Reference {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                onChange(draft);
                setEditing(false);
              }}
              className="size-7 rounded-full bg-[#c9a96e] text-[#050505] flex items-center justify-center hover:bg-[#d4b878] transition-colors"
              title="Save"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => {
                setDraft(reference);
                setEditing(false);
              }}
              className="size-7 rounded-full bg-[#1a1a1a] text-[#9a9a9a] border border-white/10 flex items-center justify-center hover:text-[#f0eee9] transition-colors"
              title="Cancel"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Title (required)"
          className="w-full bg-transparent border-b border-white/10 px-1 py-1.5 text-[#f0eee9] text-sm focus:border-[#c9a96e] focus:outline-none"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={draft.author || ""}
            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
            placeholder="Author (Last, F.)"
            className="bg-transparent border-b border-white/10 px-1 py-1.5 text-[#cfcabf] text-xs focus:border-[#c9a96e] focus:outline-none"
          />
          <input
            type="text"
            value={draft.year?.toString() || ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                year: /^\d{4}$/.test(e.target.value)
                  ? parseInt(e.target.value, 10)
                  : undefined,
              })
            }
            placeholder="Year (YYYY)"
            className="bg-transparent border-b border-white/10 px-1 py-1.5 text-[#cfcabf] text-xs focus:border-[#c9a96e] focus:outline-none"
          />
          <input
            type="text"
            value={draft.source || ""}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            placeholder="Source (Book / Paper)"
            className="bg-transparent border-b border-white/10 px-1 py-1.5 text-[#cfcabf] text-xs focus:border-[#c9a96e] focus:outline-none"
          />
        </div>
        <input
          type="text"
          value={draft.url || ""}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          placeholder="URL (optional)"
          className="w-full bg-transparent border-b border-white/10 px-1 py-1.5 text-[#cfcabf] text-xs focus:border-[#c9a96e] focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className="group flex gap-3 items-start cursor-text py-2 border-b border-white/[0.04] last:border-b-0"
      onClick={() => setEditing(true)}
    >
      <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/60 mt-1 font-mono shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1">
        <p className="text-[#f0eee9] text-sm font-light italic">{reference.title}</p>
        <p className="text-[#7a7a7a] text-xs mt-1">
          {reference.author || "—"}{reference.year ? ` (${reference.year})` : ""}
          {reference.source ? ` · ${reference.source}` : ""}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-[#5a5a5a] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Lightweight markdown → prose renderer for the body preview.
 * Handles # H1, ## H2, ### H3, paragraphs, and **bold** + *italic* + [links](url).
 * Not a full markdown renderer — for the editor, we want enough to read the
 * draft at a glance. The Download-as-markdown button ships the raw markdown.
 */
function renderMarkdownPreview(md: string): React.ReactNode {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    const text = para.join(" ").trim();
    if (text) {
      blocks.push(
        <p
          key={`p-${blocks.length}`}
          className="text-[#cfcabf] text-base leading-[1.85] font-light mb-5"
        >
          {renderInline(text)}
        </p>
      );
    }
    para = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushPara();
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="text-lg font-serif text-[#f0eee9] font-light tracking-[-0.01em] mt-8 mb-3"
        >
          {renderInline(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushPara();
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mt-10 mb-4"
        >
          {renderInline(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      flushPara();
      blocks.push(
        <h1
          key={`h1-${blocks.length}`}
          className="text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mt-8 mb-5"
        >
          {renderInline(trimmed.slice(2))}
        </h1>
      );
    } else {
      para.push(trimmed);
    }
  }
  flushPara();
  return blocks;
}

/** Render inline markdown: **bold**, *italic*, [text](url). */
function renderInline(text: string): React.ReactNode {
  // Tokenize on **bold**, *italic*, [text](url) — naive but adequate for preview.
  const tokens = text.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/
  );
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={i} className="text-[#f0eee9] font-medium">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return (
        <em key={i} className="italic text-[#cfcabf]">
          {tok.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#c9a96e] underline-offset-4 hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

export default function DraftPreview({
  draft,
  onChange,
  onDownloadMarkdown,
  durationMs,
}: DraftPreviewProps) {
  const wordCount = draft.body
    ? draft.body.split(/\s+/).filter(Boolean).length
    : 0;

  const updateField = <K extends keyof ArticleDraft>(
    key: K,
    value: ArticleDraft[K]
  ) => onChange({ ...draft, [key]: value });

  const moveTakeaway = (i: number, dir: -1 | 1) => {
    const next = [...draft.keyTakeaways];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    updateField("keyTakeaways", next);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-10"
    >
      {/* ─── Meta strip ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] border-b border-white/[0.04] pb-4">
        <span className="text-[#c9a96e]">
          {CLUSTER_LABELS[draft.category] || draft.category || "—"}
        </span>
        <span>·</span>
        <span>{wordCount} words</span>
        {durationMs ? (
          <>
            <span>·</span>
            <span>{(durationMs / 1000).toFixed(1)}s generation</span>
          </>
        ) : null}
        <span>·</span>
        <span>
          {SERVICE_LABELS[draft.relatedService] || draft.relatedService || "—"}
        </span>
        <button
          onClick={onDownloadMarkdown}
          className="ml-auto inline-flex items-center gap-1.5 text-[#c9a96e] hover:text-[#f0eee9] transition-colors border border-[#c9a96e]/30 px-3 py-1.5"
          title="Download draft as markdown"
        >
          <Download className="size-3" />
          Download .md
        </button>
      </div>

      {/* ─── Title ─────────────────────────────────────────────────── */}
      <section>
        <Eyebrow>Title</Eyebrow>
        <InlineTextField
          value={draft.title}
          onChange={(v) => updateField("title", v)}
          placeholder="Article title"
          className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] leading-tight block"
        />
      </section>

      {/* ─── Excerpt ───────────────────────────────────────────────── */}
      <section>
        <Eyebrow>Excerpt</Eyebrow>
        <InlineTextField
          value={draft.excerpt}
          onChange={(v) => updateField("excerpt", v)}
          placeholder="120-word excerpt"
          multiline
          className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light italic block"
        />
      </section>

      {/* ─── Concise answer ────────────────────────────────────────── */}
      <section className="border border-[#c9a96e]/20 bg-white/[0.015] p-6 sm:p-8">
        <Eyebrow>Concise answer · for AI Overviews</Eyebrow>
        <InlineTextField
          value={draft.conciseAnswer}
          onChange={(v) => updateField("conciseAnswer", v)}
          placeholder="3–4 sentence answer"
          multiline
          className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light block"
        />
      </section>

      {/* ─── Key takeaways ─────────────────────────────────────────── */}
      <section>
        <Eyebrow>Key takeaways</Eyebrow>
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {draft.keyTakeaways.map((tk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <TakeawayRow
                  index={i}
                  total={draft.keyTakeaways.length}
                  value={tk}
                  onChange={(v) => {
                    const next = [...draft.keyTakeaways];
                    next[i] = v;
                    updateField("keyTakeaways", next);
                  }}
                  onRemove={() => {
                    const next = draft.keyTakeaways.filter((_, j) => j !== i);
                    updateField("keyTakeaways", next);
                  }}
                  onMoveUp={() => moveTakeaway(i, -1)}
                  onMoveDown={() => moveTakeaway(i, 1)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={() =>
              updateField("keyTakeaways", [...draft.keyTakeaways, "New takeaway"])
            }
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors mt-2"
          >
            <Plus className="size-3" />
            Add takeaway
          </button>
        </div>
      </section>

      {/* ─── Body ──────────────────────────────────────────────────── */}
      <section>
        <Eyebrow>Body · markdown</Eyebrow>
        <div className="border border-white/[0.04] bg-white/[0.01] p-6 sm:p-8">
          <div className="prose-preview max-w-none">
            {renderMarkdownPreview(draft.body)}
          </div>
        </div>
        <div className="mt-3">
          <InlineTextField
            value={draft.body}
            onChange={(v) => updateField("body", v)}
            placeholder="Body markdown"
            multiline
            className="text-[#cfcabf] text-xs leading-[1.7] font-mono block w-full"
          />
        </div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-2 flex items-center gap-1.5">
          <FileText className="size-3" />
          Click above to edit raw markdown · {wordCount} words · aim for 1500+
        </p>
      </section>

      {/* ─── FAQs ──────────────────────────────────────────────────── */}
      <section>
        <Eyebrow>FAQs</Eyebrow>
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {draft.faqs.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FaqRow
                  index={i}
                  q={f.q}
                  a={f.a}
                  onChange={(next) => {
                    const faqs = [...draft.faqs];
                    faqs[i] = next;
                    updateField("faqs", faqs);
                  }}
                  onRemove={() => {
                    const faqs = draft.faqs.filter((_, j) => j !== i);
                    updateField("faqs", faqs);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={() =>
              updateField("faqs", [
                ...draft.faqs,
                { q: "New question?", a: "New answer." },
              ])
            }
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors mt-2"
          >
            <Plus className="size-3" />
            Add FAQ
          </button>
        </div>
      </section>

      {/* ─── References ────────────────────────────────────────────── */}
      <section>
        <Eyebrow>References</Eyebrow>
        <div className="border border-white/[0.04] bg-white/[0.01] p-6 sm:p-8 space-y-1">
          <AnimatePresence initial={false}>
            {draft.references.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ReferenceRow
                  index={i}
                  reference={r}
                  onChange={(next) => {
                    const refs = [...draft.references];
                    refs[i] = next;
                    updateField("references", refs);
                  }}
                  onRemove={() => {
                    const refs = draft.references.filter((_, j) => j !== i);
                    updateField("references", refs);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={() =>
              updateField("references", [
                ...draft.references,
                { title: "New reference", author: "", year: undefined, source: "" },
              ])
            }
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors mt-3"
          >
            <Plus className="size-3" />
            Add reference
          </button>
        </div>
      </section>

      {/* ─── Author bio ────────────────────────────────────────────── */}
      <section>
        <Eyebrow>Author bio</Eyebrow>
        <InlineTextField
          value={draft.authorBio}
          onChange={(v) => updateField("authorBio", v)}
          placeholder="3–5 sentence author bio"
          multiline
          className="text-[#cfcabf] text-base leading-[1.85] font-light italic block"
        />
      </section>

      {/* ─── Related service ───────────────────────────────────────── */}
      <section className="border-t border-[#c9a96e]/20 pt-8">
        <Eyebrow>Related service CTA</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SERVICE_LABELS).map(([slug, label]) => (
            <button
              key={slug}
              onClick={() => updateField("relatedService", slug)}
              className={`text-[11px] tracking-[0.25em] uppercase px-3 py-2 border transition-colors ${
                draft.relatedService === slug
                  ? "border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/10"
                  : "border-white/10 text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </motion.article>
  );
}
