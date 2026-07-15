"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  X,
  Check,
  Clock,
  Music,
} from "lucide-react";
import BookingSelector, { type BookingPick } from "./BookingSelector";

/**
 * RecordingManager — admin client component for uploading a new recording.
 *
 * Two-step flow on submit:
 *   1) POST the audio file to /api/admin/recordings/upload → returns { url }.
 *   2) POST { title, duration, price, bookingId, audioUrl } to
 *      /api/admin/recordings → creates the DB row.
 *
 * The booking picker is the BookingSelector component (shadcn Command +
 * Popover combobox with debounced server-side search via
 * /api/admin/bookings?search=). The full bookings table is too large to
 * ship to the client, so we search server-side.
 *
 * Upload progress is shown via XHR onprogress so the admin sees the bytes
 * move for large 50MB files.
 */

const DURATION_PRESETS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
  { value: 120, label: "120 min" },
];

const MAX_MB = 50;
const ACCEPTED = ".mp3,.m4a,.wav,.ogg,.flac,.aac,audio/*";

type Stage = "idle" | "uploading" | "saving" | "done";

export default function RecordingManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0); // 0..100 (upload bytes)
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [price, setPrice] = useState("₹1,999");
  const [booking, setBooking] = useState<BookingPick | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Reset ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDuration(60);
    setPrice("₹1,999");
    setBooking(null);
    setProgress(0);
    setError(null);
    setStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── File picker ─────────────────────────────────────────────────────
  const onFilePicked = (f: File | null) => {
    if (!f) return;
    // Client-side size check (server will re-enforce).
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is ${(f.size / 1024 / 1024).toFixed(1)} MB — max is ${MAX_MB} MB.`);
      return;
    }
    // Auto-fill the title from the filename on first pick.
    setFile(f);
    if (!title) {
      // Strip extension, replace separators with spaces, title-case.
      const base = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      setTitle(base);
    }
    setError(null);
  };

  // ─── Drag-and-drop ───────────────────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] || null;
    if (f) onFilePicked(f);
  };

  // ─── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);

    if (!file) {
      setError("Pick an audio file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Give the recording a title.");
      return;
    }
    if (!price.trim()) {
      setError("Set a price (even ₹0 is fine).");
      return;
    }

    setStage("uploading");
    setProgress(0);

    try {
      // ─── Step 1: upload file via XHR for progress ────────────────────
      const uploadUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/recordings/upload");
        xhr.responseType = "json";

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = xhr.response as { url?: string; error?: string };
            if (data.url) resolve(data.url);
            else reject(new Error(data.error || "Upload failed"));
          } else {
            const data = xhr.response as { error?: string };
            reject(new Error(data?.error || `Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        const fd = new FormData();
        fd.append("audio", file);
        xhr.send(fd);
      });

      // ─── Step 2: save metadata ───────────────────────────────────────
      setStage("saving");
      const metaRes = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          duration,
          price: price.trim(),
          bookingId: booking?.id || null,
          audioUrl: uploadUrl,
        }),
      });
      const meta = await metaRes.json();
      if (!metaRes.ok) {
        // Best-effort cleanup of the orphaned uploaded file is the
        // admin's job — the file lives at the returned URL but no row
        // references it. We surface the error and let them retry.
        throw new Error(meta.error || "Failed to save recording metadata");
      }

      setStage("done");
      // Refresh server-rendered table.
      router.refresh();

      // Auto-close after a brief "done" pause.
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      setStage("idle");
      setProgress(0);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────
  const busy = stage === "uploading" || stage === "saving";

  return (
    <div className="border border-white/[0.04] bg-[#0a0a0a]/40">
      {/* Header row */}
      <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light">
            Upload a recording
          </p>
          <p className="text-[#cfcabf] text-sm sm:text-base font-serif font-light italic">
            “The session ends. The pattern keeps speaking.”
          </p>
        </div>
        <button
          onClick={() => {
            if (busy) return;
            setOpen((v) => !v);
          }}
          disabled={busy}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {open ? <X className="size-3.5" /> : <Upload className="size-3.5" />}
          {open ? "Close" : "Upload new"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6 space-y-6">
              {/* ─── File picker ─────────────────────────────────────── */}
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                  Audio file
                  <span className="text-[#5a5a5a] ml-2 normal-case tracking-normal">
                    (mp3 / m4a / wav · up to {MAX_MB} MB)
                  </span>
                </label>

                {file ? (
                  <div className="flex items-center gap-3 border border-[#c9a96e]/30 bg-[#c9a96e]/5 p-3">
                    <Music className="size-5 text-[#c9a96e] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#f0eee9] font-light truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-[#7a7a7a] font-mono">
                        {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                        {file.type || "audio"}
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      disabled={busy}
                      className="text-[#5a5a5a] hover:text-red-400 transition-colors p-1 disabled:opacity-30"
                      aria-label="Remove file"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={`group flex flex-col items-center justify-center border border-dashed py-10 px-6 cursor-pointer transition-colors ${
                      dragOver
                        ? "border-[#c9a96e] bg-[#c9a96e]/5"
                        : "border-white/[0.1] hover:border-[#c9a96e]/40 bg-[#050505]/40"
                    }`}
                  >
                    <Upload
                      className={`size-6 mb-3 transition-colors ${
                        dragOver
                          ? "text-[#c9a96e]"
                          : "text-[#5a5a5a] group-hover:text-[#c9a96e]"
                      }`}
                    />
                    <span className="text-sm text-[#9a9a9a] font-light">
                      {dragOver
                        ? "Drop the file to upload"
                        : "Click to choose — or drag an audio file here"}
                    </span>
                    <span className="text-[11px] text-[#5a5a5a] mt-1">
                      mp3, m4a, wav, ogg, flac, aac — max {MAX_MB} MB
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED}
                      className="sr-only"
                      onChange={(e) =>
                        onFilePicked(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                )}
              </div>

              {/* ─── Title ─────────────────────────────────────────────── */}
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Relationship decode — 18 Jan"
                  disabled={busy}
                  className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-2 text-base text-[#f0eee9] font-light placeholder:text-[#3a3a3a] transition-colors"
                />
              </div>

              {/* ─── Duration + Price ──────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                    Duration (minutes)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {DURATION_PRESETS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDuration(d.value)}
                        disabled={busy}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase border transition-colors ${
                          duration === d.value
                            ? "border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/5"
                            : "border-white/[0.08] text-[#7a7a7a] hover:text-[#f0eee9]"
                        }`}
                      >
                        <Clock className="size-3" />
                        {d.label}
                      </button>
                    ))}
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
                      disabled={busy}
                      className="w-20 bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-1.5 text-sm text-[#f0eee9] font-mono text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                    Price
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="₹1,999"
                    disabled={busy}
                    className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 outline-none py-2 text-base text-[#f0eee9] font-light placeholder:text-[#3a3a3a] transition-colors"
                  />
                </div>
              </div>

              {/* ─── Booking picker ────────────────────────────────────── */}
              <BookingSelector
                label="Attach to booking"
                value={booking}
                onChange={setBooking}
                disabled={busy}
              />

              {/* ─── Error ─────────────────────────────────────────────── */}
              {error && (
                <p className="text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3">
                  {error}
                </p>
              )}

              {/* ─── Progress ──────────────────────────────────────────── */}
              {(stage === "uploading" || stage === "saving") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] font-light">
                    <span>
                      {stage === "uploading"
                        ? "Uploading audio…"
                        : "Saving recording metadata…"}
                    </span>
                    {stage === "uploading" && (
                      <span className="font-mono text-[#c9a96e]">{progress}%</span>
                    )}
                  </div>
                  <div className="h-1 bg-white/[0.04] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#a58a54] to-[#c9a96e]"
                      initial={false}
                      animate={{
                        width:
                          stage === "uploading"
                            ? `${progress}%`
                            : stage === "saving"
                              ? "100%"
                              : "0%",
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* ─── Done state ────────────────────────────────────────── */}
              {stage === "done" && (
                <div className="flex items-center gap-2 border-l-2 border-emerald-400/50 pl-3 py-1">
                  <Check className="size-4 text-emerald-400/80" />
                  <p className="text-emerald-400/80 text-sm font-light">
                    Recording uploaded. Closing…
                  </p>
                </div>
              )}

              {/* ─── Submit ────────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.04]">
                <button
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  disabled={busy}
                  className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={busy || !file}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b97e] px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {stage === "uploading"
                    ? "Uploading…"
                    : stage === "saving"
                      ? "Saving…"
                      : stage === "done"
                        ? "Done"
                        : "Upload recording"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
