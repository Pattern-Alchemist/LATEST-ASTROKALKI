"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */

export interface AdminStatCardProps {
  /** Display label above the number */
  title: string;
  /** Numeric target — the counter will animate from 0 to this value.
   *  Pass a string (e.g. "₹12,345") to skip counting animation. */
  value: number | string;
  /** Smaller text below the value */
  subtitle?: string;
  /** Lucide icon node rendered in the accent badge */
  icon: React.ReactNode;
  /** Tailwind bg‑colour class for the icon badge — e.g. "bg-[#c9a96e]/10" */
  accent: string;
  /** Stagger delay (seconds) for the entry animation */
  delay?: number;
  /** Optional trend indicator */
  trend?: {
    value: number; // percentage, e.g. +12.5 or -3.2
    label?: string;
  };
  /** Show skeleton placeholder instead of real content */
  loading?: boolean;
}

/* ─── Animated Counter Hook ────────────────────────────────────── */

function useAnimatedCounter(
  target: number,
  duration = 1200,
  startOnView = true
) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (startOnView && !inView) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startTime = performance.now();
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, inView, startOnView]);

  return { display, ref };
}

/* ─── Skeleton ─────────────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-xl bg-[#0a0a0a] border border-white/[0.04] p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 w-24 rounded bg-[#141414] animate-pulse" />
            <div className="h-8 w-28 rounded bg-[#141414] animate-pulse" />
            <div className="h-3 w-32 rounded bg-[#141414] animate-pulse" />
          </div>
          <div className="size-12 rounded-lg bg-[#141414] animate-pulse shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Trend Badge ──────────────────────────────────────────────── */

function TrendIndicator({ value, label }: { value: number; label?: string }) {
  const isUp = value > 0;
  const isFlat = value === 0;
  const colour = isFlat
    ? "text-[#9a9a9a]"
    : isUp
    ? "text-emerald-400"
    : "text-[#c0392b]";

  return (
    <span className={`text-body-cinematic text-xs flex items-center gap-1 ${colour}`}>
      {isFlat ? (
        <Minus className="size-3" />
      ) : isUp ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isFlat ? "No change" : `${isUp ? "+" : ""}${value}%`}
      {label && <span className="text-[#7a7a7a] ml-0.5">{label}</span>}
    </span>
  );
}

/* ─── AdminStatCard ────────────────────────────────────────────── */

export default function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  delay = 0,
  trend,
  loading = false,
}: AdminStatCardProps) {
  const isNumeric = typeof value === "number";
  const { display, ref: counterRef } = useAnimatedCounter(
    isNumeric ? value : 0,
    1200
  );

  if (loading) return <StatCardSkeleton />;

  /* Format numeric value with Indian locale commas */
  const formattedNumber = isNumeric
    ? display.toLocaleString("en-IN")
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <div className="relative rounded-xl bg-[#0a0a0a] border border-white/[0.04] p-6 transition-all duration-500 hover:border-white/[0.08] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Subtle gradient glow on hover */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <div className="space-y-2 min-w-0">
            <p className="text-body-cinematic text-[11px] uppercase tracking-[0.2em] text-[#9a9a9a]">
              {title}
            </p>

            {/* Counter or static string */}
            {isNumeric ? (
              <p
                ref={counterRef}
                className="text-editorial text-2xl sm:text-3xl text-[#f0eee9] tabular-nums"
              >
                {formattedNumber}
              </p>
            ) : (
              <p className="text-editorial text-2xl sm:text-3xl text-[#f0eee9]">
                {value}
              </p>
            )}

            {/* Trend or subtitle */}
            {trend ? (
              <TrendIndicator value={trend.value} label={trend.label} />
            ) : subtitle ? (
              <p className="text-body-cinematic text-xs flex items-center gap-1 text-[#7a7a7a]">
                <TrendingUp className="size-3 text-emerald-400" />
                {subtitle}
              </p>
            ) : null}
          </div>

          <div
            className={`shrink-0 rounded-lg p-3 transition-transform duration-300 group-hover:scale-110 ${accent}`}
          >
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Compact Mini Stat (for the secondary stats row) ─────────── */

export interface MiniStatProps {
  value: number;
  label: string;
  color?: string;
  delay?: number;
  loading?: boolean;
}

export function MiniStat({
  value,
  label,
  color = "text-[#f0eee9]",
  delay = 0,
  loading = false,
}: MiniStatProps) {
  const { display, ref } = useAnimatedCounter(value, 900);

  if (loading) {
    return (
      <div className="rounded-xl bg-[#0a0a0a] border border-white/[0.04] p-4 text-center">
        <div className="h-6 w-12 mx-auto rounded bg-[#141414] animate-pulse mb-2" />
        <div className="h-3 w-16 mx-auto rounded bg-[#141414] animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-4 text-center hover:border-white/[0.06] transition-colors"
    >
      <p ref={ref} className={`${color} text-lg sm:text-xl font-bold tabular-nums`}>
        {display.toLocaleString("en-IN")}
      </p>
      <p className="text-body-cinematic text-[10px] sm:text-xs mt-1 text-[#9a9a9a]">
        {label}
      </p>
    </motion.div>
  );
}