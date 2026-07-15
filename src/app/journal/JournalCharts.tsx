"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  MOOD_SCORE,
  type JournalEntryDTO,
  type Mood,
  formatShortDate,
} from "./types";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";

/**
 * JournalCharts — three recharts visualisations of the last 30 days.
 *
 *   1. Mood over time — line chart, mood mapped to 1-6 scale.
 *   2. Energy over time — line chart, 1-5 scale.
 *   3. Pattern frequency — bar chart, count of each Atlas pattern.
 *
 * Palette: gold only, dark grid (#2a2a2a), muted axis (#7a7a7a).
 * The chart container has a fixed height so recharts can compute layout
 * without jittering on data refresh.
 */

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
  bgCard: "#0a0a0a",
  border: "rgba(255,255,255,0.04)",
} as const;

interface JournalChartsProps {
  entries: JournalEntryDTO[];
}

// ─── Custom tooltip ──────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: { date: string; label?: string };
}

function ChartTooltip({
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
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: entry.color || PALETTE.gold }}
            />
            <span className="text-[#9a9a9a] capitalize">
              {typeof entry.name === "string"
                ? entry.name.replace(/_/g, " ")
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

// ─── Main component ──────────────────────────────────────────────────────

export default function JournalCharts({ entries }: JournalChartsProps) {
  // Build the 30-day timeseries — fill missing days with null so the line
  // has visible gaps where no entry exists.
  const { moodSeries, energySeries, patternData, hasData } = useMemo(() => {
    const now = new Date();
    const days: Date[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      d.setUTCHours(0, 0, 0, 0);
      days.push(d);
    }

    // Index entries by YYYY-MM-DD for O(1) lookup.
    const byDay = new Map<string, JournalEntryDTO>();
    for (const e of entries) {
      const d = new Date(e.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      byDay.set(key, e);
    }

    const moodSeries = days.map((d) => {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const e = byDay.get(key);
      return {
        date: formatShortDate(d),
        mood: e ? MOOD_SCORE[e.mood as Mood] : null,
        moodLabel: e ? e.mood : null,
      };
    });

    const energySeries = days.map((d) => {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const e = byDay.get(key);
      return {
        date: formatShortDate(d),
        energy: e ? e.energy : null,
      };
    });

    // Pattern frequency — count across the same 30-day window.
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (!e.pattern) continue;
      const ed = new Date(e.date);
      const edKey = `${ed.getUTCFullYear()}-${String(ed.getUTCMonth() + 1).padStart(2, "0")}-${String(ed.getUTCDate()).padStart(2, "0")}`;
      // Only count if the entry falls inside the 30-day window.
      const inWindow = days.some((d) => {
        const dKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        return dKey === edKey;
      });
      if (!inWindow) continue;
      counts.set(e.pattern, (counts.get(e.pattern) || 0) + 1);
    }

    const patternData = [...counts.entries()]
      .map(([slug, count]) => {
        const atlas = ATLAS_PATTERNS.find((p) => p.slug === slug);
        return {
          pattern: atlas ? atlas.name.replace(/^The\s+/, "") : slug,
          slug,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const hasData = entries.length > 0;

    return { moodSeries, energySeries, patternData, hasData };
  }, [entries]);

  if (!hasData) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-base text-[#7a7a7a] font-light leading-[1.8] max-w-md mx-auto">
          Once you log a few days, your mood and energy lines will appear here —
          along with the patterns you&apos;ve been noticing most.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-10"
    >
      {/* ─── Mood over time ──────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 pb-3 border-b border-white/[0.04]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-2 font-light">
            Mood over time
          </p>
          <p className="text-sm text-[#7a7a7a] font-light">
            30 days · heavy → clear, 1–6
          </p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={moodSeries}
              margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke={PALETTE.grid}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fill: PALETTE.axis,
                  fontSize: 9,
                  fontFamily: "var(--font-geist-mono)",
                }}
                axisLine={{ stroke: PALETTE.grid }}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                domain={[1, 6]}
                ticks={[1, 2, 3, 4, 5, 6]}
                tickFormatter={(v) => {
                  const labels: Record<number, string> = {
                    1: "heavy",
                    2: "numb",
                    3: "angry",
                    4: "anxious",
                    5: "tender",
                    6: "clear",
                  };
                  return labels[v] || "";
                }}
                tick={{
                  fill: PALETTE.axis,
                  fontSize: 9,
                  fontFamily: "var(--font-geist-mono)",
                }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                content={
                  <ChartTooltipWithMood />
                }
                cursor={{
                  stroke: PALETTE.gold,
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              <Line
                type="monotone"
                dataKey="mood"
                name="Mood"
                stroke={PALETTE.gold}
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: PALETTE.gold, stroke: PALETTE.bg, strokeWidth: 1 }}
                activeDot={{
                  r: 4,
                  fill: PALETTE.goldPale,
                  stroke: PALETTE.bg,
                  strokeWidth: 1,
                }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Energy over time ────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 pb-3 border-b border-white/[0.04]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-2 font-light">
            Energy over time
          </p>
          <p className="text-sm text-[#7a7a7a] font-light">
            30 days · 1 (drained) → 5 (charged)
          </p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={energySeries}
              margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke={PALETTE.grid}
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fill: PALETTE.axis,
                  fontSize: 9,
                  fontFamily: "var(--font-geist-mono)",
                }}
                axisLine={{ stroke: PALETTE.grid }}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{
                  fill: PALETTE.axis,
                  fontSize: 10,
                  fontFamily: "var(--font-geist-mono)",
                }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: PALETTE.goldMuted,
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke={PALETTE.goldMuted}
                strokeWidth={1.5}
                dot={{
                  r: 2.5,
                  fill: PALETTE.goldMuted,
                  stroke: PALETTE.bg,
                  strokeWidth: 1,
                }}
                activeDot={{
                  r: 4,
                  fill: PALETTE.gold,
                  stroke: PALETTE.bg,
                  strokeWidth: 1,
                }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Pattern frequency ───────────────────────────────────────────── */}
      <div>
        <div className="mb-4 pb-3 border-b border-white/[0.04]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-2 font-light">
            Pattern frequency
          </p>
          <p className="text-sm text-[#7a7a7a] font-light">
            30 days · which patterns you noticed most
          </p>
        </div>
        {patternData.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[#5a5a5a] font-light leading-relaxed max-w-sm mx-auto">
              No patterns tagged in the last 30 days. As you start tagging
              entries, the recurring ones will surface here.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={patternData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  stroke={PALETTE.grid}
                  strokeDasharray="2 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{
                    fill: PALETTE.axis,
                    fontSize: 10,
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  axisLine={{ stroke: PALETTE.grid }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="pattern"
                  tick={{
                    fill: PALETTE.textMuted,
                    fontSize: 10,
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(201, 169, 110, 0.06)" }}
                />
                <Bar
                  dataKey="count"
                  name="Times tagged"
                  fill={PALETTE.gold}
                  radius={[0, 2, 2, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Mood-aware tooltip (shows mood label, not just numeric score) ──────

function ChartTooltipWithMood({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: { date: string; moodLabel?: string | null; mood?: number | null };
  }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-[#0a0a0a]/95 backdrop-blur border border-[#c9a96e]/20 px-3 py-2 shadow-2xl">
      <p className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] mb-1.5 font-light">
        {label}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: PALETTE.gold }}
        />
        <span className="text-[#9a9a9a]">Mood</span>
        <span className="ml-auto font-mono text-[#f0eee9]">
          {data?.moodLabel
            ? data.moodLabel
            : data?.mood != null
              ? data.mood
              : "—"}
        </span>
      </div>
    </div>
  );
}
