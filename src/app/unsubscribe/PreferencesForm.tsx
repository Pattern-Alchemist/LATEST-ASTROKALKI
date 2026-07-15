"use client";

import { useState } from "react";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Stable id for the toggle (used for htmlFor/id pairing + a11y). */
  id: string;
}

interface EditorialToggleProps {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}

/**
 * Editorial toggle — a thin horizontal track with a circle that slides
 * from left (off, muted gray) to right (on, gold). Matches the AstroKalki
 * dark editorial design system; intentionally not the default shadcn Switch
 * (which uses a pill-shaped track that looks out of place here).
 *
 * Accessibility:
 *  - role="switch" + aria-checked (WAI-ARIA switch pattern)
 *  - Keyboard-accessible via native <button> (Space + Enter toggle)
 *  - Focus ring visible only on keyboard focus (focus-visible)
 *  - Label associated via wrapping <label htmlFor> in the parent row
 */
function EditorialToggle({
  id,
  checked,
  onChange,
  disabled,
  label,
}: EditorialToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 w-14 h-5 mt-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] rounded-sm"
    >
      {/* Horizontal track — thin line spanning the full width */}
      <span
        aria-hidden="true"
        className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px transition-colors duration-300 ${
          checked ? "bg-[#c9a96e]" : "bg-[#3a3a3a]"
        }`}
      />
      {/* Sliding circle */}
      <span
        aria-hidden="true"
        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-300 ${
          checked
            ? "left-[calc(100%-0.75rem)] bg-[#c9a96e]"
            : "left-0 bg-[#5a5a5a]"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  destructive,
  id,
}: ToggleRowProps) {
  return (
    <div className="py-5 border-b border-white/[0.06] flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className={`block text-sm font-serif font-light cursor-pointer ${
            destructive ? "text-[#c9a96e]" : "text-[#f0eee9]"
          }`}
        >
          {label}
        </label>
        <p className="text-[12px] text-[#7a7a7a] mt-1 font-light leading-relaxed">
          {description}
        </p>
      </div>
      <EditorialToggle
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        label={label}
      />
    </div>
  );
}

interface PreferencesFormProps {
  email: string;
  token: string;
  initial: {
    prefSessions: boolean;
    prefBlog: boolean;
    prefDrip: boolean;
    optedOut: boolean;
  };
}

export default function PreferencesForm({
  email,
  token,
  initial,
}: PreferencesFormProps) {
  const [prefSessions, setPrefSessions] = useState(initial.prefSessions);
  const [prefBlog, setPrefBlog] = useState(initial.prefBlog);
  const [prefDrip, setPrefDrip] = useState(initial.prefDrip);
  const [optedOut, setOptedOut] = useState(initial.optedOut);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          prefSessions,
          prefBlog,
          prefDrip,
          optedOut,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error || "Could not save your preferences. Please try again."
        );
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // When opted out, individual prefs are dimmed and disabled (server will
  // ignore them and only set optedOut=true).
  const individualDisabled = optedOut;

  return (
    <div>
      {saved && (
        <div
          role="status"
          className="mb-8 border border-[#c9a96e]/30 bg-[#c9a96e]/[0.04] p-5"
        >
          <p className="text-[#c9a96e] text-sm font-light">
            Your preferences have been updated.
          </p>
        </div>
      )}

      <div role="group" aria-label="Email category preferences">
        <ToggleRow
          id="pref-sessions"
          label="Session-related emails"
          description="Booking confirmations, reminders, and follow-ups about your sessions. Recommended — these are transactional."
          checked={prefSessions}
          disabled={individualDisabled}
          onChange={setPrefSessions}
        />
        <ToggleRow
          id="pref-blog"
          label="New articles & insights"
          description="Essays and pattern analyses published on the site. One email per article."
          checked={prefBlog}
          disabled={individualDisabled}
          onChange={setPrefBlog}
        />
        <ToggleRow
          id="pref-drip"
          label="Nurture sequence"
          description="The two follow-up observations sent after you subscribe (Day 2 and Day 5)."
          checked={prefDrip}
          disabled={individualDisabled}
          onChange={setPrefDrip}
        />
      </div>

      <div className="mt-8 pt-6 border-t border-white/[0.06]">
        <ToggleRow
          id="opted-out"
          label="Unsubscribe from everything"
          description="No emails of any kind will arrive. You can re-subscribe any time from the website."
          checked={optedOut}
          destructive
          onChange={setOptedOut}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-10 inline-flex items-center gap-3 bg-[#c9a96e] hover:bg-[#d4b97e] text-[#050505] px-8 py-4 text-[11px] tracking-[0.3em] uppercase font-medium transition-all duration-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save preferences"}
        {!saving && <span aria-hidden="true">→</span>}
      </button>
    </div>
  );
}
