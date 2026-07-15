"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, Loader2, X, Plus } from "lucide-react";

/**
 * SlotManager — admin client component for generating availability slots.
 *
 * Two modes:
 *   • Bulk    — pick a date range, weekdays, time-of-day slots, duration,
 *               timezone offset → generates one slot per (weekday × time).
 *   • Single  — pick one start datetime, end auto-computed from duration.
 *
 * Submits to POST /api/admin/slots. On success, calls router.refresh()
 * so the server-rendered slot grid updates.
 */

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const DURATIONS = [
  { value: 30, label: "30 min — Focused snapshot" },
  { value: 60, label: "60 min — Deep decode" },
  { value: 90, label: "90 min — Full picture" },
];

// Common timezone presets (offset in minutes from UTC).
const TZ_PRESETS = [
  { value: 330, label: "IST (+5:30)" },
  { value: 0, label: "UTC" },
  { value: -480, label: "PST (-8:00)" },
  { value: -300, label: "EST (-5:00)" },
  { value: 60, label: "CET (+1:00)" },
];

type Mode = "bulk" | "single";

interface CreatedSummary {
  count: number;
  skippedDuplicates?: number;
  message?: string;
}

export default function SlotManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("bulk");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CreatedSummary | null>(null);

  // Bulk form state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [times, setTimes] = useState<string[]>(["10:00", "15:00", "18:00"]);
  const [duration, setDuration] = useState<number>(60);
  const [tzOffset, setTzOffset] = useState<number>(330);

  // Single form state
  const [singleStart, setSingleStart] = useState("");

  const toggleWeekday = (v: number) => {
    setWeekdays((prev) =>
      prev.includes(v) ? prev.filter((w) => w !== v) : [...prev, v].sort()
    );
  };

  const addTime = () => setTimes((prev) => [...prev, "12:00"]);
  const updateTime = (idx: number, val: string) =>
    setTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  const removeTime = (idx: number) =>
    setTimes((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setError(null);
    setSummary(null);
    setSubmitting(true);

    try {
      const payload =
        mode === "bulk"
          ? {
              mode: "bulk" as const,
              startDate,
              endDate,
              weekdays,
              times,
              duration,
              timezoneOffset: tzOffset,
            }
          : {
              mode: "single" as const,
              start: singleStart,
              end: new Date(
                new Date(singleStart).getTime() + duration * 60_000
              ).toISOString(),
              duration,
            };

      // Validate single mode locally — the API will also validate.
      if (mode === "single" && !singleStart) {
        setError("Pick a start datetime.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create slots.");
        return;
      }

      setSummary({
        count: data.count ?? 0,
        skippedDuplicates: data.skippedDuplicates,
        message: data.message,
      });

      // Refresh server-rendered grid.
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Network error. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-white/[0.04] bg-[#0a0a0a]/40">
      {/* Header row */}
      <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light">
            Slot generator
          </p>
          <p className="text-[#cfcabf] text-sm sm:text-base font-serif font-light italic">
            “Open the times you'll hold. The calendar fills itself.”
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
        >
          {open ? <X className="size-3.5" /> : <CalendarPlus className="size-3.5" />}
          {open ? "Close" : "Generate"}
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
              {/* Mode toggle */}
              <div className="flex gap-2">
                {(["bulk", "single"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 text-[11px] tracking-[0.25em] uppercase border transition-colors ${
                      mode === m
                        ? "border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/5"
                        : "border-white/[0.08] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.15]"
                    }`}
                  >
                    {m === "bulk" ? "Bulk generate" : "Single slot"}
                  </button>
                ))}
              </div>

              {/* Duration + TZ (shared) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                    Timezone
                  </label>
                  <select
                    value={tzOffset}
                    onChange={(e) => setTzOffset(Number(e.target.value))}
                    className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
                  >
                    {TZ_PRESETS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode-specific fields */}
              {mode === "bulk" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                        End date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
                      />
                    </div>
                  </div>

                  {/* Weekdays */}
                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 block font-light">
                      Weekdays
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((w) => {
                        const active = weekdays.includes(w.value);
                        return (
                          <button
                            key={w.value}
                            onClick={() => toggleWeekday(w.value)}
                            className={`px-3 py-2 text-[11px] tracking-[0.2em] uppercase border transition-colors ${
                              active
                                ? "border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/5"
                                : "border-white/[0.08] text-[#7a7a7a] hover:text-[#f0eee9]"
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Times */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] font-light">
                        Time-of-day slots
                      </label>
                      <button
                        onClick={addTime}
                        className="inline-flex items-center gap-1 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                      >
                        <Plus className="size-3" />
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {times.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center border border-white/[0.08] focus-within:border-[#c9a96e]/50"
                        >
                          <input
                            type="time"
                            value={t}
                            onChange={(e) => updateTime(i, e.target.value)}
                            className="bg-[#050505] px-3 py-2 text-sm text-[#f0eee9] focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => removeTime(i)}
                            className="px-2 text-[#5a5a5a] hover:text-red-400 transition-colors"
                            aria-label="Remove time"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#5a5a5a] mt-2 font-light">
                      Times are interpreted in the selected timezone. Stored as UTC.
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-2 block font-light">
                    Start datetime (in selected timezone)
                  </label>
                  <input
                    type="datetime-local"
                    value={singleStart}
                    onChange={(e) => setSingleStart(e.target.value)}
                    className="w-full bg-[#050505] border border-white/[0.08] px-3 py-2 text-sm text-[#f0eee9] focus:border-[#c9a96e]/50 focus:outline-none font-light"
                  />
                  <p className="text-[11px] text-[#5a5a5a] mt-2 font-light">
                    End auto-calculated as start + {duration} min. Stored as UTC.
                  </p>
                </div>
              )}

              {/* Error + summary */}
              {error && (
                <p className="text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3">
                  {error}
                </p>
              )}
              {summary && (
                <div className="border-l-2 border-[#c9a96e]/50 pl-3 py-1">
                  <p className="text-[#c9a96e] text-sm font-light">
                    {summary.count > 0
                      ? `${summary.count} slot${summary.count === 1 ? "" : "s"} created.`
                      : "No new slots created."}
                    {summary.skippedDuplicates
                      ? ` ${summary.skippedDuplicates} duplicate${summary.skippedDuplicates === 1 ? "" : "s"} skipped.`
                      : null}
                  </p>
                  {summary.message && (
                    <p className="text-[#9a9a9a] text-xs mt-1 font-light">
                      {summary.message}
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.04]">
                <button
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                    setSummary(null);
                  }}
                  className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#050505] bg-[#c9a96e] hover:bg-[#d4b97e] px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="size-3.5" />
                  )}
                  {submitting ? "Generating…" : "Generate slots"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
