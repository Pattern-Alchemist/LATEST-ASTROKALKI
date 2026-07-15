import Link from "next/link";
import { ArrowLeft, RefreshCw, Disc3, Clock, LinkIcon, Unlink } from "lucide-react";
import { db } from "@/lib/db";
import RecordingManager from "./RecordingManager";
import RecordingsTable, { type RecordingRow } from "./RecordingsTable";

export const dynamic = "force-dynamic";

/**
 * /admin/recordings — recorded session audio management.
 *
 * Server component. Reads recordings directly from the database (auth is
 * enforced by middleware on the /admin/* path). Renders:
 *   1. Sticky header (back-link, title, refresh)
 *   2. Stat tiles (total / total duration / unattached)
 *   3. Filter tabs (all / attached / unattached) as server-rendered Links
 *   4. RecordingManager (client — upload form with booking picker)
 *   5. RecordingsTable (client — play/edit/delete actions)
 *
 * Visual language matches /admin/leads and /admin/testimonials: dark
 * editorial cards, gold #c9a96e accent, monospace IDs, text-link buttons.
 */

type AttachmentFilter = "all" | "attached" | "unattached";

const FILTER_TABS: { id: AttachmentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attached", label: "Attached" },
  { id: "unattached", label: "Unattached" },
];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(iso: Date | string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RawRecording {
  id: string;
  title: string;
  duration: number;
  price: string;
  audioUrl: string;
  bookingId: string | null;
  createdAt: Date;
  booking: {
    id: string;
    name: string;
    email: string;
    duration: number;
    price: string;
    status: string;
  } | null;
}

function serialize(r: RawRecording): RecordingRow {
  return {
    id: r.id,
    title: r.title,
    duration: r.duration,
    price: r.price,
    audioUrl: r.audioUrl,
    bookingId: r.bookingId,
    createdAt: r.createdAt.toISOString(),
    booking: r.booking
      ? {
          id: r.booking.id,
          name: r.booking.name,
          email: r.booking.email,
          duration: r.booking.duration,
          price: r.booking.price,
          status: r.booking.status,
        }
      : null,
  };
}

export default async function AdminRecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filterParam = (sp.filter || "all") as AttachmentFilter;
  const activeFilter: AttachmentFilter = FILTER_TABS.some(
    (t) => t.id === filterParam
  )
    ? filterParam
    : "all";

  // ─── Parallel data fetch ─────────────────────────────────────────────
  const where =
    activeFilter === "attached"
      ? { bookingId: { not: null } }
      : activeFilter === "unattached"
        ? { bookingId: null }
        : {};

  let recordings: RecordingRow[] = [];
  let totalAll = 0;
  let totalUnattached = 0;
  let totalDurationMinutes = 0;
  let attachedCount = 0;

  try {
    const [rows, allCount, unattachedCount, allWithDuration] =
      await Promise.all([
        db.recordedReading.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 200,
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
        }),
        db.recordedReading.count(),
        db.recordedReading.count({ where: { bookingId: null } }),
        db.recordedReading.aggregate({ _sum: { duration: true } }),
      ]);

    recordings = (rows as RawRecording[]).map(serialize);
    totalAll = allCount;
    totalUnattached = unattachedCount;
    totalDurationMinutes = allWithDuration._sum.duration || 0;
    attachedCount = allCount - unattachedCount;
  } catch (err) {
    console.error("Admin recordings page query error:", err);
  }

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
            <Link
              href="/admin/recordings"
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-3 py-1.5 hover:bg-[#c9a96e]/10 transition-colors"
            >
              <RefreshCw className="size-3" />
              <span className="hidden sm:inline">Refresh</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Title block */}
        <div className="mb-10 sm:mb-14">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Admin · Recordings
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4 font-serif font-light">
            Recorded sessions
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Upload session audio, attach it to a booking, and the client can
            securely stream it from their account. Unattached recordings stay
            admin-only until linked.
          </p>
        </div>

        {/* ─── Stat tiles ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-10">
          <StatTile
            label="Total recordings"
            value={String(totalAll)}
            icon={<Disc3 className="size-3.5 text-[#c9a96e]/60" />}
          />
          <StatTile
            label="Total duration"
            value={formatDuration(totalDurationMinutes)}
            icon={<Clock className="size-3.5 text-[#c9a96e]/60" />}
          />
          <StatTile
            label="Unattached"
            value={String(totalUnattached)}
            icon={<Unlink className="size-3.5 text-[#c9a96e]/60" />}
            highlight={totalUnattached > 0}
          />
        </div>

        {/* ─── Filter tabs ───────────────────────────────────────── */}
        <div className="flex gap-2 mb-8 border-b border-white/[0.06] overflow-x-auto">
          {FILTER_TABS.map((t) => {
            const count =
              t.id === "all"
                ? totalAll
                : t.id === "attached"
                  ? attachedCount
                  : totalUnattached;
            const isActive = activeFilter === t.id;
            return (
              <Link
                key={t.id}
                href={`/admin/recordings?filter=${t.id}`}
                className={`px-4 py-3 text-[11px] tracking-[0.25em] uppercase font-light transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "border-[#c9a96e] text-[#c9a96e]"
                    : "border-transparent text-[#7a7a7a] hover:text-[#f0eee9]"
                }`}
              >
                {t.id === "attached" && <LinkIcon className="size-3" />}
                {t.id === "unattached" && <Unlink className="size-3" />}
                {t.label}
                <span
                  className={`ml-1 text-[10px] ${isActive ? "text-[#c9a96e]" : "text-[#5a5a5a]"}`}
                >
                  ({count})
                </span>
              </Link>
            );
          })}
        </div>

        {/* ─── Upload manager ────────────────────────────────────── */}
        <div className="mb-10">
          <RecordingManager />
        </div>

        {/* ─── Recordings table ──────────────────────────────────── */}
        <RecordingsTable
          recordings={recordings}
          emptyFilter={activeFilter}
        />

        {/* ─── Footer help ───────────────────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-white/[0.04]">
          <p className="text-[11px] text-[#5a5a5a] leading-relaxed max-w-2xl">
            <span className="text-[#c9a96e]">Tip:</span> Audio files live in{" "}
            <code className="text-[#9a9a9a] font-mono">public/recordings/</code>{" "}
            and are served only through the signed-token endpoint{" "}
            <code className="text-[#9a9a9a] font-mono">
              /api/recordings/&lt;id&gt;?token=...
            </code>{" "}
            — never linked directly. Tokens expire after 24 hours and are
            issued only when the requester&apos;s email matches the booking.
          </p>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase font-light">
            AstroKalki · Recordings Manager
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

/* ─── Stat tile ───────────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-[#0a0a0a] border transition-all duration-500 p-4 sm:p-5 ${
        highlight
          ? "border-[#c9a96e]/40 hover:border-[#c9a96e]/60"
          : "border-white/[0.04] hover:border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] font-light">
          {label}
        </p>
      </div>
      <p
        className={`text-2xl sm:text-3xl font-serif font-light ${
          highlight ? "text-[#c9a96e]" : "text-[#f0eee9]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
