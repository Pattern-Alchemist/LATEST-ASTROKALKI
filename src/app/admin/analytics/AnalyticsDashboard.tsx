"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users,
  Activity,
  TrendingUp,
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types (mirror the API response shape) ───────────────────────────

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  conversionRate: number;
  stepRate: number;
  dropoffRate: number;
}

export interface TimeseriesPoint {
  date: string;
  section_view: number;
  booking_complete: number;
  micro_reading: number;
  newsletter_signup: number;
}

export interface TopPage {
  page: string;
  views: number;
  conversions: number;
}

export interface TopEvent {
  event: string;
  count: number;
}

export interface SessionStats {
  total: number;
  unique: number;
  avgEventsPerSession: number;
}

export interface ByHour {
  hour: number;
  count: number;
}

export interface AnalyticsData {
  range: { days: number; from: string; to: string };
  funnel: FunnelStep[];
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topEvents: TopEvent[];
  sessions: SessionStats;
  byHour: ByHour[];
}

// ─── Design tokens (AstroKalki palette — gold only, no blue) ─────────

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

const RANGE_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 7, label: "7 Days" },
  { days: 30, label: "30 Days" },
  { days: 90, label: "90 Days" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function pct(value: number): string {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

// ─── Custom tooltip for recharts (dark themed) ───────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatter?: (value: number, name: string) => string;
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
              {typeof entry.value === "number" && formatter
                ? formatter(entry.value, entry.name || "")
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-6 pb-4 border-b border-white/[0.04]">
      <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] font-light mb-2">
        {eyebrow}
      </p>
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-editorial text-xl sm:text-2xl text-[#f0eee9]">
          {title}
        </h2>
        {hint && (
          <p className="text-body-cinematic text-xs text-[#7a7a7a] max-w-md">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Card shell ──────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────

function StatCard({
  eyebrow,
  value,
  subtitle,
  icon,
  delay = 0,
}: {
  eyebrow: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/[0.015] border border-white/[0.04] hover:border-[#c9a96e]/20 transition-all duration-500 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-body-cinematic text-[10px] uppercase tracking-[0.25em] text-[#7a7a7a]">
          {eyebrow}
        </p>
        <div className="text-[#c9a96e]">{icon}</div>
      </div>
      <p className="text-editorial text-3xl sm:text-4xl text-[#f0eee9] mb-2 font-mono">
        {value}
      </p>
      <p className="text-body-cinematic text-xs text-[#9a9a9a] flex items-center gap-1.5">
        <TrendingUp className="size-3 text-[#c9a96e]/70" />
        {subtitle}
      </p>
    </motion.div>
  );
}

// ─── Funnel row (custom — better visual control than BarChart) ───────

function FunnelRow({
  step,
  index,
  maxCount,
}: {
  step: FunnelStep;
  index: number;
  maxCount: number;
}) {
  const widthPct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
  const isLast = index === 5;
  // Gold intensity gradient through the funnel — deepens as we descend
  const intensities = [
    "rgba(201, 169, 110, 0.95)",
    "rgba(201, 169, 110, 0.85)",
    "rgba(201, 169, 110, 0.7)",
    "rgba(201, 169, 110, 0.55)",
    "rgba(201, 169, 110, 0.4)",
    "rgba(201, 169, 110, 0.28)",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="relative"
    >
      <div className="flex items-center justify-between mb-1.5 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-[#5a5a5a] w-5">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[#f0eee9] text-sm font-light tracking-wide truncate">
            {step.label}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[#c9a96e] text-base">
            {step.count.toLocaleString("en-IN")}
          </span>
          {!isLast && step.dropoffRate > 0 && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-[#c0392b]/70 flex items-center gap-0.5">
              <ArrowDown className="size-2.5" />
              {pct(step.dropoffRate)}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-9 bg-white/[0.02] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.8, delay: index * 0.08 + 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-y-0 left-0 flex items-center px-3"
          style={{
            background: `linear-gradient(90deg, ${intensities[index]}, ${intensities[index].replace(/[\d.]+\)$/, "0.15)")})`,
            borderRight: step.count > 0 ? "1px solid rgba(201, 169, 110, 0.4)" : "none",
          }}
        >
          {widthPct > 18 && (
            <span className="text-[10px] font-mono text-[#050505] font-bold tracking-wider">
              {pct(step.conversionRate)}
            </span>
          )}
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-end px-3">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
            {pct(step.stepRate)} step
          </span>
        </div>
      </div>
      {index < 5 && (
        <div className="flex items-center justify-center py-1.5">
          <ArrowRight className="size-3 text-[#3a3a3a] rotate-90" />
        </div>
      )}
    </motion.div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white/[0.015] border border-white/[0.04] p-6 space-y-3"
          >
            <div className="h-2.5 w-20 bg-white/[0.04] animate-pulse" />
            <div className="h-9 w-24 bg-white/[0.06] animate-pulse" />
            <div className="h-2.5 w-32 bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
      {/* Funnel */}
      <div className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
        <div className="h-3 w-32 bg-white/[0.06] animate-pulse" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-full bg-white/[0.04] animate-pulse" />
            <div
              className="h-9 bg-white/[0.04] animate-pulse"
              style={{ width: `${85 - i * 15}%` }}
            />
          </div>
        ))}
      </div>
      {/* Timeseries */}
      <div className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
        <div className="h-3 w-40 bg-white/[0.06] animate-pulse" />
        <div className="h-64 w-full bg-white/[0.03] animate-pulse" />
      </div>
      {/* Two-up: byHour + topPages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6"
          >
            <div className="h-3 w-28 bg-white/[0.06] animate-pulse" />
            <div className="h-48 w-full bg-white/[0.03] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-px bg-[#c9a96e]/30 mx-auto mb-4" />
      <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
        {message}
      </p>
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────

export default function AnalyticsDashboard({
  initialData,
}: {
  initialData: AnalyticsData | null;
}) {
  const [data, setData] = useState<AnalyticsData | null>(initialData);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<boolean>(!initialData && initialData !== null ? false : !initialData);

  const fetchAnalytics = useCallback(async (rangeDays: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/analytics?days=${rangeDays}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount fetch — refresh whatever the server passed in to ensure
  // we're live (the server-side fetch may have hit the cookie-forwarding
  // edge case and returned null; this guarantees the client recovers).
  // fetchAnalytics is stable (useCallback with empty deps) so it's safe
  // to call once on mount without re-running on every render.
  useEffect(() => {
    fetchAnalytics(days);
  }, []);

  const handleRangeChange = (newDays: number) => {
    if (newDays === days) return;
    setDays(newDays);
    fetchAnalytics(newDays);
  };

  // ─── Derived values for charts ─────────────────────────────────────
  const funnel = data?.funnel ?? [];
  const maxFunnelCount = funnel.length > 0 ? funnel[0].count : 0;
  const timeseries = data?.timeseries ?? [];
  const byHour = data?.byHour ?? [];
  const topPages = data?.topPages ?? [];
  const topEvents = data?.topEvents ?? [];
  const sessions = data?.sessions ?? { total: 0, unique: 0, avgEventsPerSession: 0 };

  const maxHour = byHour.length > 0
    ? Math.max(...byHour.map((h) => h.count))
    : 0;

  const totalEvents = topEvents.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ─── Range selector + refresh ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 border border-white/[0.04] bg-white/[0.015] p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => handleRangeChange(opt.days)}
              disabled={loading && days !== opt.days}
              className={`px-4 py-2 text-[10px] tracking-[0.25em] uppercase font-light transition-all duration-300 disabled:opacity-40 ${
                days === opt.days
                  ? "bg-[#c9a96e]/10 text-[#c9a96e] border border-[#c9a96e]/30"
                  : "text-[#7a7a7a] hover:text-[#f0eee9] border border-transparent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchAnalytics(days)}
          disabled={loading}
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ─── Body ──────────────────────────────────────────────────── */}
      {loading && !data ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card>
          <div className="py-16 text-center">
            <AlertCircle className="size-8 text-[#c0392b] mx-auto mb-3" />
            <p className="text-body-cinematic text-sm mb-4">
              Failed to load analytics data.
            </p>
            <button
              onClick={() => fetchAnalytics(days)}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
            >
              <RefreshCw className="size-3" />
              Retry
            </button>
          </div>
        </Card>
      ) : data ? (
        <>
          {/* ─── Session stat cards ──────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              eyebrow="Total Events"
              value={sessions.total.toLocaleString("en-IN")}
              subtitle={`Across ${data.range.days} day${data.range.days !== 1 ? "s" : ""}`}
              icon={<Activity className="size-5" />}
              delay={0}
            />
            <StatCard
              eyebrow="Unique Sessions"
              value={sessions.unique.toLocaleString("en-IN")}
              subtitle="Distinct visitor sessions"
              icon={<Users className="size-5" />}
              delay={0.08}
            />
            <StatCard
              eyebrow="Avg Events / Session"
              value={sessions.avgEventsPerSession.toFixed(1)}
              subtitle="Engagement depth"
              icon={<TrendingUp className="size-5" />}
              delay={0.16}
            />
          </div>

          {/* ─── Funnel ───────────────────────────────────────────── */}
          <Card>
            <SectionHeader
              eyebrow="Conversion Funnel"
              title="From attention to action"
              hint={`Step-by-step drop-off across the ${data.range.days}-day window. Each row shows the % of users who made it from the previous step to this one.`}
            />
            {maxFunnelCount === 0 ? (
              <EmptyState message="No funnel events recorded in this window. As visitors browse the site, section views, micro-readings and bookings will start flowing in here." />
            ) : (
              <div className="space-y-1">
                {funnel.map((step, i) => (
                  <FunnelRow
                    key={step.step}
                    step={step}
                    index={i}
                    maxCount={maxFunnelCount}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* ─── Timeseries area chart ───────────────────────────── */}
          <Card>
            <SectionHeader
              eyebrow="Activity Over Time"
              title="Daily event volume"
              hint="Four key event types tracked daily. Gold tones distinguish each series — section views dominate, conversions stay precious."
            />
            {timeseries.every(
              (p) =>
                p.section_view === 0 &&
                p.booking_complete === 0 &&
                p.micro_reading === 0 &&
                p.newsletter_signup === 0
            ) ? (
              <EmptyState message="No tracked events in this window yet. The chart will populate as users interact with the site." />
            ) : (
              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timeseries}
                    margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradSectionView" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.gold} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={PALETTE.gold} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradMicro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.goldPale} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={PALETTE.goldPale} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradBooking" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.goldMuted} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={PALETTE.goldMuted} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradNewsletter" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.goldDeep} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={PALETTE.goldDeep} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={PALETTE.grid}
                      strokeDasharray="2 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fill: PALETTE.axis, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                      axisLine={{ stroke: PALETTE.grid }}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fill: PALETTE.axis, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={36}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: PALETTE.gold, strokeWidth: 1, strokeDasharray: "3 3" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="section_view"
                      name="Section View"
                      stroke={PALETTE.gold}
                      strokeWidth={2}
                      fill="url(#gradSectionView)"
                      dot={false}
                      activeDot={{ r: 3, fill: PALETTE.gold, stroke: PALETTE.bg, strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="micro_reading"
                      name="Micro Reading"
                      stroke={PALETTE.goldPale}
                      strokeWidth={1.5}
                      fill="url(#gradMicro)"
                      dot={false}
                      activeDot={{ r: 3, fill: PALETTE.goldPale, stroke: PALETTE.bg, strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="booking_complete"
                      name="Booking Complete"
                      stroke={PALETTE.goldMuted}
                      strokeWidth={1.5}
                      fill="url(#gradBooking)"
                      dot={false}
                      activeDot={{ r: 3, fill: PALETTE.goldMuted, stroke: PALETTE.bg, strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="newsletter_signup"
                      name="Newsletter Signup"
                      stroke={PALETTE.goldDeep}
                      strokeWidth={1.5}
                      fill="url(#gradNewsletter)"
                      dot={false}
                      activeDot={{ r: 3, fill: PALETTE.goldDeep, stroke: PALETTE.bg, strokeWidth: 1 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              {[
                { label: "Section View", color: PALETTE.gold },
                { label: "Micro Reading", color: PALETTE.goldPale },
                { label: "Booking Complete", color: PALETTE.goldMuted },
                { label: "Newsletter Signup", color: PALETTE.goldDeep },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Two-up: by hour + top pages ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Activity by hour */}
            <Card>
              <SectionHeader
                eyebrow="Activity by Hour"
                title="When users are present"
                hint="Events grouped by hour-of-day. Peak hours are highlighted in deeper gold."
              />
              {maxHour === 0 ? (
                <EmptyState message="No hourly data yet." />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={byHour}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke={PALETTE.grid}
                        strokeDasharray="2 4"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={formatHour}
                        tick={{ fill: PALETTE.axis, fontSize: 9, fontFamily: "var(--font-geist-mono)" }}
                        axisLine={{ stroke: PALETTE.grid }}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        tick={{ fill: PALETTE.axis, fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={32}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "rgba(201, 169, 110, 0.06)" }}
                      />
                      <Bar
                        dataKey="count"
                        name="Events"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={18}
                      >
                        {byHour.map((entry) => {
                          const isPeak = entry.count > 0 && entry.count >= maxHour * 0.7;
                          const isStrong = entry.count > 0 && entry.count >= maxHour * 0.4;
                          return (
                            <Cell
                              key={entry.hour}
                              fill={
                                isPeak
                                  ? PALETTE.gold
                                  : isStrong
                                  ? PALETTE.goldMuted
                                  : PALETTE.goldDeep
                              }
                              fillOpacity={entry.count === 0 ? 0.15 : 0.85}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: PALETTE.gold }}
                  />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                    Peak
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: PALETTE.goldMuted }}
                  />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: PALETTE.goldDeep }}
                  />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                    Quiet
                  </span>
                </div>
              </div>
            </Card>

            {/* Top pages */}
            <Card>
              <SectionHeader
                eyebrow="Top Pages"
                title="Where attention lands"
                hint="Top 10 pages by section views, with conversion events (bookings + newsletter signups) on each."
              />
              {topPages.length === 0 ? (
                <EmptyState message="No page-view data yet." />
              ) : (
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.04] hover:bg-transparent">
                        <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light pl-2 sm:pl-0">
                          Page
                        </TableHead>
                        <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-right">
                          Views
                        </TableHead>
                        <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-right">
                          Conv.
                        </TableHead>
                        <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-right pr-2 sm:pr-0">
                          Rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((p) => {
                        const rate = p.views > 0 ? (p.conversions / p.views) * 100 : 0;
                        return (
                          <TableRow
                            key={p.page}
                            className="border-white/[0.02] hover:bg-white/[0.015] transition-colors"
                          >
                            <TableCell className="text-[#f0eee9] text-xs font-light pl-2 sm:pl-0 truncate max-w-[180px]">
                              {p.page}
                            </TableCell>
                            <TableCell className="text-[#cfcabf] text-xs font-mono text-right">
                              {p.views.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-[#c9a96e] text-xs font-mono text-right">
                              {p.conversions.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-[#9a9a9a] text-xs font-mono text-right pr-2 sm:pr-0">
                              {rate.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* ─── Top events list ─────────────────────────────────── */}
          <Card>
            <SectionHeader
              eyebrow="Event Inventory"
              title="All tracked events"
              hint="Every event type recorded by the analytics layer, ranked by total volume."
            />
            {topEvents.length === 0 ? (
              <EmptyState message="No events recorded yet." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topEvents.map((ev, i) => {
                  const share = totalEvents > 0 ? (ev.count / totalEvents) * 100 : 0;
                  return (
                    <motion.div
                      key={ev.event}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="border border-white/[0.04] bg-white/[0.01] p-4 hover:border-[#c9a96e]/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] tracking-[0.15em] uppercase text-[#cfcabf] font-light">
                          {ev.event.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-mono text-[#5a5a5a]">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                      <p className="font-mono text-2xl text-[#c9a96e]">
                        {ev.count.toLocaleString("en-IN")}
                      </p>
                      <div className="mt-3 h-1 bg-white/[0.04] relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={{ duration: 0.6, delay: i * 0.04 + 0.2 }}
                          className="absolute inset-y-0 left-0 bg-[#c9a96e]/50"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ─── Window footer ───────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <Clock className="size-3 text-[#3a3a3a]" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#3a3a3a] font-light">
              Window · {data.range.days} days ·{" "}
              {formatShortDate(data.range.from)} → {formatShortDate(data.range.to)}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
