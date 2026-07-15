"use client";

import { useState } from "react";

/**
 * Client-side subscribe button for the /membership pricing page.
 *
 * Why a separate client component:
 *   - The pricing page itself is a server component (for SEO + metadata).
 *   - The subscribe button needs client state (loading, error) and needs
 *     to navigate the browser to the Stripe-hosted Checkout URL.
 *
 * Behaviour:
 *   - If `defaultEmail` is provided (user is signed in), send it.
 *   - Else, prompt the user for an email inline before calling the API.
 *   - On success, redirect the top-level window to the Stripe URL.
 *   - On 429 (rate limited), show the retry-after message.
 *   - On any other error, show the message inline.
 *
 * Security:
 *   - Includes the `website` honeypot field (visually hidden) so bots that
 *     scrape the form get silently rejected by /api/stripe/checkout.
 *   - The button is disabled while loading to prevent double-submits.
 */
interface SubscribeButtonProps {
  plan: "monthly" | "yearly";
  label: string;
  /** Pre-filled email (e.g. if the user is signed in). Optional. */
  defaultEmail?: string;
}

export default function SubscribeButton({
  plan,
  label,
  defaultEmail = "",
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [showEmailField, setShowEmailField] = useState(!defaultEmail);

  async function handleSubscribe() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          // Only send email if the user entered one — Stripe will collect
          // it on the Checkout page if not.
          email: email || undefined,
          website: "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      // Top-level navigation to Stripe Checkout — the destination is allowed
      // by CSP (navigation is not bound by connect-src), and Stripe blocks
      // iframe embedding anyway.
      window.location.href = data.url;
    } catch {
      setError("Network error — please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {showEmailField && (
        <div className="mb-6">
          <label
            htmlFor={`email-${plan}`}
            className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light"
          >
            Your email
          </label>
          <input
            id={`email-${plan}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/50 px-0 py-2 text-sm text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
          />
          <p className="mt-2 text-[10px] text-[#5a5a5a] font-light leading-relaxed">
            We use this to create your member account. You&apos;ll confirm payment on the next page.
          </p>
        </div>
      )}

      {/* Honeypot — visually hidden, must remain empty */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor={`website-${plan}`}>Website (leave empty)</label>
        <input
          type="text"
          id={`website-${plan}`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value=""
          onChange={() => {}}
        />
      </div>

      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Redirecting…" : label}
        {!loading && <span className="text-[#c9a96e]">→</span>}
      </button>

      {showEmailField === false && !loading && (
        <button
          type="button"
          onClick={() => setShowEmailField(true)}
          className="block mt-3 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] hover:text-[#9a9a9a] transition-colors"
        >
          Use a different email
        </button>
      )}

      {error && (
        <p className="mt-3 text-[11px] text-[#a58a54]/80 font-light leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
