"use client";

import { useState } from "react";

interface RequestLinkFormProps {
  /** Optional email pre-fill (e.g. from an expired-but-still-readable token). */
  initialEmail?: string;
}

export default function RequestLinkForm({
  initialEmail,
}: RequestLinkFormProps) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/unsubscribe/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: "" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error || "Could not send the link. Please try again shortly."
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div
        role="status"
        className="border border-[#c9a96e]/30 bg-[#c9a96e]/[0.04] p-6"
      >
        <p className="text-[#c9a96e] text-sm font-light mb-2">
          Check your inbox.
        </p>
        <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light">
          If {email} is on our list, a fresh preferences link is on its way.
          The link is valid for 30 days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md">
      {/* Visually-hidden honeypot — bots fill this, humans don't see it */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px overflow-hidden"
      >
        <label htmlFor="unsub-website">Website (leave empty)</label>
        <input
          id="unsub-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          name="website"
          value=""
          onChange={() => {}}
        />
      </div>

      <div className="mb-2">
        <label
          htmlFor="unsub-email"
          className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] font-light block"
        >
          Your email
        </label>
      </div>
      <div className="flex gap-3 border-b border-white/[0.1] pb-3 focus-within:border-[#c9a96e]/60 transition-colors">
        <input
          id="unsub-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
          className="flex-1 bg-transparent text-sm text-[#f0eee9] focus:outline-none placeholder:text-[#3a3a3a] font-light"
        />
        <button
          type="submit"
          disabled={!email || submitting}
          className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer shrink-0 hover:text-[#f0eee9] transition-colors"
        >
          {submitting ? "Sending…" : "Send link"} →
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3"
        >
          {error}
        </p>
      )}

      <p className="text-[10px] text-[#5a5a5a] mt-4 tracking-wide font-light leading-relaxed">
        We will send one email containing a link to this preference center.
        No marketing messages — just the link you requested.
      </p>
    </form>
  );
}
