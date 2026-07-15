"use client";

/**
 * DayDetail — expanded detail view for a selected calendar day.
 *
 * Renders as an inline expanded section (NOT a modal) below the
 * calendar grid. Shows:
 *   - The selected date (long form)
 *   - Each activated pattern as a card: name, intensity bar, reason,
 *     and a preparation prompt
 *   - A "Write in journal" link if the day is today or in the future
 *   - A "Read the pattern" link to /patterns/atlas/[slug]
 *   - A "View today's transits" link to /transits
 *
 * If the selected day has no activations, renders a "quiet day" message
 * with a small explanation of what that means.
 */

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getPatternColor, hexToRgba } from "@/lib/astrology/pattern-colors";
import { getAtlasPattern } from "@/lib/content/patterns/atlas";
import type { ForecastDay } from "./types";

/* -------------------------------------------------------------------------- */
/*  Props                                                                       */
/* -------------------------------------------------------------------------- */

interface DayDetailProps {
  /** The selected day's forecast (or null if no day selected). */
  day: ForecastDay | null;
  /** Called when the user clicks the close button. */
  onClose?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function DayDetail({ day, onClose }: DayDetailProps) {
  return (
    <AnimatePresence mode="wait">
      {day && (
        <motion.div
          key={day.date}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white/[0.015] border border-white/[0.06] p-6 sm:p-8"
        >
          {/* ─── Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-2 font-light">
                Day detail
              </p>
              <h3
                className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em]"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                {formatLongDate(day.date)}
              </h3>
              <p className="text-sm text-[#7a7a7a] font-light mt-1.5">
                {day.activations.length === 0
                  ? "Quiet day — no strong pattern activations."
                  : `${day.activations.length} pattern${
                      day.activations.length === 1 ? "" : "s"
                    } activated. Peak: ${
                      getAtlasPattern(day.peakPattern ?? "")?.name ??
                      "—"
                    }.`}
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close day detail"
                className="text-[#5a5a5a] hover:text-[#c9a96e] transition-colors text-2xl leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* ─── Activations or quiet-day message ───────────────────── */}
          {day.activations.length === 0 ? (
            <QuietDayMessage />
          ) : (
            <div className="space-y-5">
              {day.activations.map((activation, idx) => {
                const atlas = getAtlasPattern(activation.pattern);
                const color = getPatternColor(activation.pattern);
                const intensityPct = Math.round(activation.intensity * 100);
                return (
                  <div
                    key={activation.pattern}
                    className="border border-white/[0.04] p-5 bg-white/[0.01] relative overflow-hidden"
                    style={{
                      borderLeft: `3px solid ${hexToRgba(color, activation.intensity)}`,
                    }}
                  >
                    {/* ─── Pattern name + intensity ─────────────────── */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1.5 font-mono"
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </p>
                        <Link
                          href={`/patterns/atlas/${activation.pattern}`}
                          className="text-base sm:text-lg text-[#c9a96e] hover:text-[#f0eee9] transition-colors block"
                          style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                        >
                          {atlas?.name ?? activation.patternName}
                        </Link>
                        {atlas?.tagline && (
                          <p
                            className="text-[13px] text-[#7a7a7a] font-light italic mt-1.5 leading-[1.6]"
                            style={{
                              fontFamily: '"Playfair Display", Georgia, serif',
                            }}
                          >
                            {atlas.tagline}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[9px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1 font-light">
                          Intensity
                        </p>
                        <p
                          className="text-lg font-mono"
                          style={{ color: hexToRgba(color, 0.95) }}
                        >
                          {intensityPct}
                          <span className="text-xs text-[#5a5a5a]">%</span>
                        </p>
                      </div>
                    </div>

                    {/* ─── Intensity bar ────────────────────────────── */}
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${intensityPct}%`,
                          background: hexToRgba(color, 0.85),
                        }}
                      />
                    </div>

                    {/* ─── Reason ───────────────────────────────────── */}
                    <div className="mb-4">
                      <p className="text-[9px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-1.5 font-light">
                        Why it&apos;s activated
                      </p>
                      <p
                        className="text-[14px] text-[#cfcabf] font-light leading-[1.7]"
                        style={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                        }}
                      >
                        {activation.reason}
                      </p>
                    </div>

                    {/* ─── Preparation prompt ───────────────────────── */}
                    <div className="bg-[#0a0a0a]/60 border-l-2 border-[#c9a96e]/30 pl-4 py-2">
                      <p className="text-[9px] tracking-[0.25em] uppercase text-[#c9a96e]/60 mb-1 font-light">
                        A preparation prompt
                      </p>
                      <p
                        className="text-[14px] text-[#f0eee9] font-light italic leading-[1.7]"
                        style={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                        }}
                      >
                        {preparationPrompt(activation.pattern)}
                      </p>
                    </div>

                    {/* ─── Per-activation links ─────────────────────── */}
                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-white/[0.04]">
                      <Link
                        href={`/patterns/atlas/${activation.pattern}`}
                        className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
                      >
                        Read the pattern →
                      </Link>
                      <Link
                        href="/journal"
                        className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
                      >
                        Write in journal →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Footer links ──────────────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/transits"
              className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
            >
              Today&apos;s real-time transits →
            </Link>
            <Link
              href="/journal"
              className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Open your journal →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quiet-day message                                                           */
/* -------------------------------------------------------------------------- */

function QuietDayMessage() {
  return (
    <div className="py-10 text-center">
      <p
        className="text-base text-[#cfcabf] font-light leading-[1.8] max-w-md mx-auto italic"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
      >
        No Atlas pattern is strongly activated today. The weather is
        quiet. This is a good day for ordinary things — and for
        noticing what surfaces when nothing is being amplified.
      </p>
      <p className="mt-4 text-[11px] text-[#5a5a5a] font-light tracking-wide">
        Quiet days are not empty days.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Curated preparation prompts for each Atlas pattern. These are short,
 * second-person, and ask the reader to notice — not to fix.
 *
 * The voice mirrors the AstroKalki Pattern Journal prompts: question
 * form, present-tense, no jargon, no prescription.
 */
const PREPARATION_PROMPTS: Record<string, string> = {
  "the-rescuer":
    "What would change in your closest relationship today if you let yourself not be the answer to it?",
  "the-abandonment":
    "Where in your body do you feel the old leaving — and what does it ask you to do before it actually happens?",
  "the-performer":
    "What would be true if you didn't have to perform today — and who would still be there?",
  "the-invisible-child":
    "What do you notice when you let yourself be seen, even briefly, without disappearing?",
  "the-emotional-caretaker":
    "Whose feelings have you started managing before they've even arrived?",
  "the-self-sabotage":
    "What does the part of you that wants to break it actually want — underneath the breaking?",
  "the-chaser":
    "What are you chasing today that you already have, just under a different name?",
  "the-avoider":
    "What would happen if you stayed one minute longer than is comfortable?",
  "the-outsider":
    "Where did you decide you don't belong — and whose voice was it that decided?",
  "the-hyper-independent":
    "What is the cost of handling this alone — and who would you become if you didn't?",
  "the-overthinker":
    "What would you do right now if you didn't need to be certain first?",
};

function preparationPrompt(slug: string): string {
  return (
    PREPARATION_PROMPTS[slug] ??
    "What does this pattern want you to notice today — before you try to do anything about it?"
  );
}
