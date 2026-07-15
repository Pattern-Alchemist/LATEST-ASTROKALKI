"use client";

import { motion } from "framer-motion";
import { Lock, Check, Award } from "lucide-react";
import type { MilestoneOutput } from "@/lib/account/progress-types";

/**
 * MilestoneGrid — the gold/muted badge grid for the member progress page.
 *
 * Each milestone renders as a 64x64 circular badge:
 *   - Earned: gold border + faint gold fill + check icon
 *   - Unearned: muted border + faint fill + lock icon
 *
 * Below each badge is the title (Cinzel small caps) and a tooltip-style
 * description on hover/focus. The grid wraps to a single column on mobile,
 * 2 columns at sm, and up to 5 at lg so the 10 milestones lay out as 2x5
 * on desktop.
 *
 * The header strip shows earned/total (e.g. "3 / 10") with a gold progress
 * bar — the visual anchor of the section.
 */

interface Props {
  milestones: MilestoneOutput[];
}

const STAGGER = 0.05;

export default function MilestoneGrid({ milestones }: Props) {
  const earnedCount = milestones.filter((m) => m.earned).length;
  const total = milestones.length;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div>
      {/* Header strip: earned count + progress bar */}
      <div className="mb-8 pb-6 border-b border-white/[0.04]">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] font-light">
            Earned
          </p>
          <p className="font-serif text-[#f0eee9] text-lg font-light">
            <span className="text-[#c9a96e]">{earnedCount}</span>
            <span className="text-[#5a5a5a] mx-2">/</span>
            <span className="text-[#9a9a9a]">{total}</span>
          </p>
        </div>
        <div className="h-px bg-white/[0.04] relative overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#5a4a2e] via-[#c9a96e] to-[#e2c98f]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          />
        </div>
      </div>

      {/* Grid of badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {milestones.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              ease: [0.4, 0, 0.2, 1],
              delay: 0.05 + i * STAGGER,
            }}
            className="group flex flex-col items-center text-center"
          >
            <div className="relative">
              {/* Halo for earned milestones */}
              {m.earned && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[#c9a96e]/[0.06] blur-md group-hover:bg-[#c9a96e]/[0.1] transition-colors"
                />
              )}
              <div
                role="img"
                aria-label={`${m.title} — ${m.earned ? "earned" : "not yet earned"}`}
                className={`relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  m.earned
                    ? "border-[#c9a96e] bg-[#c9a96e]/10 group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(201,169,110,0.18)]"
                    : "border-white/[0.06] bg-white/[0.02] group-hover:border-white/[0.12]"
                }`}
              >
                {m.earned ? (
                  <Check
                    className="size-5 text-[#c9a96e]"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : (
                  <Lock
                    className="size-4 text-[#5a5a5a]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
              </div>
              {/* Small star/sun icon for the most-recently-earned (first in list) */}
              {m.earned && i === 0 && earnedCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#c9a96e] flex items-center justify-center"
                >
                  <Award className="size-3 text-[#050505]" strokeWidth={2.5} />
                </span>
              )}
            </div>

            {/* Title — Cinzel small caps */}
            <p
              className={`mt-3 text-[9px] tracking-[0.2em] uppercase font-medium leading-[1.5] max-w-[120px] transition-colors ${
                m.earned
                  ? "text-[#cfcabf]"
                  : "text-[#5a5a5a] group-hover:text-[#7a7a7a]"
              }`}
              style={{ fontFamily: "var(--font-cinzel)" }}
            >
              {m.title}
            </p>

            {/* Description — hidden by default, shown on hover/focus */}
            <p className="mt-2 text-[11px] text-[#7a7a7a] font-light leading-[1.6] max-w-[160px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 hidden sm:block">
              {m.description}
            </p>

            {/* Earned date (small, mono) */}
            {m.earned && m.earnedAt && (
              <p className="mt-1.5 text-[9px] tracking-[0.15em] uppercase text-[#c9a96e]/60 font-mono">
                {formatEarnedDate(m.earnedAt)}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function formatEarnedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
