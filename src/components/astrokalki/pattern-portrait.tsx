"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, RefreshCw, AlertCircle } from "lucide-react";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";

/**
 * PatternPortrait — the AI-generated pattern portrait UI.
 *
 * Renders inline after a user has identified their pattern (via the
 * micro-reading or the Atlas quiz). The portrait is a shareable, personal
 * artifact — an abstract cinematic image built from a per-pattern prompt.
 *
 * Props:
 *   pattern  — Atlas slug (one of the 10). Used to build the prompt + label.
 *   email    — The user's email. Used to:
 *                a) POST to /api/ai/portrait (server persists the row keyed
 *                   by email so the gallery + member portal can find it).
 *                b) Fetch the existing-portrait gallery for this user on
 *                   mount and after each successful generation.
 *
 * States:
 *   - idle (no portrait yet)     → "Generate your pattern portrait" CTA
 *   - loading                    → gold pulse + "Generating your portrait..."
 *   - success                    → framed portrait card + Download/Share/Regenerate
 *   - error                      → "Portrait generation failed. Please try again."
 *
 * The gallery (multiple portraits for this email+pattern) is rendered below
 * the active portrait whenever more than one exists.
 *
 * Design system: bg #050505, gold #c9a96e. Portrait framed with a thin gold
 * border on an obsidian inner panel. Caption in Cinzel uppercase 11px
 * tracking-[0.3em]. Loading text in Playfair italic. CTA is a gold-underline
 * text link. Download/Share/Regenerate are minimal #7a7a7a text-links that
 * lift to gold on hover. NO blue/indigo.
 */

interface PatternPortraitProps {
  pattern: string;
  email: string;
}

interface Portrait {
  id: string;
  pattern: string;
  imageUrl: string;
  createdAt: string;
}

const CINZEL = { fontFamily: "var(--font-cinzel)" } as const;
const PLAYFAIR = { fontFamily: "var(--font-playfair)" } as const;

// 60s timeout — image generation can take 10-30s; we leave generous headroom.
const FETCH_TIMEOUT_MS = 60_000;

export default function PatternPortrait({
  pattern,
  email,
}: PatternPortraitProps) {
  const atlasPattern = getAtlasPattern(pattern);

  const [activePortrait, setActivePortrait] = useState<Portrait | null>(null);
  const [gallery, setGallery] = useState<Portrait[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared">("idle");
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ─── Fetch existing portraits for this email on mount ────────────────────
  // Shows the user their previous generations immediately if they're a
  // returning visitor. We filter client-side by pattern so the gallery only
  // shows portraits for the current pattern (a user might land on different
  // patterns across visits).
  const refreshGallery = useCallback(async () => {
    if (!email) return;
    try {
      const res = await fetch(
        `/api/ai/portrait/history?email=${encodeURIComponent(email)}`,
        { method: "GET" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const all: Portrait[] = Array.isArray(data?.portraits) ? data.portraits : [];
      const matching = all.filter((p) => p.pattern === pattern);
      setGallery(matching);
      setHistoryLoaded(true);
      // If there's at least one portrait for this pattern, surface the most
      // recent as the active portrait so the user sees their existing artifact
      // rather than a fresh CTA.
      if (matching.length > 0 && !activePortrait) {
        setActivePortrait(matching[0]);
      }
    } catch {
      // Silent — the gallery is a nice-to-have, never a blocker.
      setHistoryLoaded(true);
    }
  }, [email, pattern]);

  useEffect(() => {
    refreshGallery();
    return () => {
      // Abort any in-flight generation on unmount.
      abortRef.current?.abort();
    };
  }, [email, pattern]);

  // ─── Generate (or regenerate) a portrait ────────────────────────────────
  const generatePortrait = useCallback(async () => {
    if (!email || !pattern) return;
    setIsLoading(true);
    setError(null);
    setShareStatus("idle");

    // Set up the timeout + abort controller.
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch("/api/ai/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern, email, website: "" }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error ||
          (res.status === 429
            ? "You've reached the portrait generation limit. Please try again later."
            : "Portrait generation failed. Please try again.");
        setError(message);
        return;
      }

      const data = await res.json();
      const newPortrait: Portrait = {
        id: data.portraitId,
        pattern,
        imageUrl: data.imageUrl,
        createdAt: new Date().toISOString(),
      };
      setActivePortrait(newPortrait);
      // Prepend to gallery (newest first)
      setGallery((prev) => [newPortrait, ...prev]);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setError(
          "Portrait generation is taking longer than expected. Please try again."
        );
      } else {
        setError("Portrait generation failed. Please try again.");
      }
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      setIsLoading(false);
    }
  }, [email, pattern]);

  // ─── Download the active portrait ────────────────────────────────────────
  // We fetch the image as a blob (so the download attribute is honoured
  // cross-origin) and trigger an anchor click.
  const handleDownload = useCallback(async () => {
    if (!activePortrait) return;
    try {
      const res = await fetch(activePortrait.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `astrokalki-${pattern}-${activePortrait.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback — open the image in a new tab so the user can save manually.
      window.open(activePortrait.imageUrl, "_blank");
    }
  }, [activePortrait, pattern]);

  // ─── Share the active portrait ───────────────────────────────────────────
  // Web Share API with files if supported, else copy a direct link.
  const handleShare = useCallback(async () => {
    if (!activePortrait) return;
    const shareUrl = `${window.location.origin}${activePortrait.imageUrl}`;
    const shareText = `My ${atlasPattern?.name ?? "pattern"} portrait — AstroKalki Pattern Atlas.`;

    try {
      // Try file share first (mobile + supporting desktop browsers).
      if (
        typeof navigator !== "undefined" &&
        typeof (navigator as { canShare?: (d: unknown) => boolean }).canShare ===
          "function"
      ) {
        try {
          const res = await fetch(activePortrait.imageUrl);
          const blob = await res.blob();
          const file = new File([blob], "astrokalki-portrait.png", {
            type: "image/png",
          });
          const shareData = {
            title: "AstroKalki Pattern Portrait",
            text: shareText,
            files: [file],
          };
          if (
            (navigator as { canShare?: (d: unknown) => boolean }).canShare!(
              shareData
            )
          ) {
            await navigator.share(shareData);
            return;
          }
        } catch {
          // Fall through to URL share.
        }
      }

      // URL-only share.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({ title: "AstroKalki Pattern Portrait", text: shareText, url: shareUrl });
        return;
      }

      // Clipboard fallback.
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 2400);
      }
    } catch {
      // User cancelled or share failed — silent.
    }
  }, [activePortrait, atlasPattern]);

  // ─── Render ──────────────────────────────────────────────────────────────

  // Don't render anything until we know whether there's existing history.
  // This prevents a flash of "Generate your portrait" CTA followed by a
  // gallery pop-in for returning users.
  if (!historyLoaded) {
    return <div aria-hidden className="min-h-[1px]" />;
  }

  return (
    <div className="mt-12 pt-8 border-t border-white/[0.06]">
      {/* Eyebrow + description */}
      <p
        className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-3 font-light"
        style={CINZEL}
      >
        Pattern portrait
      </p>
      <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 max-w-md font-light">
        A one-of-a-kind visual, generated from the emotional shape of your
        pattern. Abstract, cinematic, yours — no two are the same.
      </p>

      {/* ─── Idle: CTA ──────────────────────────────────────────────────── */}
      {!isLoading && !activePortrait && (
        <button
          type="button"
          onClick={generatePortrait}
          disabled={!email}
          className="inline-flex items-baseline gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={CINZEL}
          aria-label="Generate your pattern portrait"
        >
          Generate your pattern portrait
          <span aria-hidden>→</span>
        </button>
      )}

      {/* ─── Loading: gold pulse ────────────────────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-16 px-8"
            role="status"
            aria-live="polite"
          >
            {/* Gold pulse orb */}
            <div className="relative w-16 h-16 mb-8">
              <span
                className="absolute inset-0 rounded-full bg-[#c9a96e]/20 animate-ping"
                aria-hidden
              />
              <span
                className="absolute inset-2 rounded-full bg-[#c9a96e]/40 animate-pulse"
                aria-hidden
              />
              <span
                className="absolute inset-4 rounded-full bg-[#c9a96e]"
                aria-hidden
              />
            </div>
            <p
              className="text-[#c9a96e] text-lg sm:text-xl font-light italic"
              style={PLAYFAIR}
            >
              Generating your portrait…
            </p>
            <p
              className="text-[#5a5a5a] text-[10px] tracking-[0.3em] uppercase mt-3 font-light"
              style={CINZEL}
            >
              This can take 20–30 seconds
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Error ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="flex items-start gap-3 py-6 px-4 border border-[#c9a96e]/20 bg-[#c9a96e]/[0.02] max-w-md"
            role="alert"
          >
            <AlertCircle
              className="h-4 w-4 text-[#c9a96e] shrink-0 mt-0.5"
              aria-hidden
            />
            <div>
              <p className="text-[#cfcabf] text-sm font-light leading-[1.7]">
                {error}
              </p>
              <button
                type="button"
                onClick={generatePortrait}
                className="mt-3 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors cursor-pointer"
                style={CINZEL}
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Success: framed portrait ──────────────────────────────────── */}
      <AnimatePresence>
        {activePortrait && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.7 }}
            className="max-w-md"
          >
            {/* The framed portrait — image is the hero */}
            <div className="border border-[#c9a96e]/20 p-2 bg-[#0a0a0a]">
              <div className="relative aspect-square overflow-hidden bg-[#050505]">
                <img
                  src={activePortrait.imageUrl}
                  alt={`AI-generated pattern portrait for ${atlasPattern?.name ?? "your pattern"}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Subtle gold border watermark */}
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#c9a96e]/10" />
              </div>
            </div>

            {/* Caption */}
            <p
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] mt-4 text-center font-light"
              style={CINZEL}
            >
              Your {atlasPattern?.name?.replace(" Pattern", "") ?? "Pattern"} portrait
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-6">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors cursor-pointer font-light"
                style={CINZEL}
                aria-label="Download portrait"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors cursor-pointer font-light"
                style={CINZEL}
                aria-label="Share portrait"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {shareStatus === "shared" ? "Link copied" : "Share"}
              </button>
              <button
                type="button"
                onClick={generatePortrait}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors cursor-pointer font-light"
                style={CINZEL}
                aria-label="Regenerate portrait"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Regenerate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Gallery: previous portraits for this pattern ───────────────── */}
      {gallery.length > 1 && !isLoading && (
        <div className="mt-16 pt-10 border-t border-white/[0.04]">
          <p
            className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light"
            style={CINZEL}
          >
            Your pattern portraits
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
            {gallery.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePortrait(p)}
                className={`group block border p-1 bg-[#0a0a0a] transition-colors cursor-pointer ${
                  p.id === activePortrait?.id
                    ? "border-[#c9a96e]/40"
                    : "border-white/[0.06] hover:border-[#c9a96e]/30"
                }`}
                aria-label={`View portrait generated ${new Date(p.createdAt).toLocaleDateString()}`}
              >
                <div className="relative aspect-square overflow-hidden bg-[#050505]">
                  <img
                    src={p.imageUrl}
                    alt={`Pattern portrait generated on ${new Date(p.createdAt).toLocaleDateString()}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mt-2 mb-1 text-center font-light font-mono">
                  {new Date(p.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
