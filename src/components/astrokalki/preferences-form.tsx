"use client";

import { useState, useEffect } from "react";

/**
 * Drip email preferences toggle form for the /account page.
 *
 * Renders three switches:
 *   - prefSessions  — session-related emails (booking confirmations, reminders)
 *   - prefBlog      — new essay / Atlas pattern notifications
 *   - prefDrip      — the nurture drip sequence (welcome, day-2, day-5)
 *
 * On toggle change, immediately POSTs to /api/preferences (auth-gated).
 * Optimistic UI: the switch flips instantly, rolls back on error.
 */

interface PreferencesFormProps {
  initial: {
    prefSessions: boolean;
    prefBlog: boolean;
    prefDrip: boolean;
  };
}

const FIELDS = [
  {
    key: "prefSessions" as const,
    label: "Session emails",
    description:
      "Booking confirmations, session reminders, and follow-up notes. Always recommended — these are transactional, not marketing.",
  },
  {
    key: "prefBlog" as const,
    label: "New essays",
    description:
      "When a new essay, Atlas pattern, or guide is published. Usually 1–2 emails per month.",
  },
  {
    key: "prefDrip" as const,
    label: "The nurture sequence",
    description:
      "The three-email welcome sequence (Day 0, Day 2, Day 5). Unsubscribe here if you've already read them.",
  },
];

export default function PreferencesForm({ initial }: PreferencesFormProps) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || null))
      .catch(() => {});
  }, []);

  async function toggle(key: keyof typeof initial) {
    const newValue = !prefs[key];
    const previous = prefs[key];
    // Optimistic update
    setPrefs((p) => ({ ...p, [key]: newValue }));
    setError(null);
    setSaving(key);
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [key]: newValue,
          csrfToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
    } catch (err) {
      // Roll back
      setPrefs((p) => ({ ...p, [key]: previous }));
      setError(err instanceof Error ? err.message : "Could not update preference.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="space-y-8">
        {FIELDS.map((field) => {
          const value = prefs[field.key];
          const isSaving = saving === field.key;
          return (
            <div
              key={field.key}
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 pb-8 border-b border-white/[0.04] last:border-b-0"
            >
              <div className="sm:col-span-9">
                <p className="text-base text-[#f0eee9] font-serif font-light tracking-[-0.01em] mb-2">
                  {field.label}
                </p>
                <p className="text-sm text-[#7a7a7a] font-light leading-[1.7] max-w-md">
                  {field.description}
                </p>
              </div>
              <div className="sm:col-span-3 flex sm:justify-end items-start">
                <button
                  type="button"
                  role="switch"
                  aria-checked={value}
                  aria-label={field.label}
                  onClick={() => toggle(field.key)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 disabled:opacity-50 cursor-pointer ${
                    value
                      ? "bg-[#c9a96e]/20 border-[#c9a96e]/50"
                      : "bg-transparent border-white/[0.1]"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full transition-transform duration-300 ${
                      value
                        ? "translate-x-6 bg-[#c9a96e]"
                        : "translate-x-1.5 bg-[#5a5a5a]"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="mt-4 text-[11px] text-[#a58a54]/80 font-light">
          {error}
        </p>
      )}
    </div>
  );
}
