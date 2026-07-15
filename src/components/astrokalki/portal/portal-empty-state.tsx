"use client";

/**
 * PortalEmptyState — shown when a portal section has no data.
 * Supports different empty states for no sessions, no bundles, no notes, etc.
 */

import { motion } from "framer-motion";
import {
  Calendar,
  Package,
  StickyNote,
  Search,
  type LucideIcon,
} from "lucide-react";

type EmptyVariant = "sessions" | "bundles" | "notes" | "search" | "default";

const VARIANT_CONFIG: Record<
  EmptyVariant,
  { icon: LucideIcon; title: string; description: string; action?: string }
> = {
  sessions: {
    icon: Calendar,
    title: "No sessions yet",
    description: "Book your first session to begin your pattern journey.",
    action: "Book a Session",
  },
  bundles: {
    icon: Package,
    title: "No active bundles",
    description:
      "Purchase a session pack to continue your journey at your own pace.",
    action: "View Bundles",
  },
  notes: {
    icon: StickyNote,
    title: "No notes yet",
    description:
      "Start adding reflections and questions after your first session.",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search or filter criteria.",
  },
  default: {
    icon: StickyNote,
    title: "Nothing here yet",
    description: "Check back later or explore other sections of your portal.",
  },
};

interface PortalEmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PortalEmptyState({
  variant = "default",
  title,
  description,
  actionLabel,
  onAction,
}: PortalEmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center py-16 px-6"
    >
      <config.icon className="size-10 text-[#333] mx-auto mb-4" />
      <h3 className="text-editorial text-sm text-[#f0eee9] mb-2">
        {title || config.title}
      </h3>
      <p className="text-body-cinematic text-xs text-[#9a9a9a] max-w-xs mx-auto mb-6">
        {description || config.description}
      </p>
      {(actionLabel || config.action) && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-[#c9a96e]/10 text-[#c9a96e] rounded-lg text-xs font-medium hover:bg-[#c9a96e]/20 transition-colors border border-[#c9a96e]/20"
        >
          {actionLabel || config.action}
        </button>
      )}
    </motion.div>
  );
}
