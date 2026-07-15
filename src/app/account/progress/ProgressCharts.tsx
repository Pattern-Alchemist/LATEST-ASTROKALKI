"use client";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import type {
  MonthlyActivityPoint,
  PatternDistributionPoint,
} from "@/lib/account/progress-types";

/**
 * ProgressCharts — client component bundling the two recharts visualisations
 * for the member progress page:
 *
 *   1. Growth over time — 6-month area chart with three stacked series
 *      (Sessions, Journal entries, Micro-readings).
 *   2. Pattern distribution — donut chart of the user's most-frequent
 *      atlas patterns across micro-readings + chart analyses + journal
 *      patterns + portraits.
 *
 * All in the AstroKalki gold palette on dark theme — no blue/indigo anywhere.
 *
 * Each chart is wrapped in its own motion.div so they reveal in sequence.
 */

interface Props {
  monthlyActivity: MonthlyActivityPoint[];
  patternDistribution: PatternDistributionPoint[];
}

// ─── Palette ─────────────────────────────────────────────────────────

const PALETTE = {
  gold: "#c9a96e",
  goldMuted: "#8a7350",
  goldDeep: "#5a4a2e",
  goldPale: "#e2c98f",
  grid: "#2a2a2a",
  axis: "#7a7a7a",
  textPrimary: "#f0eee9",
  textMuted: "#9a9a9a",
  textDim: "#5a5a5a",
  bg: "#050505",
} as const;

// Donut slice palette — gold-anchored rotation, no blue/indigo.
const DONUT_PALETTE = [
  "#c9a96e", // gold
  "#e2c98f", // pale gold
  "#8a7350", // muted gold
  "#5a4a2e", // deep gold
  "#a58a54", // amber
  "#d4b896", // sand
  "#7a6648", // bronze
  "#3a3024", // shadow
];

// ─── Custom dark tooltip ─────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-[#0a0a0a]/95 backdrop-blur border border-[#c9a96e]/20 px-3 py-2 shadow-2xl">
      <p className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] mb-1.5 font-light">
        {label}
      </p>
      <div className="space-y-1">
        {payload
          .filter((e) => typeof e.value === "number" && e.value > 0)
          .map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: entry.color || PALETTE.gold }}
              />
              <span className="text-[#9a9a9a]">
                {typeof entry.name === "string"
                  ? entry.name
                  : entry.name}
              </span>
              <span className="ml-auto font-mono text-[#f0eee9]">
                {entry.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: PatternDistributionPoint;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-[#0a0a0a]/95 backdrop-blur border border-[#c9a96e]/20 px-3 py-2 shadow-2xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#c9a96e] mb-1 font-light">
        {prettyPattern(item.payload?.pattern || item.name || "")}
      </p>
      <p className="font-mono text-sm text-[#f0eee9]">
        {item.value} {item.value === 1 ? "occurrence" : "occurrences"}
      </p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export default function ProgressCharts({
  monthlyActivity,
  patternDistribution,
}: Props) {
  const hasGrowthData = monthlyActivity.some(
    (p) => p.sessions > 0 || p.journals > 0 || p.readings > 0
  );
  const hasPatternData = patternDistribution.some((p) => p.count > 0);
  const totalPatterns = patternDistribution.reduce(
    (sum, p) => sum + p.count,
    0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ─── Growth over time ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
        className="lg:col-span-3 bg-white/[0.015] border border-white/[0.04] p-6 flex flex-col"
      >
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] font-light mb-2">
          Your growth over time
        </p>
        <h3 className="text-lg font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-1">
          Monthly activity
        </h3>
        <p className="text-xs text-[#7a7a7a] font-light leading-relaxed mb-5 max-w-md">
          Sessions completed, journal entries, and micro-readings per month —
          the rhythm of your attention to the work.
        </p>

        {hasGrowthData ? (
          <div className="h-64 sm:h-72 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyActivity}
                margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.gold} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradJournals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.goldPale} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE.goldPale} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradReadings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.goldMuted} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE.goldMuted} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={PALETTE.grid}
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fill: PALETTE.axis,
                    fontSize: 10,
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  axisLine={{ stroke: PALETTE.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: PALETTE.axis,
                    fontSize: 10,
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={36}
                />
                <Tooltip
                  content={<GrowthTooltip />}
                  cursor={{
                    stroke: PALETTE.gold,
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={PALETTE.gold}
                  strokeWidth={2}
                  fill="url(#gradSessions)"
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: PALETTE.gold,
                    stroke: PALETTE.bg,
                    strokeWidth: 1,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="journals"
                  name="Journal entries"
                  stroke={PALETTE.goldPale}
                  strokeWidth={1.5}
                  fill="url(#gradJournals)"
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: PALETTE.goldPale,
                    stroke: PALETTE.bg,
                    strokeWidth: 1,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="readings"
                  name="Micro-readings"
                  stroke={PALETTE.goldMuted}
                  strokeWidth={1.5}
                  fill="url(#gradReadings)"
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: PALETTE.goldMuted,
                    stroke: PALETTE.bg,
                    strokeWidth: 1,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 sm:h-72 flex items-center justify-center text-center">
            <p className="text-sm text-[#5a5a5a] font-light leading-relaxed max-w-xs">
              Your monthly activity will appear here as you complete sessions,
              write journal entries, and capture micro-readings.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
          {[
            { label: "Sessions", color: PALETTE.gold },
            { label: "Journal entries", color: PALETTE.goldPale },
            { label: "Micro-readings", color: PALETTE.goldMuted },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Pattern distribution donut ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
        className="lg:col-span-2 bg-white/[0.015] border border-white/[0.04] p-6 flex flex-col"
      >
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] font-light mb-2">
          Pattern distribution
        </p>
        <h3 className="text-lg font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-1">
          What you return to
        </h3>
        <p className="text-xs text-[#7a7a7a] font-light leading-relaxed mb-5 max-w-md">
          The patterns that show up most often across your micro-readings,
          charts, journal tags, and portraits.
        </p>

        {hasPatternData ? (
          <>
            <div className="h-56 sm:h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patternDistribution}
                    dataKey="count"
                    nameKey="pattern"
                    innerRadius="58%"
                    outerRadius="92%"
                    paddingAngle={1.5}
                    stroke="none"
                    isAnimationActive
                    animationDuration={900}
                  >
                    {patternDistribution.map((entry, idx) => (
                      <Cell
                        key={entry.pattern}
                        fill={DONUT_PALETTE[idx % DONUT_PALETTE.length]}
                        fillOpacity={0.92}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="font-serif text-3xl text-[#f0eee9] font-light leading-none">
                  {totalPatterns}
                </p>
                <p className="mt-1 text-[9px] tracking-[0.25em] uppercase text-[#7a7a7a] font-light">
                  {totalPatterns === 1 ? "Pattern" : "Patterns"}
                </p>
              </div>
            </div>

            {/* Pattern legend / list */}
            <ul className="mt-5 pt-4 border-t border-white/[0.04] space-y-2 max-h-40 overflow-y-auto pr-2">
              {patternDistribution.map((p, idx) => (
                <li
                  key={p.pattern}
                  className="flex items-center gap-3 text-xs"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        DONUT_PALETTE[idx % DONUT_PALETTE.length],
                    }}
                  />
                  <span className="text-[#cfcabf] font-light truncate flex-1">
                    {prettyPattern(p.pattern)}
                  </span>
                  <span className="font-mono text-[#9a9a9a]">
                    {p.count}
                  </span>
                  <span className="font-mono text-[#5a5a5a] w-10 text-right">
                    {totalPatterns > 0
                      ? Math.round((p.count / totalPatterns) * 100)
                      : 0}
                    %
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="h-56 sm:h-64 flex items-center justify-center text-center">
            <p className="text-sm text-[#5a5a5a] font-light leading-relaxed max-w-xs">
              As you identify patterns through micro-readings, charts, journal
              tags, or portraits, the most-recurring ones will appear here.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Turn a normalized pattern slug (e.g. "the-rescuer" or "abandonment") into
 * a human-readable label. Looks up the Atlas by slug first; falls back to a
 * title-case version of the slug.
 */
function prettyPattern(slug: string): string {
  const match = ATLAS_PATTERNS.find((p) => p.slug === slug);
  if (match) return match.name;
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
