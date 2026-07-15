"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MOOD_COLOR,
  type JournalEntryDTO,
  type Mood,
  formatShortDate,
  formatLongDate,
} from "./types";

/**
 * CalendarGrid — 30-day visual mood grid.
 *
 * Renders the last 30 days as a 7-column grid (one row per week). Each cell
 * is colored by the entry's mood; empty cells are dim. Clicking a cell with
 * an entry loads it into the form (via onSelectEntry); clicking an empty
 * cell moves the form's date to that day (via onSelectDate).
 *
 * The grid uses ISO weekday ordering (Sun → Sat) so it reads like a real
 * calendar. Today is highlighted with a gold ring.
 */

interface CalendarGridProps {
  entries: JournalEntryDTO[];
  /** Currently selected date in YYYY-MM-DD form (controls which cell is "active"). */
  selectedDate: string;
  /** Called when the user clicks a cell that has an entry. */
  onSelectEntry?: (entry: JournalEntryDTO) => void;
  /** Called when the user clicks a cell with no entry. */
  onSelectDate?: (dateIso: string) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDay(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export default function CalendarGrid({
  entries,
  selectedDate,
  onSelectEntry,
  onSelectDate,
}: CalendarGridProps) {
  const todayIso = useMemo(() => isoDay(new Date()), []);

  // Build the last 35 days (5 weeks) so the grid always has 5 complete rows.
  // This makes the calendar look like a real month view rather than a
  // truncated strip.
  const days = useMemo(() => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    // Find the most recent Saturday (end of week) and go back 34 days.
    const todayDow = now.getUTCDay(); // 0 = Sun
    const endOfThisWeek = new Date(now);
    endOfThisWeek.setUTCDate(now.getUTCDate() + (6 - todayDow));
    const start = new Date(endOfThisWeek);
    start.setUTCDate(endOfThisWeek.getUTCDate() - 34);

    const list: Date[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, JournalEntryDTO>();
    for (const e of entries) {
      const d = new Date(e.date);
      m.set(isoDay(d), e);
    }
    return m;
  }, [entries]);

  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAY_LABELS.map((l, i) => (
          <div
            key={i}
            className="text-center text-[9px] tracking-[0.2em] uppercase text-[#3a3a3a] font-mono"
          >
            {l}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const iso = isoDay(day);
          const entry = byDay.get(iso);
          const color = entry ? MOOD_COLOR[entry.mood as Mood] : "#0a0a0a";
          const filled = !!entry;
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          const isFuture = day.getTime() > new Date(todayIso).getTime() + 24 * 60 * 60 * 1000 - 1;

          return (
            <motion.button
              key={iso}
              type="button"
              disabled={isFuture}
              onClick={() => {
                if (entry) onSelectEntry?.(entry);
                else onSelectDate?.(iso);
              }}
              whileHover={!isFuture ? { scale: 1.08 } : undefined}
              whileTap={!isFuture ? { scale: 0.95 } : undefined}
              title={
                filled
                  ? `${formatLongDate(day)} — ${entry!.mood}, energy ${entry!.energy}/5`
                  : formatLongDate(day)
              }
              aria-label={
                filled
                  ? `${formatLongDate(day)} — ${entry!.mood}, energy ${entry!.energy}/5. Click to edit.`
                  : `${formatLongDate(day)}. Click to log this day.`
              }
              className={`relative aspect-square rounded-sm border transition-colors ${
                isFuture
                  ? "opacity-30 cursor-not-allowed border-white/[0.02]"
                  : "cursor-pointer hover:border-[#c9a96e]/40"
              }`}
              style={{
                background: color,
                borderColor: isSelected
                  ? "rgba(201, 169, 110, 0.9)"
                  : filled
                    ? "rgba(201, 169, 110, 0.18)"
                    : "rgba(255, 255, 255, 0.04)",
                opacity: filled ? 0.95 : 0.45,
              }}
            >
              {/* Day number, tiny, in the top-right */}
              <span
                className={`absolute top-0.5 right-0.5 text-[8px] font-mono ${
                  filled ? "text-[#050505]/80" : "text-[#5a5a5a]"
                }`}
              >
                {day.getUTCDate()}
              </span>

              {/* Today ring */}
              {isToday && (
                <span
                  className="absolute inset-0 rounded-sm pointer-events-none"
                  style={{
                    boxShadow: "inset 0 0 0 1px rgba(201, 169, 110, 0.7)",
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-white/[0.04]">
        {Object.entries(MOOD_COLOR).map(([mood, color]) => (
          <div key={mood} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: color }}
            />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
              {mood}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm border border-white/[0.06]"
            style={{ background: "#0a0a0a" }}
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
            No entry
          </span>
        </div>
      </div>
    </div>
  );
}
