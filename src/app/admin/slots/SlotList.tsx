"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

/**
 * SlotList — admin client component rendering the slot grid with
 * interactive delete + status-filter controls.
 *
 * Receives the server-rendered slot list as props (already serialized
 * to plain JSON). After deleting, calls router.refresh() so the server
 * component re-fetches and re-renders the latest state.
 */

export interface SlotBookingSummary {
  id: string;
  name: string;
  email: string;
  duration: number;
  price: string;
  status: string;
}

export interface SlotRow {
  id: string;
  start: string; // ISO
  end: string;   // ISO
  duration: number;
  status: string; // open | held | booked
  bookingId: string | null;
  booking: SlotBookingSummary | null;
}

type StatusFilter = "all" | "open" | "held" | "booked";

const STATUS_COLORS: Record<string, string> = {
  open: "text-emerald-400/80",
  held: "text-yellow-400/80",
  booked: "text-[#c9a96e]",
};

const STATUS_BG: Record<string, string> = {
  open: "bg-emerald-400/[0.04]",
  held: "bg-yellow-400/[0.04]",
  booked: "bg-[#c9a96e]/[0.05]",
};

function formatTime(iso: string): string {
  // Render in IST for admin consistency.
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatDateHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function dateKey(iso: string): string {
  // Group by calendar day in IST.
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 330 * 60_000); // shift to IST wall clock
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
}

export default function SlotList({ initialSlots }: { initialSlots: SlotRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return initialSlots;
    return initialSlots.filter((s) => s.status === filter);
  }, [initialSlots, filter]);

  // Group by date (IST day).
  const grouped = useMemo(() => {
    const map = new Map<string, SlotRow[]>();
    for (const s of filtered) {
      const key = dateKey(s.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort each day's slots by start time.
    for (const arr of map.values()) {
      arr.sort((a, b) => a.start.localeCompare(b.start));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { all: initialSlots.length, open: 0, held: 0, booked: 0 };
    for (const s of initialSlots) c[s.status as keyof typeof c]++;
    return c;
  }, [initialSlots]);

  const handleDelete = async (id: string) => {
    setError(null);
    if (!confirm("Delete this open slot?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/slots/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete slot.");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error. Please retry.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.04] pb-3">
        {([
          { id: "all", label: "All", count: counts.all },
          { id: "open", label: "Open", count: counts.open },
          { id: "held", label: "Held", count: counts.held },
          { id: "booked", label: "Booked", count: counts.booked },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-2 text-[11px] tracking-[0.25em] uppercase font-light transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              filter === t.id
                ? "border-[#c9a96e] text-[#c9a96e]"
                : "border-transparent text-[#7a7a7a] hover:text-[#f0eee9]"
            }`}
          >
            {t.label}
            <span className="text-[10px] text-[#5a5a5a]">({t.count})</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3">
          {error}
        </p>
      )}

      {grouped.length === 0 ? (
        <div className="py-20 text-center border border-white/[0.04] bg-[#0a0a0a]/40">
          <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
            No slots match this filter. Use the generator above to open new times.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([dateKey, slots]) => (
            <div key={dateKey}>
              {/* Day header */}
              <div className="flex items-baseline gap-4 mb-3 pb-2 border-b border-white/[0.04]">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] font-light">
                  {formatDateHeader(slots[0].start)}
                </p>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light">
                  {slots.length} slot{slots.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Slot rows */}
              <div className="divide-y divide-white/[0.03]">
                {slots.map((slot) => (
                  <SlotRowItem
                    key={slot.id}
                    slot={slot}
                    deleting={deletingId === slot.id}
                    onDelete={() => handleDelete(slot.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlotRowItem({
  slot,
  deleting,
  onDelete,
}: {
  slot: SlotRow;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isPast = new Date(slot.end).getTime() <= Date.now();
  const isBooked = slot.status === "booked";
  const isOpen = slot.status === "open";

  return (
    <div
      className={`grid grid-cols-12 gap-3 items-center px-3 py-3 hover:bg-white/[0.015] transition-colors ${
        STATUS_BG[slot.status] || ""
      }`}
    >
      {/* Time */}
      <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
        <Clock className="size-3.5 text-[#5a5a5a]" />
        <span className="font-mono text-sm text-[#f0eee9] font-light">
          {formatTime(slot.start)}
        </span>
        <span className="text-[10px] text-[#5a5a5a]">→</span>
        <span className="font-mono text-xs text-[#7a7a7a]">
          {formatTime(slot.end)}
        </span>
      </div>

      {/* Duration */}
      <div className="col-span-6 sm:col-span-2">
        <span className="text-xs text-[#9a9a9a] font-light">{slot.duration} min</span>
      </div>

      {/* Status */}
      <div className="col-span-6 sm:col-span-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase ${
            STATUS_COLORS[slot.status] || "text-[#9a9a9a]"
          }`}
        >
          {isOpen ? (
            <Circle className="size-3" />
          ) : isBooked ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Clock className="size-3" />
          )}
          {slot.status}
          {isPast && !isBooked && (
            <span className="text-[#5a5a5a] normal-case tracking-normal text-[10px]">
              · past
            </span>
          )}
        </span>
      </div>

      {/* Booking link */}
      <div className="col-span-10 sm:col-span-3">
        {isBooked && slot.booking ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-[#f0eee9] hover:text-[#c9a96e] transition-colors font-light"
            title="Open booking in /admin (search by email)"
          >
            <span className="truncate max-w-[12rem]">
              {slot.booking.name}
            </span>
            <span className="text-[#5a5a5a]">·</span>
            <span className="text-[#7a7a7a] truncate max-w-[10rem]">
              {slot.booking.email}
            </span>
            <ExternalLink className="size-3 text-[#5a5a5a]" />
          </Link>
        ) : (
          <span className="text-[#3a3a3a] text-xs font-light">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-2 sm:col-span-2 flex justify-end">
        {isOpen && !isPast && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-[#5a5a5a] hover:text-red-400 transition-colors disabled:opacity-40"
            title="Delete open slot"
            aria-label="Delete slot"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
