import Link from "next/link";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import SlotManager from "./SlotManager";
import SlotList, { type SlotRow } from "./SlotList";

export const dynamic = "force-dynamic";

/**
 * /admin/slots
 *
 * Server component. Fetches all availability slots (with their linked
 * bookings), groups them by day for display, and renders:
 *   1. Header (back-link, title, refresh)
 *   2. Summary stats (total / open / booked / past)
 *   3. SlotManager (client — bulk + single creation)
 *   4. SlotList (client — interactive grid with delete + filter)
 *
 * Auth is enforced by middleware on the /admin/* path, so this server
 * component can read directly from the database without re-checking.
 */

function serializeSlot(s: {
  id: string;
  start: Date;
  end: Date;
  duration: number;
  status: string;
  bookingId: string | null;
  booking: {
    id: string;
    name: string;
    email: string;
    duration: number;
    price: string;
    status: string;
  } | null;
}): SlotRow {
  return {
    id: s.id,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    duration: s.duration,
    status: s.status,
    bookingId: s.bookingId,
    booking: s.booking
      ? {
          id: s.booking.id,
          name: s.booking.name,
          email: s.booking.email,
          duration: s.booking.duration,
          price: s.booking.price,
          status: s.booking.status,
        }
      : null,
  };
}

export default async function AdminSlotsPage() {
  // Pull all slots (no pagination — even a busy practitioner is unlikely
  // to exceed a few hundred open slots, and we want the full picture here).
  const rawSlots = await db.availabilitySlot.findMany({
    orderBy: { start: "asc" },
    include: {
      booking: {
        select: {
          id: true,
          name: true,
          email: true,
          duration: true,
          price: true,
          status: true,
        },
      },
    },
    take: 1000,
  });

  const slots = rawSlots.map(serializeSlot);

  // Stats
  const now = Date.now();
  const total = slots.length;
  const open = slots.filter((s) => s.status === "open").length;
  const booked = slots.filter((s) => s.status === "booked").length;
  const held = slots.filter((s) => s.status === "held").length;
  const upcoming = slots.filter((s) => new Date(s.start).getTime() > now).length;
  const past = slots.filter((s) => new Date(s.end).getTime() <= now).length;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#050505]/85 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link
              href="/admin"
              className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="size-3.5" />
              Back to /admin
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/slots"
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-3 py-1.5 hover:bg-[#c9a96e]/10 transition-colors"
              >
                <RefreshCw className="size-3" />
                <span className="hidden sm:inline">Refresh</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Title block */}
        <div className="mb-12 sm:mb-16">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Admin · Schedule
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4 font-serif font-light">
            Availability calendar
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed font-light">
            Generate the times you'll hold. Each open slot is bookable from the homepage.
            Booked slots link back to the booking record; past slots stay visible for reference.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-10">
          <StatTile label="Total" value={total} />
          <StatTile label="Open" value={open} accent="emerald" />
          <StatTile label="Booked" value={booked} accent="gold" />
          <StatTile label="Held" value={held} accent="yellow" />
          <StatTile label="Upcoming" value={upcoming} />
          <StatTile label="Past" value={past} muted />
        </div>

        {/* Generator */}
        <div className="mb-10">
          <SlotManager />
        </div>

        {/* Slot grid */}
        <SlotList initialSlots={slots} />

        {/* Footer hint */}
        <div className="mt-16 pt-6 border-t border-white/[0.04] flex items-center gap-2 text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase font-light">
          <Calendar className="size-3.5 text-[#c9a96e]/60" />
          Times shown in IST (Asia/Kolkata)
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase font-light">
            AstroKalki · Schedule Manager
          </p>
          <Link
            href="/admin"
            className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3" />
            Back to admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── Stat tile ───────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "gold" | "yellow";
  muted?: boolean;
}) {
  const valueColor =
    accent === "emerald"
      ? "text-emerald-400/80"
      : accent === "gold"
      ? "text-[#c9a96e]"
      : accent === "yellow"
      ? "text-yellow-400/80"
      : muted
      ? "text-[#7a7a7a]"
      : "text-[#f0eee9]";
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-500 p-4 sm:p-5">
      <p className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] mb-2 font-light">
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-serif font-light ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
