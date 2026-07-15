"use client";

/**
 * PortalSessionTimeline — chronological timeline of booking, notes,
 * room creation, and follow-up events for a session.
 */

import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  StickyNote,
  Video,
  Circle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "booking_created" | "session_confirmed" | "session_completed" | "note_added" | "room_created" | "followup_booked";
  label: string;
  detail?: string;
  url?: string;
  timestamp: string;
}

interface PortalSessionTimelineProps {
  booking: {
    id: string;
    status: string;
    scheduledAt: string | null;
    roomUrl: string | null;
    createdAt: string;
  };
  notes?: Array<{
    id: string;
    noteType: string;
    createdAt: string;
  }>;
}

const EVENT_ICONS: Record<string, typeof Calendar> = {
  booking_created: Calendar,
  session_confirmed: CheckCircle2,
  session_completed: CheckCircle2,
  note_added: StickyNote,
  room_created: Video,
  followup_booked: Calendar,
};

const EVENT_COLORS: Record<string, string> = {
  booking_created: "text-yellow-400",
  session_confirmed: "text-[#c9a96e]",
  session_completed: "text-emerald-400",
  note_added: "text-blue-400",
  room_created: "text-purple-400",
  followup_booked: "text-[#c9a96e]",
};

function buildTimeline(
  booking: PortalSessionTimelineProps["booking"],
  notes: PortalSessionTimelineProps["notes"]
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `booking-${booking.id}`,
      type: "booking_created",
      label: "Session booked",
      detail: `${booking.status} · ${new Date(booking.createdAt).toLocaleDateString("en-IN")}`,
      timestamp: booking.createdAt,
    },
  ];

  if (booking.status === "confirmed" || booking.status === "completed") {
    events.push({
      id: `confirmed-${booking.id}`,
      type: "session_confirmed",
      label: "Session confirmed",
      detail: booking.scheduledAt
        ? `Scheduled for ${new Date(booking.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
        : undefined,
      timestamp: booking.scheduledAt || booking.createdAt,
    });
  }

  if (booking.roomUrl) {
    events.push({
      id: `room-${booking.id}`,
      type: "room_created",
      label: "Video room ready",
      url: booking.roomUrl,
      timestamp: booking.scheduledAt || booking.createdAt,
    });
  }

  if (booking.status === "completed") {
    events.push({
      id: `completed-${booking.id}`,
      type: "session_completed",
      label: "Session completed",
      timestamp: booking.scheduledAt || booking.createdAt,
    });
  }

  if (notes && notes.length > 0) {
    notes.forEach((note) => {
      events.push({
        id: `note-${note.id}`,
        type: "note_added",
        label: `${note.noteType} note added`,
        timestamp: note.createdAt,
      });
    });
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export default function PortalSessionTimeline({
  booking,
  notes = [],
}: PortalSessionTimelineProps) {
  const events = buildTimeline(booking, notes);

  if (events.length === 0) return null;

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.type] || Circle;
        const color = EVENT_COLORS[event.type] || "text-[#555]";

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="flex items-start gap-3 py-2"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <Icon className={`size-3.5 ${color}`} />
              {i < events.length - 1 && (
                <div className="w-px h-6 bg-white/[0.06] mt-1" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 min-w-0">
              <p className="text-[#f0eee9] text-xs font-medium">
                {event.label}
              </p>
              {event.detail && (
                <p className="text-body-cinematic text-[10px] text-[#9a9a9a] mt-0.5">
                  {event.detail}
                </p>
              )}
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#c9a96e] hover:underline mt-1"
                >
                  <ExternalLink className="size-2.5" />
                  Join
                </a>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-body-cinematic text-[10px] text-[#555] whitespace-nowrap">
              {new Date(event.timestamp).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
