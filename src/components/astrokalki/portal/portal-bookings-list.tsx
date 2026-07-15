"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useState } from "react";

interface PortalBookingsListProps {
  email: string;
  bookings: Array<{
    id: string;
    name: string;
    duration: number;
    price: string;
    status: string;
    scheduledAt: string | null;
    roomUrl: string | null;
    createdAt: string;
  }>;
}

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

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-[#c9a96e] bg-[#c9a96e]/10 border-[#c9a96e]/20",
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  cancelled: "text-[#c0392b] bg-[#c0392b]/10 border-[#c0392b]/20",
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

export default function PortalBookingsList({
  email,
  bookings,
}: PortalBookingsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  const handleCopy = async (url: string, id: string) => {
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
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderBooking = (booking: typeof bookings[0], index: number) => (
    <motion.div
      key={booking.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-editorial text-sm text-[#f0eee9]">
            {booking.duration} Minute Session
          </p>
          <p className="text-body-cinematic text-xs text-[#9a9a9a] mt-1">
            {booking.scheduledAt
              ? formatDateTime(booking.scheduledAt)
              : formatDate(booking.createdAt)}
          </p>
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded border ${STATUS_STYLES[booking.status] || STATUS_STYLES.pending}`}
        >
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>

      {booking.roomUrl && (booking.status === "confirmed" || booking.status === "completed") && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
          <a
            href={booking.roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a96e]/10 text-[#c9a96e] rounded-lg text-xs hover:bg-[#c9a96e]/20 transition-colors"
          >
            <ExternalLink className="size-3" />
            Join Session
          </a>
          <button
            onClick={() => handleCopy(booking.roomUrl!, booking.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#9a9a9a] hover:text-[#f0eee9] text-xs transition-colors"
          >
            {copiedId === booking.id ? (
              <CheckCircle2 className="size-3 text-emerald-400" />
            ) : (
              <Copy className="size-3" />
            )}
            {copiedId === booking.id ? "Copied" : "Copy Link"}
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="size-10 text-[#333] mx-auto mb-3" />
          <p className="text-body-cinematic text-sm text-[#9a9a9a]">
            No sessions yet. Book your first session to get started.
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
                Upcoming Sessions
              </h3>
              <div className="space-y-3">
                {upcoming.map((b, i) => renderBooking(b, i))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
                Past Sessions
              </h3>
              <div className="space-y-3">
                {past.map((b, i) => renderBooking(b, i))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
