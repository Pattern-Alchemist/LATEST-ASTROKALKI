"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Trash2,
  Loader2,
  Music,
  Clock,
  Mail,
  LinkIcon,
  Unlink,
  Check,
} from "lucide-react";
import RecordingPlayer from "./RecordingPlayer";
import BookingSelector, { type BookingPick } from "./BookingSelector";

/**
 * RecordingsTable — admin client component for the recordings list.
 *
 * Renders each recording as an expandable row. Click Play → expands an
 * inline RecordingPlayer. Click Edit → inline edit form (title / duration
 * / price / booking). Click Delete → confirm → DELETE → router.refresh().
 *
 * All mutations go through /api/admin/recordings (auth-gated). After
 * success we call router.refresh() so the server component re-renders
 * with fresh data.
 *
 * The inline edit form uses the BookingSelector component for the booking
 * picker (shared with RecordingManager) — keeps the searchable combobox
 * logic DRY.
 */

export interface RecordingBooking {
  id: string;
  name: string;
  email: string;
  duration: number;
  price: string;
  status: string;
}

export interface RecordingRow {
  id: string;
  title: string;
  duration: number;
  price: string;
  audioUrl: string;
  bookingId: string | null;
  createdAt: string;
  booking: RecordingBooking | null;
}

interface Props {
  recordings: RecordingRow[];
  emptyFilter: "all" | "attached" | "unattached";
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function RecordingsTable({
  recordings,
  emptyFilter,
}: Props) {
  if (recordings.length === 0) {
    return (
      <div className="border border-white/[0.04] bg-[#0a0a0a]/40 py-20 text-center">
        <Music className="size-8 text-[#333] mx-auto mb-3" />
        <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
          {emptyFilter === "attached"
            ? "No recordings are currently attached to a booking. Upload one and pick a booking to attach it."
            : emptyFilter === "unattached"
              ? "No unattached recordings. Every recording is linked to a booking."
              : "No recordings yet. Upload your first session audio above."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recordings.map((r) => (
        <RecordingRowItem
          key={r.id}
          recording={r}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
}

/* ─── Single row ──────────────────────────────────────────────────── */

function RecordingRowItem({
  recording,
  formatDate,
}: {
  recording: RecordingRow;
  formatDate: (d: Date | string) => string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (
      !confirm(
        `Delete "${recording.title}"? This removes the record and the audio file.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/recordings/${recording.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="border border-white/[0.04] bg-[#0a0a0a]/40 hover:border-white/[0.08] transition-colors duration-500">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 px-5 sm:px-6 pt-5 pb-3 text-[10px] tracking-[0.2em] uppercase font-light">
        <span
          className={`inline-flex items-center gap-1.5 ${
            recording.booking ? "text-emerald-400/70" : "text-yellow-400/60"
          }`}
        >
          {recording.booking ? (
            <>
              <LinkIcon className="size-3" />
              Attached
            </>
          ) : (
            <>
              <Unlink className="size-3" />
              Unattached
            </>
          )}
        </span>
        <span className="text-[#5a5a5a] font-mono normal-case tracking-normal">
          {recording.id}
        </span>
        <span className="text-[#5a5a5a] inline-flex items-center gap-1 normal-case tracking-wider">
          <Clock className="size-3" />
          {formatDate(recording.createdAt)}
        </span>
      </div>

      {/* Title + main info */}
      <div className="px-5 sm:px-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg text-[#f0eee9] font-serif font-light leading-snug">
              {recording.title}
            </h3>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#7a7a7a] font-light">
              <span className="inline-flex items-center gap-1">
                <Music className="size-3" />
                {formatDuration(recording.duration)}
              </span>
              <span className="text-[#c9a96e]">{recording.price}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => {
                setExpanded((v) => !v);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase font-light text-[#c9a96e] border-b border-transparent hover:border-current pb-0.5 transition-colors"
            >
              <Play className="size-3" />
              {expanded ? "Hide" : "Play"}
            </button>
            <button
              onClick={() => {
                setEditing((v) => !v);
                setExpanded(false);
              }}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase font-light text-[#7a7a7a] hover:text-[#f0eee9] border-b border-transparent hover:border-current pb-0.5 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase font-light text-red-400/60 hover:text-red-400 border-b border-transparent hover:border-current pb-0.5 transition-colors disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
              Delete
            </button>
          </div>
        </div>

        {/* Booking reference */}
        {recording.booking ? (
          <div className="flex items-center gap-2 text-[11px] text-[#9a9a9a] font-light">
            <LinkIcon className="size-3 text-[#c9a96e]/60" />
            <span className="text-[#cfcabf]">{recording.booking.name}</span>
            <span className="text-[#5a5a5a]">·</span>
            <a
              href={`mailto:${recording.booking.email}`}
              className="inline-flex items-center gap-1 text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
            >
              <Mail className="size-3" />
              {recording.booking.email}
            </a>
            <span className="text-[#5a5a5a]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {recording.booking.status}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-[#5a5a5a] font-light italic">
            Not yet attached to a booking. Use Edit to link one.
          </p>
        )}

        {error && (
          <p className="mt-3 text-[11px] text-red-400/80 font-light border-l-2 border-red-400/40 pl-3">
            {error}
          </p>
        )}
      </div>

      {/* Expanded player */}
      {expanded && (
        <div className="px-5 sm:px-6 pb-5 border-t border-white/[0.04] pt-4">
          <RecordingPlayer
            id={recording.id}
            audioUrl={recording.audioUrl}
            title={recording.title}
            durationMinutes={recording.duration}
            bookingEmail={recording.booking?.email}
          />
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div className="px-5 sm:px-6 pb-5 border-t border-white/[0.04] pt-4">
          <EditForm
            recording={recording}
            onDone={() => {
              setEditing(false);
              router.refresh();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </article>
  );
}

/* ─── Inline edit form ────────────────────────────────────────────── */

function EditForm({
  recording,
  onDone,
  onCancel,
}: {
  recording: RecordingRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(recording.title);
  const [duration, setDuration] = useState(recording.duration);
  const [price, setPrice] = useState(recording.price);
  // RecordingBooking → BookingPick (BookingSelector's interface is a
  // superset; we just add the null fields the picker doesn't read).
  const initialBooking: BookingPick | null = recording.booking
    ? {
        id: recording.booking.id,
        name: recording.booking.name,
        email: recording.booking.email,
        duration: recording.booking.duration,
        price: recording.booking.price,
        status: recording.booking.status,
        scheduledAt: null,
        createdAt: recording.createdAt,
      }
    : null;
  const [booking, setBooking] = useState<BookingPick | null>(initialBooking);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/recordings/${recording.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          duration,
          price: price.trim(),
          bookingId: booking?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] font-light">
        Edit recording
      </p>

      <div>
        <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1.5 block font-light">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-1.5 text-sm text-[#f0eee9] font-light transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1.5 block font-light">
            Duration (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) =>
              setDuration(
                Math.max(1, Math.min(600, Number(e.target.value) || 1))
              )
            }
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-1.5 text-sm text-[#f0eee9] font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-1.5 block font-light">
            Price
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-1.5 text-sm text-[#f0eee9] font-light transition-colors"
          />
        </div>
      </div>

      {/* Booking picker — shared component with RecordingManager */}
      <BookingSelector
        label="Attached booking"
        value={booking}
        onChange={setBooking}
        disabled={saving}
        compact
      />

      {error && (
        <p className="text-[11px] text-red-400/80 font-light border-l-2 border-red-400/40 pl-3">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b97e] px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Check className="size-3" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
