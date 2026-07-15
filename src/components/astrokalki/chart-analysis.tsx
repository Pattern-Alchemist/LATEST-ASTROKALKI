"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Upload, X, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ATLAS_BY_SLUG } from "@/lib/content/patterns/atlas";

/**
 * ChartAnalysis — the VLM-powered birth chart upload + analysis UI.
 *
 * Flow:
 *   1. Drag-and-drop or click-to-upload a chart image (PNG/JPG/WEBP, ≤5MB).
 *   2. (If not signed in) Enter email — this is the lead-capture moment.
 *   3. POST the image + email + honeypot to /api/ai/chart as multipart/form-data.
 *   4. Display the prose analysis (Playfair Display serif) and the identified
 *      pattern slugs as clickable chips linking to /patterns/atlas/[slug].
 *   5. If the user is signed in, also display their past analyses.
 *
 * Props:
 *   email            — Pre-fills the email field (passed from the server
 *                      when the user is signed in via NextAuth). When set,
 *                      the email input is hidden.
 *   initialHistory   — Optional initial list of past analyses for the
 *                      signed-in user. Refreshed after each new analysis.
 */

export interface ChartHistoryItem {
  id: string;
  email: string;
  imageUrl: string;
  analysis: string;
  identifiedPatterns: string[];
  createdAt: string; // ISO
}

interface ChartAnalysisProps {
  email?: string | null;
  initialHistory?: ChartHistoryItem[];
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface AnalysisResult {
  analysis: string;
  identifiedPatterns: string[];
  analysisId: string;
  isNotAChart: boolean;
}

export default function ChartAnalysis({
  email: sessionEmail,
  initialHistory = [],
}: ChartAnalysisProps) {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [email, setEmail] = useState(sessionEmail || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<ChartHistoryItem[]>(initialHistory);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URLs when the preview changes to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleFile = useCallback(
    (incoming: File | null) => {
      setError(null);
      setResult(null);

      if (!incoming) return;

      if (!ACCEPTED_TYPES.includes(incoming.type)) {
        setError("Please upload a PNG, JPG, or WEBP image.");
        return;
      }
      if (incoming.size > MAX_FILE_BYTES) {
        const mb = (incoming.size / (1024 * 1024)).toFixed(1);
        setError(`Image is ${mb} MB — max upload is 5 MB.`);
        return;
      }

      // Revoke the old preview URL before creating a new one.
      if (filePreview) URL.revokeObjectURL(filePreview);
      setFile(incoming);
      setFilePreview(URL.createObjectURL(incoming));
    },
    [filePreview]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0] || null;
      handleFile(dropped);
    },
    [handleFile]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] || null;
      handleFile(selected);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [filePreview]);

  const analyze = useCallback(async () => {
    setError(null);
    if (!file) {
      setError("Please select a chart image first.");
      return;
    }
    if (!sessionEmail && !email) {
      setError("Please enter your email so we can save your analysis.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("email", sessionEmail || email);
      // Honeypot — must be empty. Real users never see this field.
      fd.append("website", "");

      const res = await fetch("/api/ai/chart", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && typeof data.error === "string" && data.error) ||
          "We couldn't analyse your chart right now. Please try again.";
        setError(msg);
        return;
      }

      setResult(data as AnalysisResult);

      // Refresh history (only relevant for signed-in users, but the call is
      // cheap and gives non-members a record if they're using the same email).
      if (sessionEmail || email) {
        try {
          const historyRes = await fetch(
            `/api/ai/chart/history?email=${encodeURIComponent(
              sessionEmail || email
            )}`,
            { method: "GET" }
          );
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (Array.isArray(historyData.analyses)) {
              setHistory(historyData.analyses as ChartHistoryItem[]);
            }
          }
        } catch {
          // Non-blocking — the analysis still succeeded.
        }
      }

      // Scroll to results.
      setTimeout(() => {
        document
          .getElementById("chart-analysis-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Network error — please retry.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, email, sessionEmail]);

  return (
    <div className="w-full">
      {/* ─── Upload zone + form ─────────────────────────────────────────── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative border border-dashed p-12 text-center transition-colors duration-300 ${
          isDragging
            ? "border-[#c9a96e]/60 bg-[#c9a96e]/[0.03]"
            : "border-white/[0.08] hover:border-[#c9a96e]/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileInputChange}
          className="sr-only"
          id="chart-image-input"
          aria-label="Upload birth chart image"
        />

        {!filePreview ? (
          <label
            htmlFor="chart-image-input"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <Upload
              className="text-[#c9a96e]/60"
              size={28}
              strokeWidth={1.25}
              aria-hidden
            />
            <div>
              <p className="text-sm text-[#cfcabf] font-light leading-relaxed">
                Drop your birth chart image here, or{" "}
                <span className="text-[#c9a96e] underline underline-offset-4 decoration-[#c9a96e]/40 hover:decoration-[#c9a96e]">
                  browse
                </span>
              </p>
              <p className="mt-2 text-[11px] text-[#5a5a5a] font-light tracking-wide">
                PNG, JPG, or WEBP · up to 5 MB
              </p>
            </div>
          </label>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative max-w-xs w-full">
              <img
                src={filePreview}
                alt="Chart preview"
                className="w-full h-auto max-h-64 object-contain border border-white/[0.06]"
              />
              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove selected image"
                className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#050505] border border-white/[0.08] text-[#9a9a9a] hover:text-[#f0eee9] hover:border-[#c9a96e]/40 flex items-center justify-center transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-[11px] text-[#5a5a5a] font-light tracking-wide">
              {file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB
            </p>
          </div>
        )}
      </div>

      {/* ─── Email input (only if not signed in) ──────────────────────── */}
      {!sessionEmail && (
        <div className="mt-8">
          <label
            htmlFor="chart-email"
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
          >
            Your email
          </label>
          <input
            id="chart-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="w-full max-w-md bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
          />
          <p className="mt-3 text-[11px] text-[#5a5a5a] font-light leading-relaxed max-w-md">
            We save your analysis to this email so you can revisit it later.
            We&apos;ll also send you one follow-up email — never spam.
          </p>
        </div>
      )}

      {/* ─── Honeypot — visually hidden, must stay empty ──────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="chart-website">Website (leave empty)</label>
        <input
          type="text"
          id="chart-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value=""
          onChange={() => {}}
        />
      </div>

      {/* ─── Error display ────────────────────────────────────────────── */}
      {error && (
        <div className="mt-8 flex items-start gap-3 border border-[#a58a54]/30 bg-[#a58a54]/[0.04] p-4">
          <AlertCircle
            size={16}
            className="text-[#a58a54] shrink-0 mt-0.5"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-sm text-[#cfcabf] font-light leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* ─── Analyze button ───────────────────────────────────────────── */}
      <div className="mt-10">
        <button
          type="button"
          onClick={analyze}
          disabled={isAnalyzing || !file || (!sessionEmail && !email)}
          className="group inline-flex items-center gap-4 px-8 py-4 bg-[#c9a96e] text-[#050505] text-[11px] tracking-[0.3em] uppercase font-medium hover:bg-[#d8b876] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2
                size={14}
                className="animate-spin"
                strokeWidth={2}
                aria-hidden
              />
              <span className="animate-pulse">Reading the chart…</span>
            </>
          ) : (
            <>
              <Sparkles size={14} strokeWidth={1.5} aria-hidden />
              <span>Analyze my chart</span>
              <span className="text-[#050505]/60">→</span>
            </>
          )}
        </button>
        {isAnalyzing && (
          <p className="mt-4 text-[11px] text-[#5a5a5a] font-light leading-relaxed">
            This takes 10–20 seconds. The model is reading your chart&apos;s
            planetary placements.
          </p>
        )}
      </div>

      {/* ─── Result ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            id="chart-analysis-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-20 pt-12 border-t border-white/[0.06]"
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
              Your chart analysis
            </p>

            {result.isNotAChart ? (
              <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] max-w-2xl"
                 style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                {result.analysis}
              </p>
            ) : (
              <>
                {/* Prose analysis — Playfair Display serif */}
                <div
                  className="max-w-2xl text-[#cfcabf] leading-relaxed text-base sm:text-lg"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  {result.analysis
                    .split(/\n\n+/)
                    .filter((p) => p.trim().length > 0)
                    .map((paragraph, i) => (
                      <p key={i} className="mb-6 last:mb-0">
                        {paragraph.trim()}
                      </p>
                    ))}
                </div>

                {/* Identified pattern chips */}
                {result.identifiedPatterns.length > 0 && (
                  <div className="mt-10">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
                      Identified patterns
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.identifiedPatterns.map((slug) => {
                        const pattern = ATLAS_BY_SLUG[slug];
                        const label = pattern
                          ? pattern.name.replace(/ Pattern$/, "")
                          : slug;
                        return (
                          <Link
                            key={slug}
                            href={`/patterns/atlas/${slug}`}
                            className="inline-block border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10 rounded-full px-3 py-1 text-[10px] uppercase transition-colors"
                            style={{
                              fontFamily: '"Cinzel", Georgia, serif',
                              letterSpacing: "0.15em",
                            }}
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Save-to-account CTA */}
                {!sessionEmail && (
                  <div className="mt-12 pt-8 border-t border-white/[0.06]">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-3 font-light">
                      Save this to your account
                    </p>
                    <p className="text-sm text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                      Sign in to keep a permanent archive of your chart
                      analyses, schedule a full decode session, and access the
                      Pattern Atlas.
                    </p>
                    <Link
                      href="/account"
                      className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                    >
                      Create my account
                      <span>→</span>
                    </Link>
                  </div>
                )}

                {/* Full decode CTA — always show */}
                <div className="mt-12 pt-8 border-t border-white/[0.06]">
                  <p className="text-sm text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md">
                    This is pattern recognition — a fragment. The full decode
                    requires your exact birth time, a live conversation, and
                    the questions only you can bring.
                  </p>
                  <Link
                    href="/#booking"
                    className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] transition-colors"
                  >
                    Book the full decode
                    <span className="text-[#c9a96e]">→</span>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Past analyses (only relevant if we have any) ─────────────── */}
      {history.length > 0 && (
        <div className="mt-20 pt-12 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Past analyses
          </p>
          <h3 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-8">
            Your previous chart readings.
          </h3>
          <div className="border-t border-white/[0.06]">
            {history.map((item, idx) => (
              <PastAnalysisRow key={item.id} item={item} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Disclaimer ───────────────────────────────────────────────── */}
      <div className="mt-16 pt-8 border-t border-white/[0.04]">
        <p className="text-[11px] text-[#5a5a5a] font-light leading-relaxed italic max-w-xl">
          This is pattern recognition, not prediction. The chart reveals
          tendencies, not certainties. Treat the analysis as a mirror, not a
          verdict.
        </p>
      </div>
    </div>
  );
}

/* ─── Past-analysis row ──────────────────────────────────────────────────── */

function PastAnalysisRow({
  item,
  index,
}: {
  item: ChartHistoryItem;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="py-6 border-b border-white/[0.06]">
      <div className="flex items-start gap-6">
        <span className="text-[11px] tracking-[0.2em] text-[#c9a96e]/40 font-mono shrink-0 mt-1">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
            <p className="text-sm text-[#f0eee9] font-serif font-light">
              {dateStr}
            </p>
            <p className="text-[11px] text-[#5a5a5a] font-light tracking-wide">
              {item.identifiedPatterns.length > 0
                ? `${item.identifiedPatterns.length} pattern${
                    item.identifiedPatterns.length === 1 ? "" : "s"
                  }`
                : "No patterns identified"}
            </p>
          </div>

          {item.identifiedPatterns.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {item.identifiedPatterns.map((slug) => {
                const pattern = ATLAS_BY_SLUG[slug];
                const label = pattern
                  ? pattern.name.replace(/ Pattern$/, "")
                  : slug;
                return (
                  <Link
                    key={slug}
                    href={`/patterns/atlas/${slug}`}
                    className="inline-block border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10 rounded-full px-3 py-1 text-[10px] uppercase transition-colors"
                    style={{
                      fontFamily: '"Cinzel", Georgia, serif',
                      letterSpacing: "0.15em",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}

          <p
            className={`text-sm text-[#9a9a9a] font-light leading-[1.8] ${
              expanded ? "" : "line-clamp-2"
            }`}
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {item.analysis}
          </p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 hover:text-[#c9a96e] transition-colors font-light cursor-pointer"
          >
            {expanded ? "Collapse" : "Read full analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}
