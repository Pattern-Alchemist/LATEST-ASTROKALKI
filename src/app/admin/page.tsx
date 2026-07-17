"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  DollarSign,
  Mail,
  Clock,
  Copy,
  Eye,
  Star,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hourglass,
  ExternalLink,
  BarChart3,
  Search,
  Trash2,
  Quote,
  Disc3,
  Radio,
  Globe,
  PenLine,
  Images,
  MapPin,
  FileText,
  Video,
  RotateCcw,
  Ban,
  CreditCard,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import AdminRoomsPanel from "@/components/admin/rooms-panel";
import EmailAnalyticsPanel from "@/components/admin/email-analytics-panel";
import FunnelDashboard from "@/components/admin/funnel-dashboard";

/* ─── NEW: Shared admin UI components ────────────────────────────── */

import AdminStatCard, { MiniStat } from "@/components/admin/admin-stat-card";
import {
  useToast,
  toastSuccess,
  toastError,
  toastWarning,
  toastBulk,
} from "@/components/admin/admin-toast";
import ActivityFeed, { DEMO_ACTIVITIES } from "@/components/admin/activity-feed";

// ─── Types ────────────────────────────────────────────────────────

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalNewsletter: number;
  totalMicroReadings: number;
  totalReferrals: number;
  totalMemberships: number;
  totalTestimonials: number;
  totalInsights: number;
  totalRevenue: number;
  recentBookings: number;
  recentNewsletter: number;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  duration: number;
  price: string;
  contexts: string;
  birthDate: string | null;
  birthTime: string | null;
  birthPlace: string | null;
  message: string | null;
  status: string;
  referredBy: string | null;
  roomUrl: string | null;
  roomName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewsletterSub {
  id: string;
  email: string;
  source: string | null;
  createdAt: string;
}

interface MicroReadingLead {
  id: string;
  email: string;
  birthMonth: number;
  emotionalPattern: string;
  relationshipFrustration: string;
  resultHint: string;
  createdAt: string;
}

// ─── Status Config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/20",
    icon: <Hourglass className="size-3" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-[#c9a96e]",
    bgColor: "bg-[#c9a96e]/10",
    borderColor: "border-[#c9a96e]/20",
    icon: <CheckCircle2 className="size-3" />,
  },
  completed: {
    label: "Completed",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/20",
    icon: <CheckCircle2 className="size-3" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-[#c0392b]",
    bgColor: "bg-[#c0392b]/10",
    borderColor: "border-[#c0392b]/20",
    icon: <XCircle className="size-3" />,
  },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(price: string) {
  const num = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return price;
  return "\u20B9" + num.toLocaleString("en-IN");
}

// ─── Status Badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge
      variant="outline"
      className={`${config.color} ${config.bgColor} ${config.borderColor} gap-1 text-xs font-medium`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ─── Inner Dashboard (needs toast context) ────────────────────────

function DashboardInner() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSub[]>([]);
  const [microReadings, setMicroReadings] = useState<MicroReadingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Data Fetching ────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const statusParam = bookingFilter !== "all" ? `?status=${bookingFilter}` : "";
      const res = await fetch(`/api/bookings${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  }, [bookingFilter]);

  const fetchSubscribers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/newsletter");
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
      }
    } catch (err) {
      console.error("Failed to fetch subscribers:", err);
    }
  }, []);

  const fetchMicroReadings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/micro-readings");
      if (res.ok) {
        const data = await res.json();
        setMicroReadings(data.readings || []);
      }
    } catch (err) {
      console.error("Failed to fetch micro-readings:", err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchBookings(),
      fetchSubscribers(),
      fetchMicroReadings(),
    ]);
    setLoading(false);
  }, [fetchStats, fetchBookings, fetchSubscribers, fetchMicroReadings]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!loading) {
      fetchBookings();
    }
  }, [bookingFilter, fetchBookings, loading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toastSuccess(addToast, "Dashboard refreshed", "All data is up to date");
  };

  // ─── Booking Status Update (with toast) ────────────────────────

  const updateBookingStatus = async (id: string, newStatus: string) => {
    const booking = bookings.find((b) => b.id === id);
    const prevStatus = booking?.status || "unknown";
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
        );
        fetchStats();
        toastSuccess(
          addToast,
          `Booking ${STATUS_CONFIG[newStatus]?.label?.toLowerCase() || newStatus}`,
          `${booking?.name || id} moved from ${prevStatus} to ${newStatus}`
        );
      } else {
        toastError(addToast, "Status update failed", "Could not update booking status. Try again.");
      }
    } catch {
      toastError(addToast, "Network error", "Failed to connect to the server.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteBooking = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        fetchStats();
        toastSuccess(addToast, "Booking deleted", `${booking?.name || id} has been permanently removed`);
      } else {
        toastError(addToast, "Delete failed", "Could not delete this booking.");
      }
    } catch {
      toastError(addToast, "Network error", "Failed to connect to the server.");
    }
  };

  // ─── Booking Actions (reschedule / cancel / refund) ─────────────

  const cancelBooking = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin cancelled", notifyCustomer: true }),
      });
      if (res.ok) {
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
        fetchStats();
        toastWarning(addToast, "Booking cancelled", `${booking?.name || id} was cancelled and the customer has been notified`);
      } else {
        const data = await res.json();
        toastError(addToast, "Cancel failed", data.error || "Could not cancel booking.");
      }
    } catch {
      toastError(addToast, "Network error", "Failed to connect to the server.");
    } finally {
      setActionLoading(null);
    }
  };

  const refundBooking = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    setActionLoading(id);
    try {
      const res = await fetch("/api/stripe/refund-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, reason: "requested_by_customer" }),
      });
      if (res.ok) {
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "refunded" } : b));
        fetchStats();
        toastSuccess(addToast, "Refund processed", `Full refund issued for ${booking?.name || id}`);
      } else {
        const data = await res.json();
        toastError(addToast, "Refund failed", data.error || "Could not process refund.");
      }
    } catch {
      toastError(addToast, "Network error", "Failed to connect to the server.");
    } finally {
      setActionLoading(null);
    }
  };

  const resendConfirmation = async (booking: Booking) => {
    setActionLoading(booking.id);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/resend-email`, {
        method: "POST",
      });
      if (res.ok) {
        toastSuccess(addToast, "Email resent", `Confirmation email sent to ${booking.email}`);
      } else {
        const data = await res.json();
        toastError(addToast, "Resend failed", data.error || "Could not resend email.");
      }
    } catch {
      toastError(addToast, "Network error", "Failed to connect to the server.");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Copy room URL helper ───────────────────────────────────────
  const handleCopyRoomUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedRoomId(id);
    toastSuccess(addToast, "Link copied", "Meeting URL copied to clipboard");
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  // ─── Filtered Bookings ──────────────────────────────────────────

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  });

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050505] text-[#e8e6e1]">
      {/* Grain overlay inherited from layout */}
      <div className="grain-overlay" style={{ opacity: 0.008 }} />

      {/* ─── Header ──────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.04]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a96e] to-[#a8884d] flex items-center justify-center">
                <Star className="size-4 text-[#050505]" />
              </div>
              <div>
                <h1 className="text-editorial text-sm sm:text-base text-[#f0eee9] tracking-[0.12em]">
                  ASTROKALKI
                </h1>
                <p className="text-body-cinematic text-[10px] sm:text-xs">
                  Command Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* ── Nav Links ── */}
              <Link href="/admin/testimonials" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Moderate public testimonial submissions">
                <Quote className="size-3" />
                <span className="hidden sm:inline">Testimonials</span>
              </Link>
              <Link href="/admin/case-studies" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Long-form anonymised client journeys">
                <FileText className="size-3" />
                <span className="hidden sm:inline">Case Studies</span>
              </Link>
              <Link href="/admin/analytics" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Behaviour & conversion analytics">
                <BarChart3 className="size-3" />
                <span className="hidden sm:inline">Analytics</span>
              </Link>
              <Link href="/admin/revenue" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Revenue, churn & cohort analytics">
                <TrendingUp className="size-3" />
                <span className="hidden sm:inline">Revenue</span>
              </Link>
              <Link href="/admin/referrals" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Referral programme dashboard">
                <Users className="size-3" />
                <span className="hidden sm:inline">Referrals</span>
              </Link>
              <Link href="/admin/recordings" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Upload & manage recorded session audio">
                <Disc3 className="size-3" />
                <span className="hidden sm:inline">Recordings</span>
              </Link>
              <Link href="/admin/availability" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Toggle real-time availability indicator">
                <Radio className="size-3" />
                <span className="hidden sm:inline">Availability</span>
              </Link>
              <Link href="/admin/write" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="AI writing assistant">
                <PenLine className="size-3" />
                <span className="hidden sm:inline">Write</span>
              </Link>
              <Link href="/admin/programmatic" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Programmatic SEO pages">
                <Globe className="size-3" />
                <span className="hidden sm:inline">SEO Pages</span>
              </Link>
              <Link href="/admin/seo" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="Local SEO city x pattern pages">
                <MapPin className="size-3" />
                <span className="hidden sm:inline">Local SEO</span>
              </Link>
              <Link href="/admin/social-images" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5" title="AI-generated social share images">
                <Images className="size-3" />
                <span className="hidden sm:inline">Social Images</span>
              </Link>
              <a href="/" target="_blank" rel="noopener noreferrer" className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5">
                <ExternalLink className="size-3" />
                <span className="hidden sm:inline">View Site</span>
              </a>

              {/* ── NEW: Activity Feed Bell ── */}
              <ActivityFeed
                initialActivities={DEMO_ACTIVITIES}
                pollInterval={15000}
              />

              {/* ── Refresh ── */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>

              {/* ── Logout ── */}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await fetch('/api/admin/logout', { method: 'POST' });
                  window.location.href = '/admin/login';
                }}
                className="text-[#9a9a9a] hover:text-red-400 hover:bg-red-500/10 text-xs"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* ─── Tab Navigation ─────────────────────────────────── */}
          <div className="mb-6 sm:mb-8">
            <TabsList className="bg-[#0a0a0a] border border-white/[0.04] rounded-lg p-1 h-auto flex-wrap gap-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Eye className="size-3.5 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="bookings" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Calendar className="size-3.5 mr-1.5" />
                Bookings
                {stats && stats.pendingBookings > 0 && (
                  <span className="ml-1.5 bg-yellow-400/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                    {stats.pendingBookings}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="newsletter" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Mail className="size-3.5 mr-1.5" />
                Newsletter
              </TabsTrigger>
              <TabsTrigger value="micro-readings" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Star className="size-3.5 mr-1.5" />
                Micro-Readings
              </TabsTrigger>
              <TabsTrigger value="rooms" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Video className="size-3.5 mr-1.5" />
                Rooms
              </TabsTrigger>
              <TabsTrigger value="email-analytics" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <Mail className="size-3.5 mr-1.5" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="funnel" className="data-[state=active]:bg-[#c9a96e]/10 data-[state=active]:text-[#c9a96e] data-[state=active]:border-[#c9a96e]/20 text-[#9a9a9a] rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm">
                <BarChart3 className="size-3.5 mr-1.5" />
                <span className="hidden sm:inline">Funnel</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════════════════════════════════════════════════
              OVERVIEW TAB — now with animated stat cards
              ═══════════════════════════════════════════════════════ */}
          <TabsContent value="overview">
            {/* Primary Stats — AdminStatCard with animated counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <AdminStatCard
                title="Total Bookings"
                value={stats?.totalBookings ?? 0}
                subtitle={stats ? `${stats.recentBookings} this week` : undefined}
                icon={<Calendar className="size-5 text-[#c9a96e]" />}
                accent="bg-[#c9a96e]/10"
                delay={0}
                loading={loading}
              />
              <AdminStatCard
                title="Pending"
                value={stats?.pendingBookings ?? 0}
                subtitle={stats
                  ? stats.pendingBookings > 0 ? "Needs attention" : "All clear"
                  : undefined}
                icon={<AlertCircle className="size-5 text-yellow-400" />}
                accent="bg-yellow-400/10"
                delay={0.1}
                loading={loading}
              />
              <AdminStatCard
                title="Revenue"
                value={stats ? `\u20B9${stats.totalRevenue.toLocaleString("en-IN")}` : "\u20B90"}
                subtitle={stats ? `From ${stats.confirmedBookings + stats.completedBookings} bookings` : undefined}
                icon={<DollarSign className="size-5 text-emerald-400" />}
                accent="bg-emerald-400/10"
                delay={0.2}
                loading={loading}
              />
              <AdminStatCard
                title="Newsletter"
                value={stats?.totalNewsletter ?? 0}
                subtitle={stats ? `${stats.recentNewsletter} this week` : undefined}
                icon={<Users className="size-5 text-blue-400" />}
                accent="bg-blue-400/10"
                delay={0.3}
                loading={loading}
              />
            </div>

            {/* Secondary Stats — MiniStat with animated counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <MiniStat
                value={stats?.completedBookings ?? 0}
                label="Completed"
                color="text-emerald-400"
                delay={0.4}
                loading={loading}
              />
              <MiniStat
                value={stats?.confirmedBookings ?? 0}
                label="Confirmed"
                color="text-[#c9a96e]"
                delay={0.45}
                loading={loading}
              />
              <MiniStat
                value={stats?.cancelledBookings ?? 0}
                label="Cancelled"
                color="text-[#c0392b]"
                delay={0.5}
                loading={loading}
              />
              <MiniStat
                value={stats?.totalMicroReadings ?? 0}
                label="Micro-Leads"
                color="text-blue-400"
                delay={0.55}
                loading={loading}
              />
            </div>

            {/* Recent Bookings Quick View */}
            {!loading && stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="bg-[#0a0a0a] border-white/[0.04]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider">
                          RECENT BOOKINGS
                        </CardTitle>
                        <CardDescription className="text-body-cinematic text-xs mt-1">
                          Latest booking activity
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("bookings")}
                        className="text-[#c9a96e] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10 text-xs"
                      >
                        View All
                        <ArrowUpRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="size-8 text-[#333] mx-auto mb-2" />
                        <p className="text-body-cinematic text-sm">No bookings yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {bookings.slice(0, 5).map((booking) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-[#111]/50 border border-white/[0.02] hover:border-white/[0.06] transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[#f0eee9] text-sm font-medium truncate">{booking.name}</p>
                              <p className="text-body-cinematic text-xs truncate">{booking.email}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-3">
                              <span className="text-[#c9a96e] text-sm font-medium whitespace-nowrap">
                                {formatPrice(booking.price)}
                              </span>
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Error state */}
            {!loading && !stats && (
              <div className="text-center py-12">
                <AlertCircle className="size-8 text-[#c0392b] mx-auto mb-3" />
                <p className="text-body-cinematic">Failed to load dashboard data</p>
                <Button variant="outline" onClick={handleRefresh} className="btn-outline-gold mt-4">
                  Retry
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              BOOKINGS TAB
              ═══════════════════════════════════════════════════════ */}
          <TabsContent value="bookings">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="bg-[#0a0a0a] border-white/[0.04]">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider">
                        BOOKING MANAGEMENT
                      </CardTitle>
                      <CardDescription className="text-body-cinematic text-xs mt-1">
                        {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""} found
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#9a9a9a]" />
                        <Input
                          placeholder="Search bookings..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-[#111] border-white/[0.06] text-[#e8e6e1] placeholder:text-[#555] w-full sm:w-48 focus:border-[#c9a96e]/30 focus:ring-[#c9a96e]/20"
                        />
                      </div>
                      <Select value={bookingFilter} onValueChange={setBookingFilter}>
                        <SelectTrigger className="h-8 text-xs bg-[#111] border-white/[0.06] text-[#e8e6e1] w-full sm:w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                          <SelectItem value="all" className="text-xs text-[#e8e6e1] focus:bg-[#c9a96e]/10 focus:text-[#c9a96e]">All Status</SelectItem>
                          <SelectItem value="pending" className="text-xs text-yellow-400 focus:bg-yellow-400/10">Pending</SelectItem>
                          <SelectItem value="confirmed" className="text-xs text-[#c9a96e] focus:bg-[#c9a96e]/10">Confirmed</SelectItem>
                          <SelectItem value="completed" className="text-xs text-emerald-400 focus:bg-emerald-400/10">Completed</SelectItem>
                          <SelectItem value="cancelled" className="text-xs text-[#c0392b] focus:bg-[#c0392b]/10">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full bg-[#141414] rounded-lg" />
                      ))}
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="size-10 text-[#333] mx-auto mb-3" />
                      <p className="text-body-cinematic text-sm">No bookings found</p>
                      {bookingFilter !== "all" && (
                        <Button variant="ghost" size="sm" onClick={() => setBookingFilter("all")} className="text-[#c9a96e] mt-3 text-xs">
                          Clear filter
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/[0.04] hover:bg-transparent">
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Name</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Email</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Duration</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Price</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Status</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Meeting</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Date</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence mode="popLayout">
                              {filteredBookings.map((booking, i) => (
                                <motion.tr
                                  key={booking.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 10 }}
                                  transition={{ duration: 0.3, delay: i * 0.03 }}
                                  className="border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                                >
                                  <TableCell className="text-[#f0eee9] text-sm font-medium">{booking.name}</TableCell>
                                  <TableCell className="text-body-cinematic text-xs">{booking.email}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1 text-body-cinematic text-xs">
                                      <Clock className="size-3" />{booking.duration}m
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[#c9a96e] text-sm font-medium">{formatPrice(booking.price)}</TableCell>
                                  <TableCell><StatusBadge status={booking.status} /></TableCell>
                                  <TableCell>
                                    {(booking.status === "confirmed" || booking.status === "completed") && booking.roomUrl ? (
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="bg-emerald-400/10 border-emerald-400/20 text-emerald-400 text-[10px]">
                                          <CheckCircle2 className="size-2.5 mr-1" />Ready
                                        </Badge>
                                        <Button variant="ghost" size="sm" className="size-6 p-0 text-[#555] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                                          onClick={() => handleCopyRoomUrl(booking.roomUrl!, booking.id)} aria-label="Copy meeting link">
                                          {copiedRoomId === booking.id ? <CheckCircle2 className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                        </Button>
                                        <a href={booking.roomUrl} target="_blank" rel="noopener noreferrer"
                                          className="inline-flex size-6 items-center justify-center text-[#555] hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors" aria-label="Open meeting">
                                          <ExternalLink className="size-3" />
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-[#555] text-[10px]">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-body-cinematic text-xs">{formatDate(booking.createdAt)}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {(booking.status === "confirmed" || booking.status === "completed") && (
                                        <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                                          onClick={() => resendConfirmation(booking)} title="Resend confirmation email" disabled={actionLoading === booking.id}>
                                          <Mail className="size-3" />
                                        </Button>
                                      )}
                                      {(booking.status === "pending" || booking.status === "confirmed") && (
                                        <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-blue-400 hover:bg-blue-400/10"
                                          onClick={() => toastWarning(addToast, "Reschedule", "Use the Rooms tab to manage scheduling.")} title="Reschedule" disabled={actionLoading === booking.id}>
                                          <RotateCcw className="size-3" />
                                        </Button>
                                      )}
                                      {(booking.status === "pending" || booking.status === "confirmed") && (
                                        <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-[#c0392b] hover:bg-[#c0392b]/10"
                                          onClick={() => cancelBooking(booking.id)} title="Cancel booking" disabled={actionLoading === booking.id}>
                                          <Ban className="size-3" />
                                        </Button>
                                      )}
                                      {booking.status === "confirmed" && (
                                        <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-yellow-400 hover:bg-yellow-400/10"
                                          onClick={() => refundBooking(booking.id)} title="Refund payment" disabled={actionLoading === booking.id}>
                                          <CreditCard className="size-3" />
                                        </Button>
                                      )}
                                      <Select value={booking.status} onValueChange={(val) => updateBookingStatus(booking.id, val)} disabled={updatingId === booking.id}>
                                        <SelectTrigger size="sm" className="h-7 text-[10px] w-24 bg-[#111] border-white/[0.06] text-[#e8e6e1]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                                          <SelectItem value="pending" className="text-xs text-yellow-400 focus:bg-yellow-400/10">Pending</SelectItem>
                                          <SelectItem value="confirmed" className="text-xs text-[#c9a96e] focus:bg-[#c9a96e]/10">Confirmed</SelectItem>
                                          <SelectItem value="completed" className="text-xs text-emerald-400 focus:bg-emerald-400/10">Completed</SelectItem>
                                          <SelectItem value="cancelled" className="text-xs text-[#c0392b] focus:bg-[#c0392b]/10">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-[#c0392b] hover:bg-[#c0392b]/10"
                                        onClick={() => deleteBooking(booking.id)} title="Delete booking">
                                        <Trash2 className="size-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="md:hidden space-y-3 max-h-[70vh] overflow-y-auto">
                        {filteredBookings.map((booking, i) => (
                          <motion.div key={booking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-[#f0eee9] text-sm font-medium truncate">{booking.name}</p>
                                <p className="text-body-cinematic text-xs truncate">{booking.email}</p>
                              </div>
                              <StatusBadge status={booking.status} />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-body-cinematic flex items-center gap-1"><Clock className="size-3" />{booking.duration}m</span>
                                <span className="text-[#c9a96e] font-medium">{formatPrice(booking.price)}</span>
                              </div>
                              <span className="text-body-cinematic">{formatDate(booking.createdAt)}</span>
                            </div>
                            {(booking.status === "confirmed" || booking.status === "completed") && booking.roomUrl && (
                              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                                <Badge variant="outline" className="bg-emerald-400/10 border-emerald-400/20 text-emerald-400 text-[10px]">
                                  <CheckCircle2 className="size-2.5 mr-1" />Room Ready
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                                  onClick={() => handleCopyRoomUrl(booking.roomUrl!, booking.id)}>
                                  {copiedRoomId === booking.id ? <><CheckCircle2 className="size-3 text-emerald-400 mr-1" />Copied!</> : <><Copy className="size-3 mr-1" />Copy Link</>}
                                </Button>
                                <a href={booking.roomUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 h-6 px-2 text-[10px] text-[#9a9a9a] hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors">
                                  <ExternalLink className="size-3" />Open
                                </a>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                              <div className="flex items-center gap-1">
                                {(booking.status === "confirmed" || booking.status === "completed") && (
                                  <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10"
                                    onClick={() => resendConfirmation(booking)} disabled={actionLoading === booking.id}><Mail className="size-3" /></Button>
                                )}
                                {(booking.status === "pending" || booking.status === "confirmed") && (
                                  <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-blue-400 hover:bg-blue-400/10"
                                    onClick={() => toastWarning(addToast, "Reschedule", "Use the Rooms tab to manage scheduling.")} disabled={actionLoading === booking.id}><RotateCcw className="size-3" /></Button>
                                )}
                                {(booking.status === "pending" || booking.status === "confirmed") && (
                                  <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-[#c0392b] hover:bg-[#c0392b]/10"
                                    onClick={() => cancelBooking(booking.id)} disabled={actionLoading === booking.id}><Ban className="size-3" /></Button>
                                )}
                                {booking.status === "confirmed" && (
                                  <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-yellow-400 hover:bg-yellow-400/10"
                                    onClick={() => refundBooking(booking.id)} disabled={actionLoading === booking.id}><CreditCard className="size-3" /></Button>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Select value={booking.status} onValueChange={(val) => updateBookingStatus(booking.id, val)} disabled={updatingId === booking.id}>
                                  <SelectTrigger size="sm" className="h-7 text-[10px] w-24 bg-[#0a0a0a] border-white/[0.06] text-[#e8e6e1]"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                                    <SelectItem value="pending" className="text-xs text-yellow-400 focus:bg-yellow-400/10">Pending</SelectItem>
                                    <SelectItem value="confirmed" className="text-xs text-[#c9a96e] focus:bg-[#c9a96e]/10">Confirmed</SelectItem>
                                    <SelectItem value="completed" className="text-xs text-emerald-400 focus:bg-emerald-400/10">Completed</SelectItem>
                                    <SelectItem value="cancelled" className="text-xs text-[#c0392b] focus:bg-[#c0392b]/10">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="size-7 text-[#555] hover:text-[#c0392b] hover:bg-[#c0392b]/10"
                                  onClick={() => deleteBooking(booking.id)}><Trash2 className="size-3" /></Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              NEWSLETTER TAB
              ═══════════════════════════════════════════════════════ */}
          <TabsContent value="newsletter">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="bg-[#0a0a0a] border-white/[0.04]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider">NEWSLETTER SUBSCRIBERS</CardTitle>
                      <CardDescription className="text-body-cinematic text-xs mt-1">
                        {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                    <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-lg px-3 py-1.5">
                      <span className="text-[#c9a96e] text-xs font-medium">{subscribers.length} total</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-[#141414] rounded-lg" />)}</div>
                  ) : subscribers.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="size-10 text-[#333] mx-auto mb-3" />
                      <p className="text-body-cinematic text-sm">No newsletter subscribers yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/[0.04] hover:bg-transparent">
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">#</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Email</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Source</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Subscribed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subscribers.map((sub, i) => (
                              <motion.tr key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: i * 0.03 }}
                                className="border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                                <TableCell className="text-[#555] text-xs">{i + 1}</TableCell>
                                <TableCell className="text-[#f0eee9] text-sm">{sub.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[#9a9a9a] border-white/[0.06] text-[10px]">
                                    {sub.source || "website"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-body-cinematic text-xs">{formatDateTime(sub.createdAt)}</TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2 max-h-[70vh] overflow-y-auto">
                        {subscribers.map((sub, i) => (
                          <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                            className="flex items-center justify-between p-3 bg-[#111]/50 border border-white/[0.04] rounded-lg">
                            <div className="min-w-0 flex-1">
                              <p className="text-[#f0eee9] text-sm truncate">{sub.email}</p>
                              <p className="text-body-cinematic text-[10px]">{formatDateTime(sub.createdAt)}</p>
                            </div>
                            <Badge variant="outline" className="text-[#9a9a9a] border-white/[0.06] text-[10px] ml-2">{sub.source || "website"}</Badge>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              MICRO-READINGS TAB
              ═══════════════════════════════════════════════════════ */}
          <TabsContent value="micro-readings">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="bg-[#0a0a0a] border-white/[0.04]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-editorial text-sm text-[#f0eee9] tracking-wider">MICRO-READING LEADS</CardTitle>
                      <CardDescription className="text-body-cinematic text-xs mt-1">
                        {microReadings.length} lead{microReadings.length !== 1 ? "s" : ""} captured
                      </CardDescription>
                    </div>
                    <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-lg px-3 py-1.5">
                      <span className="text-[#c9a96e] text-xs font-medium">{microReadings.length} total</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full bg-[#141414] rounded-lg" />)}</div>
                  ) : microReadings.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="size-10 text-[#333] mx-auto mb-3" />
                      <p className="text-body-cinematic text-sm">No micro-reading leads yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden lg:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/[0.04] hover:bg-transparent">
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Email</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Birth Month</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Emotional Pattern</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Relationship Frustration</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Result Hint</TableHead>
                              <TableHead className="text-[#9a9a9a] text-xs font-medium">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {microReadings.map((reading, i) => (
                              <motion.tr key={reading.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: i * 0.03 }}
                                className="border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                                <TableCell className="text-[#f0eee9] text-sm">{reading.email}</TableCell>
                                <TableCell className="text-body-cinematic text-xs">{MONTH_NAMES[reading.birthMonth - 1] || reading.birthMonth}</TableCell>
                                <TableCell className="text-body-cinematic text-xs max-w-48 truncate">{reading.emotionalPattern}</TableCell>
                                <TableCell className="text-body-cinematic text-xs max-w-48 truncate">{reading.relationshipFrustration}</TableCell>
                                <TableCell className="text-[#c9a96e] text-xs max-w-36 truncate">{reading.resultHint}</TableCell>
                                <TableCell className="text-body-cinematic text-xs whitespace-nowrap">{formatDate(reading.createdAt)}</TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="lg:hidden space-y-3 max-h-[70vh] overflow-y-auto">
                        {microReadings.map((reading, i) => (
                          <motion.div key={reading.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                            className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-[#f0eee9] text-sm font-medium truncate">{reading.email}</p>
                                <p className="text-body-cinematic text-[10px] mt-0.5">{formatDate(reading.createdAt)}</p>
                              </div>
                              <Badge variant="outline" className="text-[#c9a96e] border-[#c9a96e]/20 text-[10px] ml-2">
                                {MONTH_NAMES[reading.birthMonth - 1] || reading.birthMonth}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-[#555] text-[10px] uppercase tracking-wider mb-0.5">Emotional Pattern</p>
                                <p className="text-body-cinematic text-xs line-clamp-2">{reading.emotionalPattern}</p>
                              </div>
                              <div>
                                <p className="text-[#555] text-[10px] uppercase tracking-wider mb-0.5">Frustration</p>
                                <p className="text-body-cinematic text-xs line-clamp-2">{reading.relationshipFrustration}</p>
                              </div>
                              <div>
                                <p className="text-[#555] text-[10px] uppercase tracking-wider mb-0.5">Result Hint</p>
                                <p className="text-[#c9a96e] text-xs line-clamp-2">{reading.resultHint}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              ROOMS / EMAIL ANALYTICS / FUNNEL TABS
              ═══════════════════════════════════════════════════════ */}
          <TabsContent value="rooms">
            <AdminRoomsPanel />
          </TabsContent>
          <TabsContent value="email-analytics">
            <EmailAnalyticsPanel />
          </TabsContent>
          <TabsContent value="funnel">
            <FunnelDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Star className="size-3 text-[#c9a96e]" />
              <p className="text-body-cinematic text-[10px]">AstroKalki Admin Dashboard</p>
            </div>
            <p className="text-[#333] text-[10px]">Sacred pattern recognition platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Exported page (toast context from admin layout) ─────────────────

export default function AdminDashboard() {
  return <DashboardInner />;
}