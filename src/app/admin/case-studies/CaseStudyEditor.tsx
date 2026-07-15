"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { renderMarkdown } from "@/lib/content/markdown";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";

/**
 * CaseStudyEditor — admin client component.
 *
 * Used both for creating new case studies and editing existing ones. The
 * parent server component passes either:
 *   - `mode="new"` — empty form, POSTs on save
 *   - `mode="edit"` + `initial={...}` — pre-filled form, PATCHes on save
 *
 * Features:
 *   - 4 markdown textareas (Problem, Pattern, Session, Shift) each with a
 *     live preview pane on the right (toggleable)
 *   - Pattern select dropdown populated from the Atlas
 *   - Slug field (auto-suggested from title if blank on new)
 *   - Client initials + age + consent checkbox
 *   - Published toggle (default off for new, on for seeded)
 *   - Save button → POST or PATCH
 *   - Delete button (edit mode only) → DELETE with confirm
 *   - "View live" link (edit mode + published only) → /case-studies/{slug}
 *
 * Design matches /admin/leads: dark cards on #050505, gold accent, monospace
 * labels, text-link-style buttons.
 */

export interface CaseStudyInitial {
  id: string;
  slug: string;
  title: string;
  pattern: string;
  clientInitials: string;
  clientAge: number | null;
  consentGiven: boolean;
  problem: string;
  patternSection: string;
  session: string;
  shift: string;
  published: boolean;
}

interface Props {
  mode: "new" | "edit";
  initial?: CaseStudyInitial;
}

type PreviewTab = "problem" | "pattern" | "session" | "shift";

export default function CaseStudyEditor({ mode, initial }: Props) {
  const router = useRouter();
  const isEdit = mode === "edit" && initial;

  // ─── Form state ────────────────────────────────────────────────────────
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [pattern, setPattern] = useState(initial?.pattern ?? ATLAS_PATTERNS[0]?.slug ?? "");
  const [clientInitials, setClientInitials] = useState(initial?.clientInitials ?? "");
  const [clientAge, setClientAge] = useState<string>(
    initial?.clientAge !== null && initial?.clientAge !== undefined
      ? String(initial.clientAge)
      : ""
  );
  const [consentGiven, setConsentGiven] = useState(initial?.consentGiven ?? true);
  const [published, setPublished] = useState(initial?.published ?? false);
  const [problem, setProblem] = useState(initial?.problem ?? "");
  const [patternSection, setPatternSection] = useState(initial?.patternSection ?? "");
  const [session, setSession] = useState(initial?.session ?? "");
  const [shift, setShift] = useState(initial?.shift ?? "");

  // ─── UI state ──────────────────────────────────────────────────────────
  const [previewTab, setPreviewTab] = useState<PreviewTab>("problem");
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-clear success message after 4s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // ─── Auto-suggest slug from title (new mode only, before user edits slug) ─
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  useEffect(() => {
    if (slugTouched) return;
    const suggested = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120);
    setSlug(suggested);
  }, [title, slugTouched]);

  // ─── Live preview HTML (re-rendered when section content changes) ──────
  const previewHtml = useMemo(() => {
    const map: Record<PreviewTab, string> = {
      problem,
      pattern: patternSection,
      session,
      shift,
    };
    return renderMarkdown(map[previewTab] || "*Nothing to preview yet.*");
  }, [previewTab, problem, patternSection, session, shift]);

  // ─── Word counts (for writer's reference) ──────────────────────────────
  const wordCount = useCallback(
    (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0),
    []
  );
  const totalWords =
    wordCount(problem) +
    wordCount(patternSection) +
    wordCount(session) +
    wordCount(shift);

  // ─── Save handler ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    // Client-side validation (server also validates via Zod)
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Slug must be lowercase kebab-case (e.g. \"r-34-the-abandonment-loop\").");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!clientInitials.trim()) {
      setError("Client initials are required (e.g. \"R., 34\").");
      return;
    }
    if (problem.trim().length < 20) {
      setError("Problem section is too short (min 20 characters).");
      return;
    }
    if (patternSection.trim().length < 20) {
      setError("Pattern section is too short (min 20 characters).");
      return;
    }
    if (session.trim().length < 20) {
      setError("Session section is too short (min 20 characters).");
      return;
    }
    if (shift.trim().length < 20) {
      setError("Shift section is too short (min 20 characters).");
      return;
    }

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      pattern: pattern.trim(),
      clientInitials: clientInitials.trim(),
      clientAge: clientAge.trim() ? parseInt(clientAge, 10) : null,
      consentGiven,
      published,
      problem: problem.trim(),
      patternSection: patternSection.trim(),
      session: session.trim(),
      shift: shift.trim(),
    };

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/case-studies/${initial!.id}`
        : "/api/admin/case-studies";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setSuccess(isEdit ? "Saved." : "Case study created.");
      if (!isEdit && data.caseStudy?.id) {
        // Navigate to the edit view so subsequent saves are PATCHes.
        router.push(`/admin/case-studies?edit=${data.caseStudy.id}`);
      } else {
        // Refresh server component so list reflects new state.
        router.refresh();
      }
    } catch {
      setError("Network error — please retry");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete handler ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!isEdit) return;
    if (
      !confirm(
        "Permanently delete this case study? This cannot be undone. (Consider unpublishing instead to preserve the audit trail.)"
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/case-studies/${initial!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Delete failed");
        return;
      }
      router.push("/admin/case-studies");
      router.refresh();
    } catch {
      setError("Network error — please retry");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Section textarea component (kept inline for cohesion) ────────────
  const SectionField = ({
    label,
    value,
    onChange,
    tabKey,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    tabKey: PreviewTab;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => {
            setPreviewTab(tabKey);
            setShowPreview(true);
          }}
          className={`text-[11px] tracking-[0.25em] uppercase font-light transition-colors ${
            previewTab === tabKey && showPreview
              ? "text-[#c9a96e]"
              : "text-[#7a7a7a] hover:text-[#f0eee9]"
          }`}
        >
          {label} · {wordCount(value)} words
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        spellCheck={false}
        placeholder={`Write the ${label.toLowerCase()} section in markdown. Supports # ## ###, - lists, > quotes, **bold**, *italic*, [links](url).`}
        className="w-full bg-[#070707] border border-white/[0.06] px-4 py-3 text-sm text-[#cfcabf] font-light leading-[1.7] focus:border-[#c9a96e]/40 focus:outline-none resize-y font-mono"
      />
    </div>
  );

  return (
    <div className="border border-white/[0.04] bg-[#0a0a0a]/40 p-6 sm:p-8">
      {/* ─── Header row ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light">
            {isEdit ? "Editing case study" : "New case study"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em]">
            {isEdit ? initial!.title : "Draft a new client journey"}
          </h2>
          {isEdit && (
            <p className="text-[11px] text-[#5a5a5a] font-mono mt-2">
              ID: {initial!.id}
            </p>
          )}
        </div>
        <Link
          href="/admin/case-studies"
          className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
        >
          ← Back to list
        </Link>
      </div>

      {/* ─── Status / error / success ────────────────────────────────── */}
      {error && (
        <div className="mb-6 flex items-start gap-3 border border-red-400/20 bg-red-500/[0.04] px-4 py-3">
          <AlertCircle className="size-4 text-red-400/80 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300 font-light">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 flex items-start gap-3 border border-emerald-400/20 bg-emerald-500/[0.04] px-4 py-3">
          <CheckCircle2 className="size-4 text-emerald-400/80 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-300 font-light">{success}</p>
        </div>
      )}

      {/* ─── Top metadata grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block font-light">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The abandonment loop that wasn't about leaving"
            className="w-full bg-[#070707] border border-white/[0.06] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/40 focus:outline-none font-light"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block font-light">
            Slug (URL)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="auto-suggested from title"
            className="w-full bg-[#070707] border border-white/[0.06] px-3 py-2 text-sm text-[#cfcabf] focus:border-[#c9a96e]/40 focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block font-light">
            Pattern (Atlas slug)
          </label>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full bg-[#070707] border border-white/[0.06] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/40 focus:outline-none font-light"
          >
            {ATLAS_PATTERNS.map((p) => (
              <option key={p.slug} value={p.slug} className="bg-[#070707]">
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block font-light">
              Client initials
            </label>
            <input
              type="text"
              value={clientInitials}
              onChange={(e) => setClientInitials(e.target.value)}
              placeholder="R., 34"
              className="w-full bg-[#070707] border border-white/[0.06] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/40 focus:outline-none font-light"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block font-light">
              Age (optional)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={clientAge}
              onChange={(e) => setClientAge(e.target.value)}
              placeholder="—"
              className="w-full bg-[#070707] border border-white/[0.06] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/40 focus:outline-none font-light"
            />
          </div>
        </div>
      </div>

      {/* ─── Toggles: consent + published ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-6 mb-8 pb-6 border-b border-white/[0.04]">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="size-4 accent-[#c9a96e] cursor-pointer"
          />
          <span className="text-[11px] tracking-[0.25em] uppercase text-[#9a9a9a] group-hover:text-[#f0eee9] font-light transition-colors">
            Client consent given
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="size-4 accent-[#c9a96e] cursor-pointer"
          />
          <span className="text-[11px] tracking-[0.25em] uppercase text-[#9a9a9a] group-hover:text-[#f0eee9] font-light transition-colors">
            Published
          </span>
        </label>
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] ml-auto">
          {totalWords} words total
        </span>
      </div>

      {/* ─── 4 sections ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <SectionField
            label="01 Problem"
            value={problem}
            onChange={setProblem}
            tabKey="problem"
          />
          <SectionField
            label="02 Pattern"
            value={patternSection}
            onChange={setPatternSection}
            tabKey="pattern"
          />
          <SectionField
            label="03 Session"
            value={session}
            onChange={setSession}
            tabKey="session"
          />
          <SectionField
            label="04 Shift"
            value={shift}
            onChange={setShift}
            tabKey="shift"
          />
        </div>

        {/* Preview pane */}
        <div className="border border-white/[0.04] bg-[#050505]/60 p-5 lg:sticky lg:top-24 self-start max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`text-[10px] tracking-[0.25em] uppercase font-light transition-colors flex items-center gap-1.5 ${
                  showPreview ? "text-[#c9a96e]" : "text-[#7a7a7a] hover:text-[#f0eee9]"
                }`}
              >
                <Eye className="size-3" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`text-[10px] tracking-[0.25em] uppercase font-light transition-colors flex items-center gap-1.5 ${
                  !showPreview ? "text-[#c9a96e]" : "text-[#7a7a7a] hover:text-[#f0eee9]"
                }`}
              >
                <EyeOff className="size-3" />
                Raw
              </button>
            </div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] font-light">
              {previewTab === "problem" && "Problem"}
              {previewTab === "pattern" && "Pattern"}
              {previewTab === "session" && "Session"}
              {previewTab === "shift" && "Shift"}
            </p>
          </div>

          {showPreview ? (
            <div
              className="text-[#cfcabf] text-sm leading-[1.7] font-light [&_p]:my-3 [&_h1]:text-2xl [&_h1]:font-serif [&_h1]:text-[#f0eee9] [&_h1]:font-light [&_h1]:my-4 [&_h2]:text-xl [&_h2]:font-serif [&_h2]:text-[#c9a96e] [&_h2]:font-light [&_h2]:my-3 [&_h3]:text-lg [&_h3]:font-serif [&_h3]:text-[#f0eee9] [&_h3]:font-light [&_h3]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#c9a96e]/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#cfcabf] [&_blockquote]:font-serif [&_blockquote]:my-3 [&_strong]:text-[#f0eee9] [&_a]:text-[#c9a96e] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <pre className="text-xs text-[#9a9a9a] font-mono whitespace-pre-wrap break-words">
              {previewTab === "problem" && problem}
              {previewTab === "pattern" && patternSection}
              {previewTab === "session" && session}
              {previewTab === "shift" && shift}
            </pre>
          )}
        </div>
      </div>

      {/* ─── Action row ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          {isEdit ? "Save changes" : "Create case study"}
        </button>

        {isEdit && initial!.published && (
          <Link
            href={`/case-studies/${initial!.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
          >
            <ExternalLink className="size-3.5" />
            View live
          </Link>
        )}

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-red-400/70 hover:text-red-400 transition-colors ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
