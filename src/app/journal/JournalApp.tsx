"use client";

import { useState, useCallback, useMemo } from "react";
import JournalForm from "./JournalForm";
import JournalCharts from "./JournalCharts";
import InsightPanel from "./InsightPanel";
import CalendarGrid from "./CalendarGrid";
import PastEntries from "./PastEntries";
import JournalCheckIn, { type CheckInResult } from "./JournalCheckIn";
import UpcomingActivations from "./UpcomingActivations";
import {
  type JournalEntryDTO,
  formatLongDate,
} from "./types";

/**
 * JournalApp — the interactive shell that owns the journal page state.
 *
 * Server-side: /app/journal/page.tsx fetches the user's last 30 days of
 * entries and passes them in as `initialEntries`. This client component
 * owns the live state (entries, selected entry for editing, the most
 * recent insight) and orchestrates all the sub-components.
 *
 * State machine:
 *   - selectedEntry: the entry currently loaded in the form (may be null
 *     if the selected date has no entry — the form is in "create" mode)
 *   - selectedDate: the form's date (YYYY-MM-DD)
 *   - entries: the full list of last-30-days entries (refreshed on save/delete)
 *   - recentInsight: the most recent insight text (from any entry in the
 *     last 7 days) — passed to InsightPanel as its initial state
 */

interface JournalAppProps {
  initialEntries: JournalEntryDTO[];
  /** The user's email — for the header greeting. */
  email: string;
  /** Display name (falls back to email handle). */
  name?: string | null;
  /** Today's check-in, if the member already ran one (server pre-fetch). */
  initialCheckIn?: CheckInResult | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDay(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function JournalApp({
  initialEntries,
  email,
  name,
  initialCheckIn,
}: JournalAppProps) {
  const [entries, setEntries] = useState<JournalEntryDTO[]>(initialEntries);
  const todayIso = useMemo(() => isoDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  // The "seed" note text from a check-in's journal prompt, applied to the
  // form when the user clicks "Write in journal" inside JournalCheckIn.
  const [noteSeed, setNoteSeed] = useState<string | null>(null);

  // ─── Resolve which entry is "today's" / the selected date's entry ─────
  const selectedEntry = useMemo(() => {
    return (
      entries.find((e) => {
        const d = new Date(e.date);
        return isoDay(d) === selectedDate;
      }) || null
    );
  }, [entries, selectedDate]);

  // ─── Most recent insight across the last 7 days ───────────────────────
  const { recentInsight, recentEntryCount } = useMemo(() => {
    const cutoff = new Date(Date.now() - WEEK_MS);
    const recent = entries.filter((e) => new Date(e.date) >= cutoff);
    // Find the most recent entry that has an insight attached.
    const withInsight = recent
      .filter((e) => e.insight)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      recentInsight: withInsight[0]?.insight || null,
      recentEntryCount: recent.length,
    };
  }, [entries]);

  // ─── Refresh entries from the server after a save or delete ───────────
  const refreshEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/journal?from=" + isoDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { entries: JournalEntryDTO[] };
      setEntries(data.entries);
    } catch {
      // silent — the optimistic UI already updated
    }
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleSaved = useCallback(
    (entry: JournalEntryDTO) => {
      // Upsert into local state immediately (optimistic), then refetch.
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = entry;
          return copy;
        }
        return [entry, ...prev];
      });
      // Background refresh to get the full 30-day set with insights.
        void refreshEntries();
    },
    [refreshEntries]
  );

  const handleEditEntry = useCallback((entry: JournalEntryDTO) => {
    const d = new Date(entry.date);
    setSelectedDate(isoDay(d));
    setNoteSeed(null);
    // Smooth-scroll to the form
    if (typeof window !== "undefined") {
      const form = document.getElementById("journal-form-section");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // ─── "Write in journal" from the daily check-in ──────────────────────
  // Scrolls to the form and seeds the note with the check-in's journal
  // prompt. The form picks up `noteSeed` via its useEffect on mount; we
  // bump the form's key (noteSeedKey) to force a fresh mount so the seed
  // is applied cleanly.
  const handleWriteInJournal = useCallback((prompt: string) => {
    setNoteSeed(prompt);
    if (typeof window !== "undefined") {
      const form = document.getElementById("journal-form-section");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSelectEntryFromCalendar = useCallback(
    (entry: JournalEntryDTO) => {
      const d = new Date(entry.date);
      setSelectedDate(isoDay(d));
      if (typeof window !== "undefined") {
        const form = document.getElementById("journal-form-section");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    []
  );

  const handleSelectDateFromCalendar = useCallback((dateIso: string) => {
    setSelectedDate(dateIso);
    if (typeof window !== "undefined") {
      const form = document.getElementById("journal-form-section");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      // If we just deleted the currently-selected entry, clear the form
      // selection so the form is in create mode for that date.
      if (selectedEntry?.id === id) {
        // Force re-mount of the form by changing the key (via selectedDate
        // staying the same but selectedEntry becoming null — the form's
        // useEffect on initialEntry handles the reset).
      }
      void refreshEntries();
    },
    [selectedEntry?.id, refreshEntries]
  );

  // ─── Render ───────────────────────────────────────────────────────────
  const displayName = name || email.split("@")[0];

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Pattern Journal
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            The shape of your week,{" "}
            <span className="text-[#c9a96e] italic">{displayName}</span>.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            A daily emotional weather log. Five minutes a day. Over time, the
            patterns you can&apos;t see in any single day surface on their own.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24 space-y-20 sm:space-y-28">
        {/* ─── 0. Daily transit check-in ─────────────────────────────────── */}
        {/* Pairs with the /transits page + /api/transits/check-in. When the
            member runs a check-in, we get an insight + activated patterns
            + a journal prompt. The "Write in journal" button scrolls to
            the form below and seeds the note with the prompt. */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">✦</span>
            Daily transit check-in
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            Today&apos;s pattern weather.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Where the planets are today, what that activates in your chart,
            and one prompt to take into the form below. One check-in per
            day — the weather shifts tomorrow.
          </p>

          <JournalCheckIn
            initialCheckIn={initialCheckIn ?? null}
            onWriteInJournal={handleWriteInJournal}
          />

          {/* ─── Upcoming activations (M10-d) ───────────────────────────── */}
          {/* Small widget showing the next 3 days of pattern activations,
              linking to /pattern-calendar for the full 30-day forecast.
              Pairs with the daily check-in above — "today's weather" +
              "what's approaching" — so the member can prepare rather than
              be ambushed. Fetches /api/transits/calendar client-side;
              renders nothing if the fetch fails (the journal is still
              fully usable without it). */}
          <div className="mt-6">
            <UpcomingActivations />
          </div>
        </section>

        {/* ─── I. Today's entry form ──────────────────────────────────────── */}
        <section id="journal-form-section">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">I.</span>
            {selectedEntry ? "Edit entry" : "Today's entry"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            {selectedDate === todayIso
              ? "Log today."
              : `Logging ${formatLongDate(selectedDate)}.`}
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Five fields, none of them required except mood. The note is where
            the real material lives — two sentences is enough.
          </p>

          <div className="max-w-2xl">
            <JournalForm
              key={`${selectedEntry?.id || selectedDate}-${noteSeed ?? ""}`}
              initialEntry={selectedEntry}
              defaultDate={selectedDate}
              onSaved={handleSaved}
              noteSeed={noteSeed}
            />
          </div>
        </section>

        {/* ─── II. Calendar grid ──────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">II.</span>
            The last five weeks
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            The weather of your inner life.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Each square is one day, colored by the mood you logged. Click any
            square to view or log that day.
          </p>

          <div className="bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8">
            <CalendarGrid
              entries={entries}
              selectedDate={selectedDate}
              onSelectEntry={handleSelectEntryFromCalendar}
              onSelectDate={handleSelectDateFromCalendar}
            />
          </div>
        </section>

        {/* ─── III. Charts ────────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">III.</span>
            Patterns over time
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            What the data sees.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Thirty days of mood, energy, and the patterns you&apos;ve been
            tagging. The chart is a mirror, not a verdict.
          </p>

          <div className="bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8">
            <JournalCharts entries={entries} />
          </div>
        </section>

        {/* ─── IV. Weekly insight ─────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">IV.</span>
            Weekly synthesis
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            What surfaced this week.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Once a week, generate a synthesis of the last seven days. The
            AstroKalki voice reflects back what it sees — never diagnoses,
            never prescribes. One entry per day, so come back tomorrow if you
            want to re-run it.
          </p>

          <div className="bg-white/[0.015] border border-white/[0.04] p-6 sm:p-8">
            <InsightPanel
              initialInsight={recentInsight}
              recentEntryCount={recentEntryCount}
            />
          </div>
        </section>

        {/* ─── V. Past entries ────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            <span className="font-mono mr-3">V.</span>
            Chronology
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
            Past entries.
          </h2>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Every entry, newest first. Edit any of them — the form above will
            load the day you select.
          </p>

          <PastEntries
            entries={[...entries].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )}
            onEdit={handleEditEntry}
            onDeleted={handleDeleted}
          />
        </section>

        {/* ─── Footer ─────────────────────────────────────────────────────── */}
        <div className="pt-10 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
              The journal is private
            </p>
            <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md">
              Only you can see your entries. They are tied to your email and
              never shared, sold, or used for marketing.
            </p>
          </div>
          <a
            href="/account"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
          >
            Back to account
            <span>→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
