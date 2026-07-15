"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ArrowRight,
  CreditCard,
  MessageCircle,
  DollarSign,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────

interface FunnelData {
  eventCounts: Record<string, number>;
  funnel: {
    bookingStarted: number;
    paymentIntentCreated: number;
    paymentCompleted: number;
    bookingConfirmed: number;
    sessionCompleted: number;
  };
  conversionRates: {
    started_to_payment: string;
    payment_to_confirmed: string;
    confirmed_to_completed: string;
    overall: string;
  };
  paymentSplit: {
    stripe: number;
    whatsapp: number;
  };
  revenueByDuration: Record<number, { count: number; revenue: number }>;
  bookingStatus: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="card-depth bg-[#0a0a0a] border-white/[0.04] hover:border-white/[0.08] transition-all duration-500">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-body-cinematic text-xs uppercase tracking-[0.2em]">{title}</p>
              <p className="text-editorial text-2xl sm:text-3xl text-[#f0eee9]">{value}</p>
              {subtitle && (
                <p className="text-body-cinematic text-xs flex items-center gap-1">
                  <TrendingUp className="size-3 text-emerald-400" />
                  {subtitle}
                </p>
              )}
            </div>
            <div className={`rounded-lg p-3 ${accent}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Funnel Stage ─────────────────────────────────────────────────

function FunnelStage({
  label,
  count,
  rate,
  maxCount,
  isLast = false,
  delay = 0,
}: {
  label: string;
  count: number;
  rate?: string;
  maxCount: number;
  isLast?: boolean;
  delay?: number;
}) {
  const barPct = maxCount > 0 ? Math.max(4, (count / maxCount) * 100) : 4;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-4"
    >
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#f0eee9] text-sm font-medium">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-[#c9a96e] text-lg font-bold">{count}</span>
            {rate && (
              <Badge variant="outline" className="bg-emerald-400/10 border-emerald-400/20 text-emerald-400 text-[10px]">
                {rate}
              </Badge>
            )}
          </div>
        </div>
        <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            transition={{ duration: 1, delay: delay + 0.2 }}
            className="h-full bg-gradient-to-r from-[#c9a96e] to-[#a8884d] rounded-full"
          />
        </div>
      </div>
      {!isLast && <ArrowRight className="size-4 text-[#555] shrink-0" />}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function FunnelDashboard() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/funnel-metrics");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("Failed to load funnel metrics.");
      console.error("[FunnelDashboard] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Loading State ────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-[#0a0a0a] border-white/[0.04]">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-3 w-20 bg-[#141414]" />
                <Skeleton className="h-8 w-24 bg-[#141414]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="size-10 text-[#c0392b] mx-auto mb-3" />
        <p className="text-body-cinematic text-sm mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="btn-outline-gold text-xs">
          <RefreshCw className="size-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { funnel, conversionRates, paymentSplit, revenueByDuration, bookingStatus } = data;

  // Calculate max revenue for bar scaling
  const maxRevenue = Math.max(
    ...Object.values(revenueByDuration).map((r) => r.revenue),
    1
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="bg-[#0a0a0a] border-white/[0.04]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider flex items-center gap-2">
                <TrendingUp className="size-4 text-[#c9a96e]" />
                FUNNEL ANALYTICS
              </CardTitle>
              <CardDescription className="text-body-cinematic text-xs mt-1">
                Conversion from landing page to completed session
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10 text-xs h-8"
            >
              <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* ─── KPI Cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Booking Starts"
              value={funnel.bookingStarted}
              icon={<Users className="size-5 text-blue-400" />}
              accent="bg-blue-400/10"
              delay={0}
            />
            <StatCard
              title="Payments"
              value={funnel.paymentCompleted}
              subtitle={`${conversionRates.started_to_payment} start → payment`}
              icon={<CreditCard className="size-5 text-[#c9a96e]" />}
              accent="bg-[#c9a96e]/10"
              delay={0.1}
            />
            <StatCard
              title="Confirmed"
              value={funnel.bookingConfirmed}
              subtitle={`${conversionRates.overall} overall`}
              icon={<CheckCircle2 className="size-5 text-emerald-400" />}
              accent="bg-emerald-400/10"
              delay={0.2}
            />
            <StatCard
              title="Completed"
              value={funnel.sessionCompleted}
              subtitle={`${conversionRates.confirmed_to_completed} confirmed → done`}
              icon={<TrendingUp className="size-5 text-purple-400" />}
              accent="bg-purple-400/10"
              delay={0.3}
            />
          </div>

          {/* ─── Funnel Visualization ───────────────────────────── */}
          <div>
            <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
              <BarChart3 className="size-3.5" />
              CONVERSION FUNNEL
            </h3>
            <div className="space-y-4">
              <FunnelStage
                label="Booking Started"
                count={funnel.bookingStarted}
                maxCount={Math.max(funnel.bookingStarted, 1)}
                delay={0}
              />
              <FunnelStage
                label="Payment Intent Created"
                count={funnel.paymentIntentCreated}
                rate={conversionRates.started_to_payment}
                maxCount={Math.max(funnel.bookingStarted, 1)}
                delay={0.1}
              />
              <FunnelStage
                label="Payment Completed"
                count={funnel.paymentCompleted}
                rate={conversionRates.payment_to_confirmed}
                maxCount={Math.max(funnel.bookingStarted, 1)}
                delay={0.2}
              />
              <FunnelStage
                label="Booking Confirmed"
                count={funnel.bookingConfirmed}
                rate={conversionRates.overall}
                maxCount={Math.max(funnel.bookingStarted, 1)}
                delay={0.3}
              />
              <FunnelStage
                label="Session Completed"
                count={funnel.sessionCompleted}
                isLast
                maxCount={Math.max(funnel.bookingStarted, 1)}
                delay={0.4}
              />
            </div>
          </div>

          {/* ─── Payment Split ──────────────────────────────────── */}
          <div>
            <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <CreditCard className="size-3.5" />
              PAYMENT METHOD SPLIT
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-[#c9a96e]/10 p-2">
                    <CreditCard className="size-4 text-[#c9a96e]" />
                  </div>
                  <div>
                    <p className="text-[#f0eee9] text-sm font-medium">Stripe (Online)</p>
                    <p className="text-body-cinematic text-xs">{paymentSplit.stripe} bookings</p>
                  </div>
                </div>
                <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#c9a96e]/60 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (paymentSplit.stripe / Math.max(1, paymentSplit.stripe + paymentSplit.whatsapp)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-emerald-400/10 p-2">
                    <MessageCircle className="size-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[#f0eee9] text-sm font-medium">WhatsApp</p>
                    <p className="text-body-cinematic text-xs">{paymentSplit.whatsapp} bookings</p>
                  </div>
                </div>
                <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/60 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (paymentSplit.whatsapp / Math.max(1, paymentSplit.stripe + paymentSplit.whatsapp)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Revenue by Duration ────────────────────────────── */}
          {Object.keys(revenueByDuration).length > 0 && (
            <div>
              <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                <DollarSign className="size-3.5" />
                REVENUE BY SESSION DURATION
              </h3>
              <div className="space-y-3">
                {Object.entries(revenueByDuration)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([duration, stats]) => (
                    <div key={duration} className="bg-[#111]/50 border border-white/[0.04] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[#f0eee9] text-sm font-medium">{duration} minutes</p>
                        <div className="flex items-center gap-3">
                          <span className="text-body-cinematic text-xs">{stats.count} bookings</span>
                          <span className="text-[#c9a96e] text-sm font-bold">
                            ₹{stats.revenue.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#c9a96e]/60 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, (stats.revenue / maxRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ─── Booking Status Summary ─────────────────────────── */}
          <div>
            <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
              BOOKING STATUS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111]/50 border border-white/[0.04] rounded-lg p-4 text-center">
                <p className="text-[#f0eee9] text-xl font-bold">{bookingStatus.total}</p>
                <p className="text-body-cinematic text-[10px] mt-1">Total</p>
              </div>
              <div className="bg-[#111]/50 border border-white/[0.04] rounded-lg p-4 text-center">
                <p className="text-[#c9a96e] text-xl font-bold">{bookingStatus.confirmed}</p>
                <p className="text-body-cinematic text-[10px] mt-1">Confirmed</p>
              </div>
              <div className="bg-[#111]/50 border border-white/[0.04] rounded-lg p-4 text-center">
                <p className="text-emerald-400 text-xl font-bold">{bookingStatus.completed}</p>
                <p className="text-body-cinematic text-[10px] mt-1">Completed</p>
              </div>
              <div className="bg-[#111]/50 border border-white/[0.04] rounded-lg p-4 text-center">
                <p className="text-[#c0392b] text-xl font-bold">{bookingStatus.cancelled}</p>
                <p className="text-body-cinematic text-[10px] mt-1">Cancelled</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
