"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoCallRoomProps {
  roomUrl: string;
  roomName?: string | null;
  /** ISO datetime string of when the session starts */
  scheduledAt?: string | null;
}

/**
 * VideoCallRoom — displays a meeting link for the booked session.
 *
 * Provides:
 *   - A countdown/status indicator until the session starts
 *   - A prominent "Join Meeting" button that opens Daily.co in a new tab
 *   - An optional embedded iframe preview (for when the session is active)
 *
 * Daily.co rooms are browser-based — no download needed. Works on any device.
 */
export default function VideoCallRoom({
  roomUrl,
  roomName,
  scheduledAt,
}: VideoCallRoomProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  const sessionStart = scheduledAt ? new Date(scheduledAt) : null;
  const now = new Date();
  const isSessionSoon =
    sessionStart &&
    sessionStart.getTime() - now.getTime() < 30 * 60 * 1000 && // within 30 min
    sessionStart.getTime() > now.getTime() - 60 * 60 * 1000; // not more than 1 hour past

  const isSessionPast = sessionStart && sessionStart.getTime() < now.getTime();
  const canJoin = !sessionStart || isSessionSoon || isSessionPast;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="border border-[#c9a96e]/20 bg-[#c9a96e]/[0.04] px-6 py-5 mb-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/80 mb-2 font-light flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c9a96e] animate-pulse" />
            Video Session
          </p>
          <p className="text-[#f0eee9] text-sm font-serif font-light">
            {roomName
              ? `Room: ${roomName}`
              : "Your meeting room is ready"}
          </p>
        </div>
        <span className="text-[9px] tracking-[0.2em] uppercase text-[#4ade80]/70 bg-[#4ade80]/10 px-2 py-1 rounded-sm font-light">
          Ready
        </span>
      </div>

      {/* Join button */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={roomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#c9a96e] hover:bg-[#d4b97e] text-[#050505] px-5 py-2.5 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-300"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {canJoin ? "Join Meeting" : "Meeting link"}
        </a>

        {/* Optional: embed toggle */}
        {canJoin && (
          <button
            onClick={() => setShowEmbed(!showEmbed)}
            className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors cursor-pointer font-light"
          >
            {showEmbed ? "Hide embed" : "Open in browser"}
          </button>
        )}
      </div>

      {/* Info text */}
      <p className="text-[10px] text-[#5a5a5a] font-light mt-3 leading-relaxed">
        Works on any device — no account or download needed.
        {scheduledAt && (
          <> Your session is scheduled for{" "}
            <span className="text-[#9a9a9a]">
              {new Date(scheduledAt).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })}
            </span> (IST).
          </>
        )}
      </p>

      {/* Embedded iframe (hidden by default — only shown when user clicks embed) */}
      <AnimatePresence>
        {showEmbed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4"
          >
            <div className="aspect-video bg-[#0a0a0a] rounded-sm overflow-hidden border border-white/[0.06]">
              <iframe
                src={roomUrl}
                title="Video session"
                className="w-full h-full"
                allow="camera; microphone; autoplay; display-capture"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
