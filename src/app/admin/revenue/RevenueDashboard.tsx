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
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Clock,
  IndianRupee,
  Users,
  Activity,
  Gauge,
  ArrowUpRight,
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

export interface RevenueByMonth {
  month: string;
  revenue: number;
  bookings: number;
  memberships: number;
}

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  conversionRate: number;
  stepRate: number;
  dropoffRate: number;
}

export interface ConversionFunnel {
  visitors: number;
  microReadings: number;
  bookings: number;
  completedSessions: number;
  memberships: number;
  steps: FunnelStep[];
}

export interface Cohort {
  cohortMonth: string;
  size: number;
  retention30d: number | null;
  retention60d: number | null;
  retention90d: number | null;
}

export interface MembershipGrowth {
  month: string;
  newMembers: number;
  cancelledMembers: number;
  netGrowth: number;
}

export interface RevenueData {
  range: { days: number; from: string; to: string };
  mrr: number;
  arr: number;
  revenue30d: number;
  ltv: number;
  churnRate: number;
  revenueByMonth: RevenueByMonth[];
  conversionFunnel: ConversionFunnel;
  cohorts: Cohort[];
  membershipGrowth: MembershipGrowth[];
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
  crimson: "#c0392b",
} as const;

const RANGE_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 30, label: "30 Days" },
  { days: 90, label: "90 Days" },
  { days: 365, label: "365 Days" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function formatINR(value: number, compact = false): string {
  if (!Number.isFinite(value)) return "₹0";
  if (compact && value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  }
  if (compact && value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  if (compact && value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
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

// ─── Revenue stat card (Playfair number, Cinzel label) ───────────────

function RevenueStatCard({
  eyebrow,
  value,
  subtitle,
  icon,
  delay = 0,
  trend,
}: {
  eyebrow: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  delay?: number;
  trend?: "up" | "down" | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/[0.015] border border-white/[0.04] hover:border-[#c9a96e]/20 transition-all duration-500 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] font-light">
          {eyebrow}
        </p>
        <div className="text-[#c9a96e]">{icon}</div>
      </div>
      <p
        className="text-3xl sm:text-4xl text-[#f0eee9] mb-2 font-mono"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        {value}
      </p>
      <p className="text-body-cinematic text-xs text-[#9a9a9a] flex items-center gap-1.5">
        {trend === "up" && <TrendingUp className="size-3 text-[#c9a96e]/80" />}
        {trend === "down" && (
          <TrendingDown className="size-3 text-[#c0392b]/70" />
        )}
        {(!trend || trend === null) && (
          <TrendingUp className="size-3 text-[#c9a96e]/40" />
        )}
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
  const isLast = index === 4;
  // Gold intensity gradient through the funnel — deepens as we descend
  const intensities = [
    "rgba(201, 169, 110, 0.95)",
    "rgba(201, 169, 110, 0.78)",
    "rgba(201, 169, 110, 0.6)",
    "rgba(201, 169, 110, 0.45)",
    "rgba(201, 169, 110, 0.3)",
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
          transition={{
            duration: 0.8,
            delay: index * 0.08 + 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="absolute inset-y-0 left-0 flex items-center px-3"
          style={{
            background: `linear-gradient(90deg, ${intensities[index]}, ${intensities[index].replace(
              /[\d.]+\)$/,
              "0.12)"
            )})`,
            borderRight:
              step.count > 0
                ? "1px solid rgba(201, 169, 110, 0.4)"
                : "none",
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
      {index < 4 && (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/[0.015] border border-white/[0.04] p-6 space-y-3"
          >
            <div className="h-2.5 w-20 bg-white/[0.04] animate-pulse" />
            <div className="h-9 w-28 bg-white/[0.06] animate-pulse" />
            <div className="h-2.5 w-32 bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
      {/* Revenue area */}
      <div className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
        <div className="h-3 w-40 bg-white/[0.06] animate-pulse" />
        <div className="h-64 w-full bg-white/[0.03] animate-pulse" />
      </div>
      {/* Membership growth */}
      <div className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
        <div className="h-3 w-44 bg-white/[0.06] animate-pulse" />
        <div className="h-64 w-full bg-white/[0.03] animate-pulse" />
      </div>
      {/* Funnel + Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
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
        <div className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
          <div className="h-3 w-24 bg-white/[0.06] animate-pulse" />
          <div className="h-32 w-full bg-white/[0.03] animate-pulse" />
        </div>
      </div>
      {/* Cohort table */}
      <div className="bg-white/[0.015] border border-white/[0.04] p-8 space-y-6">
        <div className="h-3 w-36 bg-white/[0.06] animate-pulse" />
        <div className="h-72 w-full bg-white/[0.03] animate-pulse" />
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

// ─── Churn trend indicator ──────────────────────────────────────────

function ChurnTrendBadge({ rate }: { rate: number }) {
  // Heuristic only — no historical churn series on hand, so we shade
  // by band: <2% healthy, 2-5% watch, >5% concern.
  const band =
    rate < 2
      ? { label: "Healthy", color: PALETTE.gold, icon: <TrendingUp className="size-3" /> }
      : rate < 5
      ? { label: "Watch", color: PALETTE.goldPale, icon: <Activity className="size-3" /> }
      : { label: "Concern", color: PALETTE.crimson, icon: <TrendingDown className="size-3" /> };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 border text-[10px] tracking-[0.25em] uppercase font-light"
      style={{
        color: band.color,
        borderColor: `${band.color}40`,
        background: `${band.color}10`,
      }}
    >
      {band.icon}
      {band.label}
    </span>
  );
}

// ─── Cohort retention heatmap cell ──────────────────────────────────

function RetentionCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div className="h-10 flex items-center justify-center bg-white/[0.01] border border-white/[0.02]">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#3a3a3a]">
          n/a
        </span>
      </div>
    );
  }
  // Heatmap: 100% = full gold, 0% = deep, gradient via opacity
  const intensity = Math.max(0, Math.min(100, value)) / 100;
  const fill =
    intensity > 0.75
      ? PALETTE.gold
      : intensity > 0.5
      ? PALETTE.goldPale
      : intensity > 0.25
      ? PALETTE.goldMuted
      : PALETTE.goldDeep;
  return (
    <div
      className="h-10 flex items-center justify-center border border-white/[0.04] transition-colors hover:border-[#c9a96e]/40"
      style={{
        background: `linear-gradient(180deg, ${fill}${Math.round(
          intensity * 200
        )
          .toString(16)
          .padStart(2, "0")} 0%, ${fill}10 100%)`,
      }}
      title={`${value.toFixed(1)}% retained`}
    >
      <span
        className="font-mono text-xs"
        style={{ color: intensity > 0.5 ? "#050505" : "#f0eee9" }}
      >
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────

export default function RevenueDashboard({
  initialData,
}: {
  initialData: RevenueData | null;
}) {
  const [data, setData] = useState<RevenueData | null>(initialData);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<boolean>(!initialData);

  const fetchRevenue = useCallback(async (rangeDays: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/revenue?days=${rangeDays}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RevenueData;
      setData(json);
    } catch (err) {
      console.error("Failed to fetch revenue analytics:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount fetch — refresh whatever the server passed in to ensure
  // we're live (the server-side fetch may have hit the cookie-forwarding
  // edge case and returned null; this guarantees the client recovers).
  useEffect(() => {
    fetchRevenue(days);
  }, []);

  const handleRangeChange = (newDays: number) => {
    if (newDays === days) return;
    setDays(newDays);
    fetchRevenue(newDays);
  };

  // ─── Derived values for charts ─────────────────────────────────────
  const revenueByMonth = data?.revenueByMonth ?? [];
  const membershipGrowth = data?.membershipGrowth ?? [];
  const funnel = data?.conversionFunnel?.steps ?? [];
  const maxFunnelCount = funnel.length > 0 ? funnel[0].count : 0;
  const cohorts = data?.cohorts ?? [];

  const hasMonthlyRevenue = revenueByMonth.some((m) => m.revenue > 0);
  const hasGrowthData = membershipGrowth.some(
    (m) => m.newMembers > 0 || m.cancelledMembers > 0
  );

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
          onClick={() => fetchRevenue(days)}
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
              Failed to load revenue analytics.
            </p>
            <button
              onClick={() => fetchRevenue(days)}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/30 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
            >
              <RefreshCw className="size-3" />
              Retry
            </button>
          </div>
        </Card>
      ) : data ? (
        <>
          {/* ─── Revenue stat cards (4) ──────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <RevenueStatCard
              eyebrow="MRR"
              value={formatINR(data.mrr, true)}
              subtitle="Monthly recurring revenue"
              icon={<IndianRupee className="size-5" />}
              delay={0}
              trend="up"
            />
            <RevenueStatCard
              eyebrow="ARR"
              value={formatINR(data.arr, true)}
              subtitle="Annualised run-rate"
              icon={<TrendingUp className="size-5" />}
              delay={0.08}
              trend="up"
            />
            <RevenueStatCard
              eyebrow="30-Day Revenue"
              value={formatINR(data.revenue30d, true)}
              subtitle={`Booking revenue · last ${data.range.days}d`}
              icon={<Activity className="size-5" />}
              delay={0.16}
              trend={data.revenue30d > 0 ? "up" : null}
            />
            <RevenueStatCard
              eyebrow="LTV"
              value={formatINR(data.ltv, true)}
              subtitle="Lifetime value / member"
              icon={<Users className="size-5" />}
              delay={0.24}
              trend="up"
            />
          </div>

          {/* ─── Revenue over time (area) ───────────────────────── */}
          <Card>
            <SectionHeader
              eyebrow="Revenue Over Time"
              title="Monthly booking revenue"
              hint="Sum of booking prices per calendar month, last 12 months. Gold area shows total INR collected through the booking flow."
            />
            {!hasMonthlyRevenue ? (
              <EmptyState message="No booking revenue recorded in the last 12 months. As bookings come through, monthly totals will populate this chart." />
            ) : (
              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueByMonth}
                    margin={{ top: 10, right: 8, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="gradRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={PALETTE.gold}
                          stopOpacity={0.55}
                        />
                        <stop
                          offset="100%"
                          stopColor={PALETTE.gold}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={PALETTE.grid}
                      strokeDasharray="2 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fill: PALETTE.axis,
                        fontSize: 10,
                        fontFamily: "var(--font-geist-mono)",
                      }}
                      axisLine={{ stroke: PALETTE.grid }}
                      tickLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{
                        fill: PALETTE.axis,
                        fontSize: 10,
                        fontFamily: "var(--font-geist-mono)",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v: number) => formatINR(v, true)}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v: number) => formatINR(v)}
                        />
                      }
                      cursor={{
                        stroke: PALETTE.gold,
                        strokeWidth: 1,
                        strokeDasharray: "3 3",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke={PALETTE.gold}
                      strokeWidth={2}
                      fill="url(#gradRevenue)"
                      dot={false}
                      activeDot={{
                        r: 3,
                        fill: PALETTE.gold,
                        stroke: PALETTE.bg,
                        strokeWidth: 1,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legend / context row */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: PALETTE.gold }}
                />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                  Booking revenue
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                  12-month window
                </span>
              </div>
            </div>
          </Card>

          {/* ─── Membership growth (bars) ───────────────────────── */}
          <Card>
            <SectionHeader
              eyebrow="Membership Growth"
              title="New vs cancelled members"
              hint="Net membership growth per calendar month. Gold bars = new sign-ups; dark bars = cancellations/expirations. Use this to spot acquisition trends vs churn pressure."
            />
            {!hasGrowthData ? (
              <EmptyState message="No membership activity in the last 12 months. New subscriptions and cancellations will appear here as the membership programme grows." />
            ) : (
              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={membershipGrowth}
                    margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={PALETTE.grid}
                      strokeDasharray="2 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fill: PALETTE.axis,
                        fontSize: 10,
                        fontFamily: "var(--font-geist-mono)",
                      }}
                      axisLine={{ stroke: PALETTE.grid }}
                      tickLine={false}
                      minTickGap={20}
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
                      width={32}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "rgba(201, 169, 110, 0.06)" }}
                    />
                    <Bar
                      dataKey="newMembers"
                      name="New Members"
                      fill={PALETTE.gold}
                      fillOpacity={0.85}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="cancelledMembers"
                      name="Cancelled"
                      fill={PALETTE.goldDeep}
                      fillOpacity={0.9}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legend + net growth summary */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: PALETTE.gold }}
                />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                  New members
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: PALETTE.goldDeep }}
                />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                  Cancelled
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                  Net growth (12mo)
                </span>
                <span className="font-mono text-xs text-[#c9a96e]">
                  +{membershipGrowth.reduce((s, m) => s + m.netGrowth, 0)}
                </span>
              </div>
            </div>
          </Card>

          {/* ─── Two-up: Funnel + Churn ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Conversion funnel */}
            <Card className="lg:col-span-2">
              <SectionHeader
                eyebrow="Conversion Funnel"
                title="From visitor to member"
                hint={`Step-by-step drop-off across the ${data.range.days}-day window. Each row shows the % of users who made it from the previous step to this one.`}
              />
              {maxFunnelCount === 0 ? (
                <EmptyState message="No funnel activity in this window. As visitors arrive, complete micro-readings, book sessions and convert to members, the funnel will fill in." />
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

            {/* Churn rate */}
            <Card>
              <SectionHeader
                eyebrow="Churn"
                title="30-day churn"
                hint="Memberships that transitioned from active to cancelled or expired in the last 30 days, as a share of the at-risk pool."
              />
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative flex items-center justify-center mb-4">
                  <svg className="size-32" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={PALETTE.grid}
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={
                        data.churnRate < 2
                          ? PALETTE.gold
                          : data.churnRate < 5
                          ? PALETTE.goldPale
                          : PALETTE.crimson
                      }
                      strokeWidth="6"
                      strokeDasharray={`${Math.min(
                        data.churnRate * 2.64,
                        264
                      )} 264`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: "stroke-dasharray 0.8s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p
                      className="text-3xl font-mono text-[#f0eee9]"
                      style={{
                        fontFamily:
                          "var(--font-playfair), Georgia, serif",
                      }}
                    >
                      {data.churnRate.toFixed(1)}%
                    </p>
                    <p className="text-[9px] tracking-[0.3em] uppercase text-[#5a5a5a] mt-0.5">
                      churned
                    </p>
                  </div>
                </div>
                <ChurnTrendBadge rate={data.churnRate} />
                <p className="text-body-cinematic text-[11px] text-[#7a7a7a] mt-4 text-center max-w-[220px] leading-relaxed">
                  A 0% churn rate is the steady state — until real
                  cancellations begin, this dial stays dark.
                </p>
              </div>
            </Card>
          </div>

          {/* ─── Cohort retention table (heatmap) ───────────────── */}
          <Card>
            <SectionHeader
              eyebrow="Cohort Retention"
              title="Signup cohorts · 30 / 60 / 90 days"
              hint="Each row is a calendar-month cohort of new members. Cells show the % of that cohort whose membership is still active N days after they signed up. n/a means the cohort hasn't reached that age yet."
            />
            {cohorts.every((c) => c.size === 0) ? (
              <EmptyState message="No membership cohorts yet. As members sign up, each calendar month becomes a cohort row, and the retention heatmap fills in as those members age." />
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.04] hover:bg-transparent">
                      <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light pl-2 sm:pl-0">
                        Cohort
                      </TableHead>
                      <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-right">
                        Size
                      </TableHead>
                      <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-center">
                        Day 30
                      </TableHead>
                      <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-center">
                        Day 60
                      </TableHead>
                      <TableHead className="text-[#7a7a7a] text-[10px] tracking-[0.2em] uppercase font-light text-center pr-2 sm:pr-0">
                        Day 90
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((c) => (
                      <TableRow
                        key={c.cohortMonth}
                        className="border-white/[0.02] hover:bg-white/[0.015] transition-colors"
                      >
                        <TableCell className="text-[#f0eee9] text-xs font-light pl-2 sm:pl-0">
                          {c.cohortMonth}
                        </TableCell>
                        <TableCell className="text-[#cfcabf] text-xs font-mono text-right">
                          {c.size}
                        </TableCell>
                        <TableCell className="py-2 px-2">
                          <RetentionCell value={c.retention30d} />
                        </TableCell>
                        <TableCell className="py-2 px-2">
                          <RetentionCell value={c.retention60d} />
                        </TableCell>
                        <TableCell className="py-2 px-2 pr-2 sm:pr-0">
                          <RetentionCell value={c.retention90d} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Heatmap legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/[0.04]">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mr-2">
                Retention
              </span>
              {[
                { label: "<25%", color: PALETTE.goldDeep },
                { label: "25–50%", color: PALETTE.goldMuted },
                { label: "50–75%", color: PALETTE.goldPale },
                { label: ">75%", color: PALETTE.gold },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#7a7a7a]">
                    {s.label}
                  </span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <ArrowUpRight className="size-3 text-[#5a5a5a]" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                  Higher = healthier
                </span>
              </div>
            </div>
          </Card>

          {/* ─── Window footer ───────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <Clock className="size-3 text-[#3a3a3a]" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#3a3a3a] font-light">
              Window · {data.range.days} days · funnel &amp; churn scope
            </p>
            <Gauge className="size-3 text-[#3a3a3a] ml-2" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#3a3a3a] font-light">
              Revenue &amp; cohorts · 12-month trailing
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
