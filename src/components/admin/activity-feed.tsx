"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Mail,
  Star,
  DollarSign,
  Users,
  Image as ImageIcon,
  Globe,
  PenLine,
  Bell,
  ChevronDown,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */

export interface ActivityItem {
  id: string;
  type:
    | "booking_created"
    | "booking_confirmed"
    | "booking_completed"
    | "booking_cancelled"
    | "booking_refunded"
    | "newsletter_signup"
    | "micro_reading"
    | "testimonial"
    | "social_image_generated"
    | "seo_page_published"
    | "article_written"
    | "payment_received";
  message: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

interface ActivityFeedProps {
  /** Initial activities to seed the feed */
  initialActivities?: ActivityItem[];
  /** Poll interval in ms — set 0 to disable polling */
  pollInterval?: number;
  /** API endpoint to fetch latest activities */
  fetchEndpoint?: string;
  /** Max items to display in the dropdown */
  maxItems?: number;
}

/* ─── Icon + Color mapping per type ────────────────────────────── */

const TYPE_CONFIG: Record<
  ActivityItem["type"],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  booking_created: {
    icon: <Calendar className="size-3.5" />,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  booking_confirmed: {
    icon: <CheckCircle2 className="size-3.5" />,
    color: "text-[#c9a96e]",
    bg: "bg-[#c9a96e]/10",
  },
  booking_completed: {
    icon: <CheckCircle2 className="size-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  booking_cancelled: {
    icon: <XCircle className="size-3.5" />,
    color: "text-[#c0392b]",
    bg: "bg-[#c0392b]/10",
  },
  booking_refunded: {
    icon: <DollarSign className="size-3.5" />,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  newsletter_signup: {
    icon: <Mail className="size-3.5" />,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  micro_reading: {
    icon: <Star className="size-3.5" />,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  testimonial: {
    icon: <Users className="size-3.5" />,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  social_image_generated: {
    icon: <ImageIcon className="size-3.5" />,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  seo_page_published: {
    icon: <Globe className="size-3.5" />,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  article_written: {
    icon: <PenLine className="size-3.5" />,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  payment_received: {
    icon: <DollarSign className="size-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
};

/* ─── Time ago helper ──────────────────────────────────────────── */

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/* ─── Activity Feed ────────────────────────────────────────────── */

export default function ActivityFeed({
  initialActivities = [],
  pollInterval = 15000,
  fetchEndpoint = "/api/admin/activity",
  maxItems = 20,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Poll for new activities
  useEffect(() => {
    if (pollInterval <= 0 || !fetchEndpoint) return;

    const fetchActivities = async () => {
      try {
        const res = await fetch(fetchEndpoint);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.activities)) {
            setActivities((prev) => {
              const newItems = data.activities.filter(
                (a: ActivityItem) => !prev.find((p) => p.id === a.id)
              );
              const merged = [...newItems, ...prev].slice(0, maxItems);
              return merged;
            });
          }
        }
      } catch {
        // Silent fail — activity feed is non‑critical
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, fetchEndpoint, maxItems]);

  // Track unread count
  useEffect(() => {
    if (prevCountRef.current > 0 && activities.length > prevCountRef.current) {
      setUnread((prev) => prev + (activities.length - prevCountRef.current));
    }
    prevCountRef.current = activities.length;
  }, [activities.length]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) setUnread(0);
  }, [isOpen]);

  const handleMarkAllRead = useCallback(() => {
    setUnread(0);
  }, []);

  // Expose a method to push activities from parent components
  const pushActivity = useCallback((item: Omit<ActivityItem, "id">) => {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setActivities((prev) => [{ ...item, id }, ...prev].slice(0, maxItems));
    setUnread((prev) => prev + 1);
  }, [maxItems]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg text-[#9a9a9a] hover:text-[#c9a96e] hover:bg-[#c9a96e]/10 transition-all duration-200"
        aria-label="Activity feed"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#c9a96e] text-[#050505] text-[9px] font-bold px-1"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-[#0a0a0a]/98 backdrop-blur-xl border border-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
              <div>
                <p className="text-editorial text-sm text-[#f0eee9] tracking-wider">
                  LIVE ACTIVITY
                </p>
                <p className="text-body-cinematic text-[10px] text-[#7a7a7a] mt-0.5">
                  Real-time event stream
                </p>
              </div>
              <div className="flex items-center gap-1">
                {/* Live pulse */}
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-[#c9a96e] hover:text-[#d4b879] transition-colors"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>

            {/* Activity list */}
            <div className="max-h-80 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="size-6 text-[#333] mx-auto mb-2" />
                  <p className="text-body-cinematic text-xs text-[#555]">
                    No activity yet
                  </p>
                  <p className="text-body-cinematic text-[10px] text-[#444] mt-1">
                    Events will appear here in real time
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {activities.map((activity, index) => {
                    const cfg = TYPE_CONFIG[activity.type];
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -12, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 12, height: 0 }}
                        transition={{ duration: 0.25, delay: index > 5 ? 0 : index * 0.03 }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${
                          index < unread ? "bg-white/[0.015]" : ""
                        }`}
                      >
                        {/* Icon badge */}
                        <div
                          className={`shrink-0 mt-0.5 rounded-md p-1.5 ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#e8e6e1] leading-relaxed">
                            {activity.message}
                          </p>
                          <p className="text-[10px] text-[#5a5a5a] mt-1">
                            {timeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {activities.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/[0.04] bg-[#080808]/50">
                <p className="text-[10px] text-[#555] text-center">
                  Showing {Math.min(activities.length, maxItems)} of{" "}
                  {activities.length} events
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Utility: create activity items easily ────────────────────── */

export function createActivity(
  type: ActivityItem["type"],
  message: string,
  metadata?: Record<string, string>
): Omit<ActivityItem, "id"> {
  return { type, message, timestamp: new Date(), metadata };
}

/* ─── Demo / seed data for development ─────────────────────────── */

export const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: "demo-1",
    type: "booking_created",
    message: "New booking from Priya Sharma — 60min consultation",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: "demo-2",
    type: "payment_received",
    message: "Payment of ₹4,500 received for order #AK-2847",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    id: "demo-3",
    type: "newsletter_signup",
    message: "rahul.v@gmail.com subscribed via blog footer",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "demo-4",
    type: "booking_completed",
    message: "Session with Ankit Joshi completed — 90min",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: "demo-5",
    type: "social_image_generated",
    message: "Social image generated for 'Leo 2025 Love Guide'",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000),
  },
  {
    id: "demo-6",
    type: "micro_reading",
    message: "New micro-reading lead: meera.p@email.com (June-born)",
    timestamp: new Date(Date.now() - 3 * 3600 * 1000),
  },
  {
    id: "demo-7",
    type: "seo_page_published",
    message: "Programmatic page published: Vedic Astrology in Jaipur",
    timestamp: new Date(Date.now() - 5 * 3600 * 1000),
  },
];