"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MOOD_COLOR,
  type JournalEntryDTO,
  type Mood,
  formatLongDate,
  formatShortDate,
} from "./types";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";

/**
 * PastEntries — chronological list of past journal entries with inline
 * edit + delete actions.
 *
 * - Click "Edit" on an entry to load it into the form (parent owns the
 *   form state via onEdit).
 * - Click "Delete" to remove the entry (calls DELETE /api/journal/[id]).
 *
 * The list is read-only by default; actions are hidden behind small
 * underlined links so the list reads as a calm chronology, not a table.
 */

interface PastEntriesProps {
  entries: JournalEntryDTO[];
  /** Called when the user clicks "Edit" on an entry. */
  onEdit?: (entry: JournalEntryDTO) => void;
  /** Called after a successful delete (parent usually refetches). */
  onDeleted?: (id: string) => void;
}

export default function PastEntries({
  entries,
  onEdit,
  onDeleted,
}: PastEntriesProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(`/api/journal/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "Could not delete entry.");
          return;
        }
        onDeleted?.(id);
        setConfirmingId(null);
      } catch {
        setError("Network error — please retry.");
      } finally {
        setDeletingId(null);
      }
    },
    [onDeleted]
  );

  if (entries.length === 0) {
    return (
      <div className="border-t border-white/[0.06] py-10 border-b border-white/[0.06]">
        <p className="text-base text-[#9a9a9a] font-light leading-[1.8] max-w-md">
          No entries yet. Log today and the chronology begins.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-6 text-xs text-[#a58a54]/90 font-light">{error}</p>
      )}
      <div className="border-t border-white/[0.06]">
        <AnimatePresence initial={false}>
          {entries.map((entry, idx) => {
            const isConfirming = confirmingId === entry.id;
            const isDeleting = deletingId === entry.id;
            const atlas = entry.pattern
              ? ATLAS_PATTERNS.find((p) => p.slug === entry.pattern)
              : null;
            const moodColor = MOOD_COLOR[entry.mood as Mood] || "#3a3a3a";

            return (
              <motion.article
                key={entry.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="py-6 border-b border-white/[0.06] last:border-b-0"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6">
                  {/* Index + date */}
                  <div className="sm:col-span-3 flex items-start gap-3">
                    <span className="text-[10px] font-mono text-[#5a5a5a] mt-1">
                      {String(entries.length - idx).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-base text-[#f0eee9] font-serif font-light">
                        {formatLongDate(entry.date)}
                      </p>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-1 font-light">
                        {formatShortDate(entry.date)}
                      </p>
                    </div>
                  </div>

                  {/* Mood + energy + pattern */}
                  <div className="sm:col-span-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: moodColor }}
                        aria-hidden
                      />
                      <span className="text-sm text-[#cfcabf] font-light capitalize">
                        {entry.mood}
                      </span>
                      <span className="text-[#3a3a3a]">·</span>
                      <span className="text-sm text-[#7a7a7a] font-light">
                        Energy{" "}
                        <span className="text-[#c9a96e] font-mono">
                          {entry.energy}
                        </span>
                        /5
                      </span>
                      {atlas && (
                        <>
                          <span className="text-[#3a3a3a]">·</span>
                          <span className="text-[11px] text-[#c9a96e]/70 font-light tracking-wide truncate">
                            {atlas.name}
                          </span>
                        </>
                      )}
                    </div>
                    {entry.trigger && (
                      <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] mb-1">
                        <span className="text-[#5a5a5a]">Trigger · </span>
                        {entry.trigger}
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-sm text-[#cfcabf] font-light leading-[1.7] mt-2 italic">
                        &ldquo;{entry.note}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-4 flex sm:justify-end items-start gap-4 sm:gap-5">
                    {!isConfirming ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit?.(entry)}
                          className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] border-b border-transparent hover:border-[#c9a96e]/40 pb-1 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(entry.id)}
                          className="text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] hover:text-[#a58a54] border-b border-transparent hover:border-[#a58a54]/40 pb-1 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#7a7a7a] font-light">
                          Delete this entry?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          disabled={isDeleting}
                          className="text-[10px] tracking-[0.25em] uppercase text-[#a58a54] hover:text-[#c0392b] border-b border-[#a58a54]/40 pb-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting…" : "Yes, delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          disabled={isDeleting}
                          className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#cfcabf] border-b border-transparent hover:border-white/20 pb-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline insight (if this entry has one) */}
                {entry.insight && (
                  <div className="mt-4 sm:mt-5 sm:col-span-12 sm:ml-12 border-l border-[#c9a96e]/20 pl-4 sm:pl-6 py-1">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2 font-light">
                      Week&apos;s insight (this entry was part of)
                    </p>
                    <p className="text-sm text-[#9a9a9a] font-light leading-[1.8] line-clamp-3">
                      {entry.insight.split("\n").slice(0, 2).join(" ")}
                    </p>
                  </div>
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
