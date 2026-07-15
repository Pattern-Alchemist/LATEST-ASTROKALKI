"use client";

/**
 * ArticleWriter — client component for /admin/write.
 *
 * The interactive AI writing assistant. Form + result display + inline edits.
 *
 * Flow:
 *   1. Admin enters a topic (large text field).
 *   2. Admin adds key points (tag-style — press Enter to add, X to remove).
 *   3. Admin optionally selects a cluster (dropdown).
 *   4. Admin clicks "Generate draft" → POST /api/ai/draft.
 *   5. Loading state ("Drafting your article..." with gold pulse).
 *   6. Result: structured preview via <DraftPreview />.
 *   7. Admin can: edit any section inline, regenerate, or download as markdown.
 *
 * The draft state is owned by this component; <DraftPreview /> calls onChange
 * with the updated draft, which lifts the edit up.
 *
 * Design system: #050505 bg, gold #c9a96e accent, borderless inputs with
 * bottom underline (gold on focus), Cinzel editorial labels, Playfair serif
 * headlines. Matches /admin/leads dark editorial.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DraftPreview from "./DraftPreview";
import type { ArticleDraft } from "@/lib/ai/writing-prompt";

const CLUSTER_OPTIONS = [
  { slug: "relationship-patterns", label: "Relationship Patterns" },
  { slug: "self-sabotage", label: "Self-Sabotage" },
  { slug: "identity-purpose", label: "Identity & Purpose" },
  { slug: "astrology-psychology", label: "Astrology + Psychology" },
  { slug: "psychological-observations", label: "Psychological Observations" },
] as const;

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; draft: ArticleDraft; durationMs: number };

interface ApiResponse {
  ok?: boolean;
  draft?: ArticleDraft | null;
  durationMs?: number;
  error?: string;
  retryAfterSeconds?: number;
  note?: string;
}

/** Build a markdown download from the draft — mirrors the article page shape. */
function buildMarkdown(draft: ArticleDraft): string {
  const lines: string[] = [];
  lines.push(`# ${draft.title}`, "");
  lines.push(`> ${draft.excerpt}`, "");
  lines.push(`**Cluster:** ${draft.category}`, "");
  lines.push(`**Related service:** ${draft.relatedService}`, "");
  lines.push("---", "");
  lines.push("## Concise answer", "");
  lines.push(draft.conciseAnswer, "");
  lines.push("## Key takeaways", "");
  draft.keyTakeaways.forEach((k, i) => {
    lines.push(`${i + 1}. ${k}`);
  });
  lines.push("", "## Body", "");
  // Strip a leading # H1 if the body already has one (avoid duplicate).
  const body = draft.body.replace(/^#\s+.+?\n/, "");
  lines.push(body, "");
  lines.push("## Frequently asked questions", "");
  draft.faqs.forEach((f) => {
    lines.push(`### ${f.q}`, "");
    lines.push(f.a, "");
  });
  lines.push("## References", "");
  draft.references.forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.author || "—"} (${r.year || "n.d."}). *${r.title}*. ${r.source || ""}${r.url ? ` ${r.url}` : ""}`.trim()
    );
  });
  lines.push("", "## About the author", "");
  lines.push(draft.authorBio, "");
  return lines.join("\n");
}

export default function ArticleWriter() {
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [keyPointInput, setKeyPointInput] = useState("");
  const [cluster, setCluster] = useState<string>("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [lastParams, setLastParams] = useState<{
    topic: string;
    keyPoints: string[];
    cluster: string;
  } | null>(null);

  const topicRef = useRef<HTMLTextAreaElement>(null);

  const addKeyPoint = useCallback(() => {
    const v = keyPointInput.trim();
    if (!v) return;
    if (keyPoints.length >= 12) return;
    if (keyPoints.includes(v)) {
      setKeyPointInput("");
      return;
    }
    setKeyPoints([...keyPoints, v]);
    setKeyPointInput("");
  }, [keyPointInput, keyPoints]);

  const removeKeyPoint = useCallback((idx: number) => {
    setKeyPoints((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const generate = useCallback(async () => {
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 3) {
      setStatus({
        kind: "error",
        message: "Topic must be at least 3 characters.",
      });
      topicRef.current?.focus();
      return;
    }

    setStatus({ kind: "loading" });
    setLastParams({ topic: trimmedTopic, keyPoints, cluster });

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: trimmedTopic,
          keyPoints,
          cluster: cluster || undefined,
        }),
      });
      const data: ApiResponse = await res.json().catch(() => ({} as ApiResponse));

      if (!res.ok) {
        const msg =
          data.error ||
          (res.status === 429
            ? "Hourly draft limit reached. The work continues when you return."
            : res.status === 401
              ? "Admin session expired. Please re-login."
              : "The draft did not come through. Try again in a moment.");
        setStatus({ kind: "error", message: msg });
        return;
      }

      if (!data.draft) {
        // Honeypot triggered — looks like success but no draft.
        setStatus({
          kind: "error",
          message: "Unexpected empty response. Try again.",
        });
        return;
      }

      setDraft(data.draft);
      setDurationMs(data.durationMs);
      setStatus({
        kind: "success",
        draft: data.draft,
        durationMs: data.durationMs ?? 0,
      });
    } catch (err) {
      console.error("[admin/write] generate failed:", err);
      setStatus({
        kind: "error",
        message:
          "Network error — the request did not complete. Check the dev log.",
      });
    }
  }, [topic, keyPoints, cluster]);

  const downloadMarkdown = useCallback(() => {
    if (!draft) return;
    const md = buildMarkdown(draft);
    const slug = draft.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "draft";
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [draft]);

  return (
    <div className="space-y-10">
      {/* ─── Form ────────────────────────────────────────────────── */}
      <section className="border border-white/[0.04] bg-white/[0.01] p-6 sm:p-8">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-3 font-light">
          Draft inputs
        </p>

        {/* Topic */}
        <div className="mb-8">
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block">
            Topic
          </label>
          <textarea
            ref={topicRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Why you keep choosing emotionally unavailable partners"
            rows={2}
            maxLength={400}
            className="w-full bg-transparent border-0 border-b border-white/10 px-0 py-3 text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] placeholder:text-[#3a3a3a] focus:border-[#c9a96e] focus:outline-none resize-none"
          />
          <div className="flex justify-between mt-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
              The central question or recognition.
            </p>
            <p className="text-[10px] text-[#5a5a5a]">{topic.length}/400</p>
          </div>
        </div>

        {/* Key points (tag-style) */}
        <div className="mb-8">
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block">
            Key points ({keyPoints.length}/12)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={keyPointInput}
              onChange={(e) => setKeyPointInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyPoint();
                }
              }}
              placeholder="Press Enter to add a key point"
              maxLength={400}
              className="flex-1 bg-transparent border-0 border-b border-white/10 px-0 py-2 text-base text-[#f0eee9] font-light placeholder:text-[#3a3a3a] focus:border-[#c9a96e] focus:outline-none"
            />
            <button
              type="button"
              onClick={addKeyPoint}
              disabled={keyPoints.length >= 12 || !keyPointInput.trim()}
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-3 py-2 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <Plus className="size-3" />
              Add
            </button>
          </div>
          {keyPoints.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {keyPoints.map((k, i) => (
                <li
                  key={i}
                  className="group inline-flex items-start gap-2 bg-[#c9a96e]/5 border border-[#c9a96e]/20 px-3 py-1.5 text-[#cfcabf] text-sm font-light"
                >
                  <span className="text-[#c9a96e]/60 font-mono text-[10px] mt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{k}</span>
                  <button
                    type="button"
                    onClick={() => removeKeyPoint(i)}
                    className="text-[#5a5a5a] hover:text-red-400 ml-1"
                    title="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-2">
            Optional. Weave these into the body — the LLM uses them as anchors.
          </p>
        </div>

        {/* Cluster selector */}
        <div className="mb-8">
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 block">
            Cluster (optional)
          </label>
          <Select value={cluster} onValueChange={(v) => setCluster(v)}>
            <SelectTrigger className="w-full sm:w-80 bg-transparent border-0 border-b border-white/10 rounded-none px-0 py-2 text-base text-[#f0eee9] font-light focus:border-[#c9a96e] focus:ring-0 hover:border-white/30">
              <SelectValue placeholder="Auto-detect (recommended)" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-[#c9a96e]/20 text-[#f0eee9]">
              <SelectItem value="" className="text-[#9a9a9a]">
                Auto-detect (recommended)
              </SelectItem>
              {CLUSTER_OPTIONS.map((c) => (
                <SelectItem
                  key={c.slug}
                  value={c.slug}
                  className="text-[#f0eee9] focus:bg-[#c9a96e]/10 focus:text-[#c9a96e]"
                >
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-2">
            Pre-selects the cluster; the LLM will still pick the best fit.
          </p>
        </div>

        {/* Generate button */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={generate}
            disabled={status.kind === "loading" || topic.trim().length < 3}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] px-6 py-3 hover:bg-[#d4b878] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {status.kind === "loading" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Drafting…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Generate draft
              </>
            )}
          </button>
          {status.kind === "success" && lastParams && (
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-4 py-3 hover:bg-[#c9a96e]/10 transition-colors"
              title="Regenerate from the same inputs"
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </button>
          )}
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
            Rate limit: 10 drafts/hour
          </span>
        </div>
      </section>

      {/* ─── Status: loading ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {status.kind === "loading" && (
          <motion.section
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border border-[#c9a96e]/20 bg-white/[0.015] p-10 sm:p-16 flex flex-col items-center justify-center text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#c9a96e]/30 blur-2xl animate-pulse" />
              <Sparkles className="size-8 text-[#c9a96e] relative animate-pulse" />
            </div>
            <p className="text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-2">
              Drafting your article…
            </p>
            <p className="text-[#7a7a7a] text-sm font-light max-w-md">
              Long-form generation takes 10–30 seconds. The model is composing
              a 1500+ word structured draft in the AstroKalki voice.
            </p>
            <div className="mt-6 flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="size-1.5 bg-[#c9a96e] rounded-full"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* ─── Status: error ──────────────────────────────────────── */}
        {status.kind === "error" && (
          <motion.section
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-red-500/30 bg-red-500/[0.04] p-6 sm:p-8"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-400/80 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-red-400/80 mb-2">
                  Draft failed
                </p>
                <p className="text-[#cfcabf] text-sm font-light leading-relaxed">
                  {status.message}
                </p>
                <button
                  type="button"
                  onClick={generate}
                  className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
                >
                  <RefreshCw className="size-3" />
                  Try again
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ─── Status: success → DraftPreview ─────────────────────── */}
        {status.kind === "success" && draft && (
          <motion.section
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-[#c9a96e]/20 pb-4">
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-1">
                  Draft ready
                </p>
                <p className="text-[#7a7a7a] text-xs font-light">
                  Edit any section inline · download as markdown when done.
                </p>
              </div>
              <button
                onClick={downloadMarkdown}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] px-4 py-2 hover:bg-[#d4b878] transition-colors"
              >
                <Download className="size-3.5" />
                Save as markdown
              </button>
            </div>
            <DraftPreview
              draft={draft}
              onChange={setDraft}
              onDownloadMarkdown={downloadMarkdown}
              durationMs={durationMs}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
