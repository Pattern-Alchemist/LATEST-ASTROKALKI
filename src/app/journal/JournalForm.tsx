"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";
import {
  MOODS,
  type Mood,
  type JournalEntryDTO,
  toDateInputValue,
  formatLongDate,
} from "./types";

/**
 * JournalForm — daily Pattern Journal entry form.
 *
 * Pre-fills from an existing entry for the selected date (if any), and
 * POSTs to /api/journal. The API upserts by (email, calendar day) so a
 * second submit for the same day edits the existing entry.
 *
 * Visual design: borderless inputs with bottom underline that turns gold
 * on focus. Mood is six colored circles; the selected one gets a gold ring.
 * Energy is a 1-5 custom slider. Pattern is a native <select> for mobile
 * UX (radix Select tends to over-style the dark editorial aesthetic).
 *
 * The form is uncontrolled-friendly: react-hook-form manages state, but
 * the mood circles and slider feed their values into RHF via setValue.
 */

const journalFormSchema = z.object({
  date: z.string().min(8, "Date is required"),
  mood: z.enum(
    ["heavy", "numb", "anxious", "clear", "angry", "tender"],
    { message: "Choose a mood" }
  ),
  energy: z.number().int().min(1).max(5),
  trigger: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pattern: z
    .string()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => "none")),
  note: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

type JournalFormValues = z.infer<typeof journalFormSchema>;

interface JournalFormProps {
  /** Existing entry for the selected date, if any (for prefill). */
  initialEntry?: JournalEntryDTO | null;
  /** Default date (YYYY-MM-DD) for the date input. Defaults to today. */
  defaultDate?: string;
  /** Called after a successful save with the saved entry. */
  onSaved?: (entry: JournalEntryDTO) => void;
  /**
   * Optional seed text for the note field — used when the user clicks
   * "Write in journal" from the daily check-in. Only applied when there
   * is no initialEntry (i.e. the form is in create mode). The parent
   * bumps the form's key to force a fresh mount when this changes.
   */
  noteSeed?: string | null;
}

export default function JournalForm({
  initialEntry,
  defaultDate,
  onSaved,
  noteSeed,
}: JournalFormProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const today = defaultDate || toDateInputValue(new Date());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: {
      date: today,
      mood: initialEntry?.mood,
      energy: initialEntry?.energy ?? 3,
      trigger: initialEntry?.trigger ?? "",
      pattern: initialEntry?.pattern ?? "none",
      // If we're in create mode and a noteSeed was passed (from the
      // daily check-in's journal prompt), use it as the initial note.
      note: initialEntry?.note ?? noteSeed ?? "",
    },
  });

  // Fetch CSRF token on mount (used in body — matches preferences form pattern)
  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || null))
      .catch(() => {});
  }, []);

  // Re-prefill when the initialEntry prop changes (e.g. user picks a
  // different day from the calendar grid).
  useEffect(() => {
    reset({
      date: today,
      mood: initialEntry?.mood,
      energy: initialEntry?.energy ?? 3,
      trigger: initialEntry?.trigger ?? "",
      pattern: initialEntry?.pattern ?? "none",
      note: initialEntry?.note ?? "",
    });
    setSavedMessage(null);
    setServerError(null);
  }, [initialEntry, today, reset]);

  const selectedMood = watch("mood");
  const selectedEnergy = watch("energy");
  const selectedDate = watch("date");

  // ─── Submit ────────────────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (values: JournalFormValues) => {
      if (submitting) return;
      setSubmitting(true);
      setServerError(null);
      setSavedMessage(null);

      try {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            // Normalize pattern: "none" → undefined
            pattern:
              values.pattern && values.pattern !== "none"
                ? values.pattern
                : undefined,
            csrfToken,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setServerError(
            data?.error || "Could not save your entry. Please try again."
          );
          return;
        }

        const data = (await res.json()) as { entry: JournalEntryDTO };
        setSavedMessage(
          `Saved for ${formatLongDate(data.entry.date)}. You can edit any time today.`
        );
        onSaved?.(data.entry);
      } catch {
        setServerError("Network error — please retry.");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, csrfToken, onSaved]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      {/* ─── Date ────────────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="journal-date"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
        >
          Date
        </label>
        <input
          id="journal-date"
          type="date"
          {...register("date")}
          max={today}
          className="journal-date-input w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors [color-scheme:dark]"
        />
        {errors.date && (
          <p className="mt-2 text-[11px] text-[#a58a54]/80 font-light">
            {errors.date.message}
          </p>
        )}
      </div>

      {/* ─── Mood ────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-4 font-light">
          Today&apos;s mood
        </p>
        <div className="flex flex-wrap gap-4 sm:gap-5">
          {MOODS.map((m) => {
            const isSelected = selectedMood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${m.label} — ${m.description}`}
                title={`${m.label} — ${m.description}`}
                onClick={() =>
                  setValue("mood", m.value as Mood, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className="group flex flex-col items-center gap-2 cursor-pointer"
              >
                <span
                  className={`w-8 h-8 rounded-full transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-[#c9a96e] ring-offset-2 ring-offset-[#050505] scale-110"
                      : "ring-1 ring-white/[0.06] group-hover:ring-white/[0.2]"
                  }`}
                  style={{ background: m.color }}
                />
                <span
                  className={`text-[10px] tracking-[0.15em] uppercase font-light transition-colors ${
                    isSelected
                      ? "text-[#c9a96e]"
                      : "text-[#5a5a5a] group-hover:text-[#9a9a9a]"
                  }`}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
        {errors.mood && (
          <p className="mt-3 text-[11px] text-[#a58a54]/80 font-light">
            {errors.mood.message}
          </p>
        )}
      </div>

      {/* ─── Energy ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light">
            Energy
          </p>
          <p className="text-xs font-mono text-[#c9a96e]">
            {selectedEnergy ?? 3}
            <span className="text-[#5a5a5a]">/5</span>
          </p>
        </div>
        <div className="relative pt-2 pb-6">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={selectedEnergy ?? 3}
            onChange={(e) =>
              setValue("energy", Number(e.target.value), {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className="journal-energy-slider w-full"
            aria-label="Energy level from 1 to 5"
          />
          <div className="flex justify-between mt-2 px-0.5">
            {["1", "2", "3", "4", "5"].map((n) => (
              <span
                key={n}
                className="text-[9px] tracking-[0.2em] uppercase text-[#3a3a3a] font-mono"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Trigger ─────────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="journal-trigger"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
        >
          What triggered you today?
        </label>
        <input
          id="journal-trigger"
          type="text"
          {...register("trigger")}
          placeholder="A conversation, a memory, a quiet morning — or nothing in particular."
          maxLength={500}
          className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
        />
      </div>

      {/* ─── Pattern ─────────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="journal-pattern"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
        >
          Recognised pattern
        </label>
        <div className="relative">
          <select
            id="journal-pattern"
            {...register("pattern")}
            className="w-full appearance-none bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 pr-8 text-base text-[#f0eee9] font-light outline-none transition-colors cursor-pointer [color-scheme:dark]"
          >
            <option value="none" className="bg-[#0a0a0a] text-[#9a9a9a]">
              None / not yet
            </option>
            {ATLAS_PATTERNS.map((p) => (
              <option key={p.slug} value={p.slug} className="bg-[#0a0a0a] text-[#f0eee9]">
                {p.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#5a5a5a]">
            ↓
          </span>
        </div>
        <p className="mt-2 text-[11px] text-[#5a5a5a] font-light leading-relaxed">
          One of the ten Atlas patterns, if you noticed one running today. Skip if not.
        </p>
      </div>

      {/* ─── Note ────────────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="journal-note"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
        >
          What did you notice?
        </label>
        <textarea
          id="journal-note"
          {...register("note")}
          placeholder="Two sentences is enough. The shape of the day. What landed, what didn't."
          rows={5}
          maxLength={4000}
          className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light leading-[1.8] outline-none transition-colors placeholder:text-[#3a3a3a] resize-y min-h-[120px]"
        />
      </div>

      {/* ─── Server feedback ─────────────────────────────────────────────── */}
      {serverError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-[#a58a54]/90 font-light leading-relaxed"
        >
          {serverError}
        </motion.p>
      )}
      {savedMessage && !serverError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-[#c9a96e]/80 font-light leading-relaxed"
        >
          {savedMessage}
        </motion.p>
      )}

      {/* ─── Submit ──────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !csrfToken}
          className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting
            ? "Saving…"
            : initialEntry
              ? "Update entry"
              : "Save today's entry"}
          {!submitting && <span className="text-[#c9a96e]">→</span>}
        </button>
      </div>

      {/* Local CSS for the energy slider is in globals.css (.journal-energy-slider). */}
    </form>
  );
}
