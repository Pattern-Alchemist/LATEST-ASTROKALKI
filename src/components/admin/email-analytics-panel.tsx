"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────

interface EmailAnalyticsData {
  summary: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: string;
    clickRate: string;
    bounceRate: string;
  };
  byTemplate: Array<{ template: string; sent: number }>;
  bySequence: Array<{ sequence: string; stage: number; sent: number }>;
  eventBreakdown: Array<{ type: string; count: number }>;
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

// ─── Main Component ───────────────────────────────────────────────

export default function EmailAnalyticsPanel() {
  const [data, setData] = useState<EmailAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-events");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("Failed to load email analytics.");
      console.error("[EmailAnalytics] Fetch error:", err);
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

  const { summary, byTemplate, bySequence } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="bg-[#0a0a0a] border-white/[0.04]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider flex items-center gap-2">
                <Mail className="size-4 text-[#c9a96e]" />
                EMAIL ANALYTICS
              </CardTitle>
              <CardDescription className="text-body-cinematic text-xs mt-1">
                Delivery, open, and click metrics from Resend
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
              title="Total Sent"
              value={summary.totalSent}
              icon={<Send className="size-5 text-blue-400" />}
              accent="bg-blue-400/10"
              delay={0}
            />
            <StatCard
              title="Open Rate"
              value={summary.openRate}
              subtitle={`${summary.opened} unique opens`}
              icon={<Eye className="size-5 text-emerald-400" />}
              accent="bg-emerald-400/10"
              delay={0.1}
            />
            <StatCard
              title="Click Rate"
              value={summary.clickRate}
              subtitle={`${summary.clicked} unique clicks`}
              icon={<MousePointerClick className="size-5 text-[#c9a96e]" />}
              accent="bg-[#c9a96e]/10"
              delay={0.2}
            />
            <StatCard
              title="Bounce Rate"
              value={summary.bounceRate}
              subtitle={`${summary.bounced} bounced`}
              icon={<AlertTriangle className="size-5 text-[#c0392b]" />}
              accent="bg-[#c0392b]/10"
              delay={0.3}
            />
          </div>

          {/* ─── Per-Template Breakdown ─────────────────────────── */}
          {byTemplate.length > 0 && (
            <div>
              <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                <BarChart3 className="size-3.5" />
                BY TEMPLATE
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.04] hover:bg-transparent">
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Template</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium text-right">Sent</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Distribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byTemplate.map((row) => {
                      const pct = summary.totalSent > 0 ? (row.sent / summary.totalSent) * 100 : 0;
                      return (
                        <TableRow key={row.template} className="border-white/[0.02] hover:bg-white/[0.02]">
                          <TableCell>
                            <Badge variant="outline" className="text-[#c9a96e] border-[#c9a96e]/20 bg-[#c9a96e]/5 text-[10px]">
                              {row.template}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#f0eee9] text-sm text-right font-medium">{row.sent}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#141414] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#c9a96e]/60 rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#555] w-10 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ─── Per-Sequence Breakdown ─────────────────────────── */}
          {bySequence.length > 0 && (
            <div>
              <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
                DRIP SEQUENCES
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.04] hover:bg-transparent">
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Sequence</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium">Stage</TableHead>
                      <TableHead className="text-[#9a9a9a] text-xs font-medium text-right">Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySequence.map((row, i) => (
                      <TableRow key={`${row.sequence}-${row.stage}-${i}`} className="border-white/[0.02] hover:bg-white/[0.02]">
                        <TableCell className="text-[#f0eee9] text-sm">{row.sequence}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[#9a9a9a] border-white/[0.06] text-[10px]">
                            Stage {row.stage ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#f0eee9] text-sm text-right font-medium">{row.sent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ─── Empty State ────────────────────────────────────── */}
          {byTemplate.length === 0 && bySequence.length === 0 && (
            <div className="text-center py-8">
              <Mail className="size-10 text-[#333] mx-auto mb-3" />
              <p className="text-body-cinematic text-sm">No email data yet.</p>
              <p className="text-[#555] text-xs mt-1">Emails will appear here once sent via Resend.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
