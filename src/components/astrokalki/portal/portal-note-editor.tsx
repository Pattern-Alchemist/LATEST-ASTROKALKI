"use client";

/**
 * PortalNoteEditor — create notes, reflections, and questions.
 * Separated from PortalNoteThread for modularity per Phase 16 spec.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, PenLine } from "lucide-react";

type NoteType = "reflection" | "question" | "general";

interface PortalNoteEditorProps {
  bookingId?: string;
  bundlePurchaseId?: string;
  email: string;
  onNoteCreated?: () => void;
}

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: "reflection", label: "Reflection" },
  { value: "question", label: "Question" },
  { value: "general", label: "General Note" },
];

export default function PortalNoteEditor({
  bookingId,
  bundlePurchaseId,
  email,
  onNoteCreated,
}: PortalNoteEditorProps) {
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("reflection");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_CHARS = 10000;
  const charCount = body.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;
  const isOverLimit = charCount > MAX_CHARS;

  const handleSubmit = async () => {
    if (!body.trim() || submitting || isOverLimit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          bundlePurchaseId,
          authorRole: "client",
          authorEmail: email,
          authorName: email.split("@")[0],
          noteType,
          visibility: "shared",
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save note");
      }

      setBody("");
      setTitle("");
      setNoteType("reflection");
      onNoteCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <PenLine className="size-3.5 text-[#c9a96e]" />
        <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em]">
          Add a Note
        </h3>
      </div>

      {/* Note type + title row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={noteType}
          onChange={(e) => setNoteType(e.target.value as NoteType)}
          className="h-8 text-xs bg-[#111] border border-white/[0.06] rounded-lg px-3 text-[#e8e6e1] focus:border-[#c9a96e]/30"
        >
          {NOTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="flex-1 h-8 text-xs bg-[#111] border border-white/[0.06] rounded-lg px-3 text-[#e8e6e1] placeholder:text-[#555] focus:border-[#c9a96e]/30"
        />
      </div>

      {/* Body textarea */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind? Share a reflection, question, or note about your session."
        rows={4}
        className="w-full text-sm bg-[#111] border border-white/[0.06] rounded-lg p-3 text-[#e8e6e1] placeholder:text-[#555] focus:border-[#c9a96e]/30 resize-none"
      />

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-[#c0392b]">{error}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p
          className={`text-body-cinematic text-[10px] ${
            isOverLimit
              ? "text-[#c0392b]"
              : isNearLimit
              ? "text-yellow-400"
              : "text-[#555]"
          }`}
        >
          {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()} characters
        </p>
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || submitting || isOverLimit}
          className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#070707] rounded-lg text-xs font-medium hover:bg-[#d4b57a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Send className="size-3" />
          )}
          {submitting ? "Saving…" : "Save Note"}
        </button>
      </div>
    </motion.div>
  );
}
