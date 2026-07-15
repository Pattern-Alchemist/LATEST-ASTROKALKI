"use client";

/**
 * JournalCheckIn — the daily transit check-in section of the Pattern Journal.
 *
 * Surfaces at the top of /journal (Section 0, before the entry form). When
 * the member clicks "Run today's check-in", we POST to /api/transits/check-in
 * which:
 *   1. Loads the member's latest birth chart (if any).
 *   2. Gets today's transits (cached in DB).
 *   3. Computes which Atlas patterns are activated by today's transits
 *      against the natal chart.
 *   4. Generates a 2-3 paragraph LLM insight + a journal prompt.
 *   5. Persists to UserTransit.
 *
 * The component shows:
 *   - The insight (Playfair italic, generous whitespace).
 *   - The activated patterns as chips linking to /patterns/atlas/[slug].
 *   - The journal prompt in a distinct box, with a "scroll to form" button.
 *
 * Rate-limited server-side to 1/day per user. If the member already ran
 * today's check-in, the server passes the existing one as `initialCheckIn`
 * and we render it immediately (no re-run allowed until tomorrow).
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type {
  TransitData,
  TransitPlanetName,
} from "@/lib/astrology/transits";
import {
  TRANSIT_PLANET_ORDER,
  formatTransitDegree,
  transitPlanetGlyph,
} from "@/lib/astrology/transits";
import { ZODIAC_SIGNS } from "@/lib/astrology/zodiac";
import type { PatternActivation } from "@/lib/astrology/pattern-activation";

/* -------------------------------------------------------------------------- */
/*  Public types (mirrors the API response)                                    */
/* -------------------------------------------------------------------------- */

export interface CheckInResult {
  transits: TransitData;
  patternActivations: PatternActivation[];
  insight: string;
  journalPrompt: string;
  hasNatalChart: boolean;
}

interface JournalCheckInProps {
  /** If the member already ran today's check-in, pass it here. */
  initialCheckIn?: CheckInResult | null;
  /** Called when the user clicks "Write in journal" — scrolls to the form. */
  onWriteInJournal?: (prompt: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function JournalCheckIn({
  initialCheckIn,
  onWriteInJournal,
}: JournalCheckInProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(initialCheckIn ? "success" : "idle");
  const [result, setResult] = useState<CheckInResult | null>(
    initialCheckIn ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  // Whether the current result came from the server's initial pass
  // (in which case re-running is allowed) vs. a fresh client-side run
  // (in which case the rate limit will block a re-run).
  const [isInitial] = useState<boolean>(Boolean(initialCheckIn));

  const runCheckIn = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/transits/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as
        | CheckInResult
        | { error: string };
      if (!res.ok) {
        setStatus("error");
        setError(
          (data as { error: string }).error ||
            "The check-in could not be generated right now.",
        );
        return;
      }
      setResult(data as CheckInResult);
      setStatus("success");
    } catch {
      setStatus("error");
      setError(
        "Network error. Check your connection and try again.",
      );
    }
  }, []);

  // ─── Render: success state ──────────────────────────────────────────
  if (status === "success" && result) {
    return (
      <CheckInResultView
        result={result}
        isInitial={isInitial}
        onWriteInJournal={onWriteInJournal}
      />
    );
  }

  // ─── Render: error state ────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8">
        <p
          className="text-base text-[#cfcabf] font-light leading-[1.7] mb-6"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          {error ||
            "The check-in could not be generated right now. Try again in a moment."}
        </p>
        <button
          type="button"
          onClick={runCheckIn}
          className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
        >
          Try again
          <span>→</span>
        </button>
      </div>
    );
  }

  // ─── Render: loading state ──────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-2 h-2 rounded-full bg-[#c9a96e] animate-pulse" />
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e]/80 font-light">
            Reading the current pattern weather…
          </p>
        </div>
        <div className="space-y-3">
          <div className="h-3 bg-white/[0.04] w-3/4 animate-pulse" />
          <div className="h-3 bg-white/[0.04] w-full animate-pulse" />
          <div className="h-3 bg-white/[0.04] w-5/6 animate-pulse" />
          <div className="h-3 bg-white/[0.04] w-2/3 animate-pulse" />
        </div>
        <p className="mt-6 text-[11px] text-[#5a5a5a] font-light leading-[1.7]">
          Loading today&apos;s transits, cross-referencing against your
          birth chart, and writing the insight. ~5 seconds.
        </p>
      </div>
    );
  }

  // ─── Render: idle state ─────────────────────────────────────────────
  return (
    <div className="bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8">
      <p
        className="text-base text-[#cfcabf] font-light leading-[1.7] mb-6"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
      >
        Run today&apos;s check-in. We&apos;ll cross-reference the current
        transits against your birth chart, name which of your patterns
        are activated today, and write a short insight — plus a journal
        prompt to take into the form below.
      </p>
      <button
        type="button"
        onClick={runCheckIn}
        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
      >
        Run today&apos;s check-in
        <span>→</span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Result view — shown after a successful check-in                            */
/* -------------------------------------------------------------------------- */

function CheckInResultView({
  result,
  isInitial,
  onWriteInJournal,
}: {
  result: CheckInResult;
  isInitial: boolean;
  onWriteInJournal?: (prompt: string) => void;
}) {
  const { insight, journalPrompt, patternActivations, hasNatalChart } = result;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="check-in-result"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-10"
      >
        {/* ─── Activated patterns ───────────────────────────────────── */}
        {patternActivations.length > 0 && (
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-4 font-light">
              Patterns activated today
              {!hasNatalChart && (
                <span className="ml-2 text-[#5a5a5a] normal-case tracking-normal">
                  (general — cast your birth chart for personalised activations)
                </span>
              )}
            </p>
            <div className="space-y-3">
              {patternActivations.map((a) => (
                <div
                  key={a.pattern}
                  className="border border-white/[0.06] p-4 bg-white/[0.01]"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <Link
                      href={`/patterns/atlas/${a.pattern}`}
                      className="text-sm text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                      style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                    >
                      {a.patternName}
                    </Link>
                    <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-mono whitespace-nowrap">
                      {Math.round(a.intensity * 100)}%
                    </span>
                  </div>
                  <p className="text-[13px] text-[#9a9a9a] font-light leading-[1.7]">
                    {a.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Insight ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-4 font-light">
            Today&apos;s insight
          </p>
          <div
            className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.85] italic space-y-4"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {insight.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {/* ─── Journal prompt ──────────────────────────────────────── */}
        <div className="border-l-2 border-[#c9a96e]/40 pl-6 py-2">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/80 mb-3 font-light">
            Journal prompt
          </p>
          <p
            className="text-lg text-[#f0eee9] font-light leading-[1.6] italic mb-4"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {journalPrompt}
          </p>
          {onWriteInJournal && (
            <button
              type="button"
              onClick={() => onWriteInJournal(journalPrompt)}
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Write in the journal
              <span>↓</span>
            </button>
          )}
        </div>

        {/* ─── Footer note ─────────────────────────────────────────── */}
        <p className="text-[11px] text-[#5a5a5a] font-light leading-[1.7]">
          {isInitial
            ? "You've already run today's check-in. Come back tomorrow — the pattern weather will have shifted."
            : "Saved to your account. You can run one check-in per day; the next will be available tomorrow."}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
