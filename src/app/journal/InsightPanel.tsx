"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * InsightPanel — weekly LLM synthesis display + generator.
 *
 * State:
 *   - idle        — shows the existing insight (if any) + a "Generate" button
 *   - loading     — calls /api/journal/insight and shows a calm loader
 *   - success     — shows the new insight, replaces any prior text
 *   - error       — shows an actionable error message + retry
 *   - rate-limited — shows the "one per day" message + retry timer
 *
 * The panel reads its initial insight from the most recent entry's `insight`
 * field (passed as a prop), so server-rendered content is visible immediately.
 * When the user generates a new insight, the API updates every entry in the
 * 7-day window — we just display the returned text, no refetch needed.
 */

interface InsightPanelProps {
  /** Existing insight text (most recent entry's insight field). */
  initialInsight: string | null;
  /** Entry count in the last 7 days — used to decide whether to enable the button. */
  recentEntryCount: number;
}

export default function InsightPanel({
  initialInsight,
  recentEntryCount,
}: InsightPanelProps) {
  const [insight, setInsight] = useState<string | null>(initialInsight);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "rate-limited"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Fetch CSRF token on mount.
  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || null))
      .catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (status === "loading" || !csrfToken) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/journal/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setStatus("rate-limited");
        setError(
          data?.error ||
            "You can generate one insight per day. Come back tomorrow."
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setError(
          data?.error || "The synthesis could not be generated. Try again."
        );
        return;
      }

      const data = (await res.json()) as {
        insight: string | null;
        weekStart?: string;
        weekEnd?: string;
        entryCount?: number;
      };

      if (!data.insight) {
        setStatus("error");
        setError(
          "No journal entries in the last 7 days. Log tomorrow and the week will start taking shape."
        );
        return;
      }

      setInsight(data.insight);
      setGeneratedAt(new Date().toISOString());
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Network error — please retry.");
    }
  }, [status, csrfToken]);

  const canGenerate =
    recentEntryCount > 0 && status !== "loading" && csrfToken !== null;

  return (
    <div className="space-y-6">
      {/* ─── Existing / new insight display ──────────────────────────────── */}
      <AnimatePresence mode="wait">
        {insight ? (
          <motion.article
            key={insight + (generatedAt || "init")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="border-l border-[#c9a96e]/30 pl-6 sm:pl-8 py-2"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              {generatedAt ? "Just now" : "Most recent insight"}
            </p>
            <div className="prose-journal">
              {insight.split("\n").map((para, i) => (
                <p
                  key={i}
                  className={`text-base sm:text-lg text-[#cfcabf] font-light leading-[1.85] mb-4 last:mb-0 ${
                    // The final paragraph (the reflective question) gets gold italic treatment.
                    i === insight.split("\n").length - 1
                      ? "text-[#c9a96e] italic font-light text-lg sm:text-xl mt-6 pt-4 border-t border-white/[0.04]"
                      : ""
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>
          </motion.article>
        ) : status !== "loading" ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-l border-white/[0.06] pl-6 sm:pl-8 py-2"
          >
            <p className="text-base text-[#9a9a9a] font-light leading-[1.8] max-w-xl">
              {recentEntryCount === 0
                ? "Log a few days this week. When there's enough shape to see, the synthesis will surface the pattern underneath."
                : "Your week has shape. Generate the synthesis and the underlying pattern will surface — written back to you in the AstroKalki voice."}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ─── Loading state ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-l border-[#c9a96e]/30 pl-6 sm:pl-8 py-2"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-4 font-light animate-pulse">
              Reading the week…
            </p>
            <div className="space-y-3">
              {[80, 95, 70, 88].map((w, i) => (
                <div
                  key={i}
                  className="h-3 bg-white/[0.04] animate-pulse"
                  style={{ width: `${w}%`, animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-[#5a5a5a] font-light italic">
              The synthesis usually lands in 5–15 seconds.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Error / rate-limit feedback ─────────────────────────────────── */}
      <AnimatePresence>
        {(status === "error" || status === "rate-limited") && error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-[#a58a54]/90 font-light leading-relaxed"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ─── Generate button ─────────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || status === "rate-limited"}
          className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === "loading"
            ? "Reading the week…"
            : insight
              ? "Regenerate this week's insight"
              : "Generate this week's insight"}
          {status !== "loading" && <span className="text-[#c9a96e]">→</span>}
        </button>
        {recentEntryCount === 0 && (
          <p className="mt-3 text-[11px] text-[#5a5a5a] font-light leading-relaxed">
            The synthesis needs at least one entry in the last 7 days.
          </p>
        )}
      </div>
    </div>
  );
}
