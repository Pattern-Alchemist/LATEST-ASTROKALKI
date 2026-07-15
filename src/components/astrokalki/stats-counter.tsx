"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-context";

const statKeys = [
  {
    value: 2400, suffix: "+", labelKey: "stats.sessions",
    descriptionKey: "stats.sessionsDesc",
    subtextKey: "Each one a pattern decoded with care",
  },
  {
    value: 97, suffix: "%", labelKey: "stats.returnRate",
    descriptionKey: "stats.returnRateDesc",
    subtextKey: "They return because the work is real",
  },
  {
    value: 12, suffix: "+", labelKey: "stats.years",
    descriptionKey: "stats.yearsDesc",
    subtextKey: "Vedic meets depth psychology",
  },
  {
    value: 38, suffix: "min", labelKey: "stats.breakthrough",
    descriptionKey: "stats.breakthroughDesc",
    subtextKey: "Average time from confusion to clarity",
  },
];

/* ── Animated counter hook ────────────────────────────────────────
 *   Counts from 0 to `target` over `durationMs` when `inView` flips
 *   to true. Uses requestAnimationFrame for smooth 60fps animation. ── */
function useCountUp(target: number, inView: boolean, durationMs = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let startTime: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease-out cubic for a graceful deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, durationMs]);

  return count;
}

/* ── Intersection observer hook ──────────────────────────────────── */
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // fire once
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

export default function StatsCounter() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-6 sm:px-10 lg:px-16"
    >
      {/* Subdued gold accent line above the section */}
      <div className="max-w-6xl mx-auto">
        <div className="w-12 h-px bg-[#c9a96e]/40 mb-10" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16">
          {statKeys.map((stat) => {
            const animatedValue = useCountUp(stat.value, inView);

            return (
              <div key={stat.labelKey}>
                <p className="text-[#c9a96e] text-4xl sm:text-5xl md:text-6xl font-light leading-none tracking-[-0.02em]">
                  {inView ? animatedValue.toLocaleString() : "0"}
                  <span className="text-[#c9a96e]/60 text-2xl sm:text-3xl ml-0.5">
                    {stat.suffix}
                  </span>
                </p>
                <p className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] mt-5 font-light">
                  {t(stat.labelKey)}
                </p>
                <p className="text-[12px] text-[#7a7a7a] mt-2 font-light leading-relaxed">
                  {t(stat.descriptionKey)}
                </p>
                <div className="mt-4 w-6 h-px bg-[#c9a96e]/20" />
                <p className="text-[11px] text-[#5a5a5a] mt-3 font-light italic leading-relaxed">
                  {stat.subtextKey}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quiet trust reassurance line */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] text-center">
          <p className="text-[11px] text-[#5a5a5a] font-light tracking-wide leading-relaxed max-w-xl mx-auto">
            Every session is one-to-one, in confidence, and in plain language.
            No jargon. No spiritual bypass. Just precise observation of what
            your chart shows — and the clarity to exit the loop.
          </p>
        </div>
      </div>
    </section>
  );
}
