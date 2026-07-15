"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarPlus,
  Sparkles,
  Image as ImageIcon,
  PenLine,
  Mail,
  MailCheck,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import type {
  RecentActivityItem,
  RecentActivityType,
} from "@/lib/account/progress-types";

/**
 * ActivityTimeline — vertical timeline of a member's last 10 actions.
 *
 * Each entry is a row with:
 *   - A gold dot on a vertical rail (left)
 *   - A lucide icon (matches the action type)
 *   - A relative-time label (mono, dim)
 *   - A description in Playfair (the editorial body face)
 *
 * Optional `href` on each entry renders as a Link so members can jump to
 * the related area of the site (e.g. a micro-reading entry → Atlas hub).
 *
 * Empty state: a quiet paragraph inviting the member to begin.
 */

interface Props {
  items: RecentActivityItem[];
}

const ICON_MAP: Record<
  RecentActivityType,
  { Icon: typeof CalendarCheck; tone: string }
> = {
  "session-completed": { Icon: CalendarCheck, tone: "text-[#c9a96e]" },
  "session-booked": { Icon: CalendarPlus, tone: "text-[#a58a54]" },
  "micro-reading": { Icon: Sparkles, tone: "text-[#c9a96e]" },
  "chart-analysis": { Icon: BookOpen, tone: "text-[#e2c98f]" },
  portrait: { Icon: ImageIcon, tone: "text-[#8a7350]" },
  "journal-entry": { Icon: PenLine, tone: "text-[#c9a96e]" },
  "course-enrolled": { Icon: Mail, tone: "text-[#a58a54]" },
  "course-completed": { Icon: MailCheck, tone: "text-[#c9a96e]" },
  "ai-conversation": { Icon: MessageSquare, tone: "text-[#8a7350]" },
};

export default function ActivityTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
        <p className="text-base text-[#9a9a9a] font-light leading-[1.8] max-w-md">
          No activity yet. As you complete sessions, write journal entries,
          and identify patterns, the timeline of your journey will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical rail */}
      <span
        aria-hidden
        className="absolute left-[15px] sm:left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#c9a96e]/30 via-white/[0.06] to-transparent"
      />

      <ol className="space-y-1">
        {items.map((item, idx) => {
          const { Icon, tone } = ICON_MAP[item.type] || {
            Icon: Sparkles,
            tone: "text-[#9a9a9a]",
          };
          const inner = (
            <motion.li
              key={`${item.type}-${idx}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.45,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.04 * idx,
              }}
              className="relative flex items-start gap-4 sm:gap-5 py-3.5 group"
            >
              {/* Dot + icon container */}
              <div className="relative flex-shrink-0 z-10">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[#c9a96e]/10 blur-[3px] group-hover:bg-[#c9a96e]/20 transition-colors"
                />
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#c9a96e]/30 bg-[#050505] flex items-center justify-center">
                  <Icon
                    className={`size-3.5 sm:size-4 ${tone}`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1.5 sm:pt-2">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="text-sm sm:text-base font-serif text-[#f0eee9] font-light leading-snug">
                    {item.description}
                  </p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#5a5a5a] font-mono whitespace-nowrap">
                    {formatRelative(item.date)}
                  </p>
                </div>
                <p className="mt-0.5 text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
                  {labelFor(item.type)}
                </p>
              </div>
            </motion.li>
          );

          if (item.href) {
            return (
              <Link
                key={`${item.type}-${idx}`}
                href={item.href}
                className="block hover:bg-white/[0.015] -mx-3 px-3 rounded transition-colors"
              >
                {inner}
              </Link>
            );
          }
          return inner;
        })}
      </ol>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function labelFor(type: RecentActivityType): string {
  switch (type) {
    case "session-completed":
      return "Session";
    case "session-booked":
      return "Booking";
    case "micro-reading":
      return "Micro-reading";
    case "chart-analysis":
      return "Chart";
    case "portrait":
      return "Portrait";
    case "journal-entry":
      return "Journal";
    case "course-enrolled":
      return "Course";
    case "course-completed":
      return "Course";
    case "ai-conversation":
      return "AI chat";
    default:
      return "";
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - d) / 1000));
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWk = Math.floor(diffDay / 7);
    if (diffWk < 5) return `${diffWk}w ago`;
    // Fall back to absolute date for older entries.
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}
