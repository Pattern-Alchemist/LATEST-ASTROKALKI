"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  StickyNote,
  Send,
  Loader2,
  Pin,
  MessageSquare,
} from "lucide-react";

interface PortalNote {
  id: string;
  authorRole: string;
  authorName: string | null;
  noteType: string;
  visibility: string;
  title: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
}

interface PortalNoteThreadProps {
  email: string;
  bookings: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
}

export default function PortalNoteThread({
  email,
  bookings,
}: PortalNoteThreadProps) {
  const [notes, setNotes] = useState<PortalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<string>("reflection");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (bookings.length === 0) {
      setLoading(false);
      return;
    }
    try {
      // Fetch notes for the most recent booking
      const latestBookingId = bookings[0].id;
      const res = await fetch(
        `/api/portal/notes?bookingId=${latestBookingId}&role=client`
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, [bookings]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async () => {
    if (!newNote.trim() || submitting) return;
    setSubmitting(true);
    try {
      const latestBookingId = bookings[0]?.id;
      const res = await fetch("/api/portal/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: latestBookingId,
          authorRole: "client",
          authorEmail: email,
          authorName: email.split("@")[0],
          noteType,
          visibility: "shared",
          body: newNote.trim(),
        }),
      });
      if (res.ok) {
        setNewNote("");
        fetchNotes();
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <StickyNote className="size-10 text-[#333] mx-auto mb-3" />
        <p className="text-body-cinematic text-sm text-[#9a9a9a]">
          Book a session to start adding notes and reflections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Note Editor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6"
      >
        <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
          Add a Reflection
        </h3>
        <div className="space-y-4">
          <div>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full sm:w-48 h-8 text-xs bg-[#111] border border-white/[0.06] rounded-lg px-3 text-[#e8e6e1] focus:border-[#c9a96e]/30"
            >
              <option value="reflection">Reflection</option>
              <option value="question">Question</option>
              <option value="general">General Note</option>
            </select>
          </div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="What's one pattern you noticed after your session?"
            rows={4}
            className="w-full text-sm bg-[#111] border border-white/[0.06] rounded-lg p-3 text-[#e8e6e1] placeholder:text-[#555] focus:border-[#c9a96e]/30 focus:ring-[#c9a96e]/20 resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-body-cinematic text-[10px] text-[#555]">
              {newNote.length}/10,000 characters
            </p>
            <button
              onClick={handleSubmit}
              disabled={!newNote.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#c9a96e] text-[#070707] rounded-lg text-xs font-medium hover:bg-[#d4b57a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )}
              {submitting ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Notes List */}
      <div>
        <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
          Your Notes ({notes.length})
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-[#0a0a0a] border border-white/[0.04] rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="size-8 text-[#333] mx-auto mb-2" />
            <p className="text-body-cinematic text-xs text-[#9a9a9a]">
              No notes yet. Add your first reflection above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-[#111]/50 border border-white/[0.04] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  {note.pinned && (
                    <Pin className="size-3 text-[#c9a96e]" />
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#c9a96e]/10 text-[#c9a96e] border border-[#c9a96e]/20">
                    {note.noteType}
                  </span>
                  <span className="text-body-cinematic text-[10px] text-[#555]">
                    {new Date(note.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                {note.title && (
                  <p className="text-[#f0eee9] text-sm font-medium mb-1">
                    {note.title}
                  </p>
                )}
                <p className="text-body-cinematic text-xs text-[#9a9a9a] whitespace-pre-wrap">
                  {note.body}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
