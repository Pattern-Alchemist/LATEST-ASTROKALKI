"use client";

import { useState, useEffect } from "react";

/**
 * Stripe Billing Portal launcher button.
 *
 * On click, POSTs to /api/stripe/portal (auth-gated). The server creates a
 * Stripe Billing Portal session for the member and returns its URL. The
 * browser is then redirected top-level to the Stripe-hosted portal, where
 * the member can update card, change plan, cancel, view invoices. After
 * they&apos;re done, Stripe returns them to /account?status=portal.
 *
 * Props:
 *   - disabled: when no active subscription exists, the parent renders
 *     a placeholder instead of this button.
 */
export default function PortalLink() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // We don't strictly need CSRF for /api/stripe/portal (it's auth-gated via
  // NextAuth session cookie which is SameSite=Lax — so cross-origin POSTs
  // can't ride the cookie). But fetching the csrf token keeps the cookie
  // fresh and confirms the user still has a session.
  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || null))
      .catch(() => {});
  }, []);

  async function handleClick() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not open the billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Opening…" : "Manage subscription"}
        {!loading && <span>→</span>}
      </button>
      {error && (
        <p className="mt-3 text-[11px] text-[#a58a54]/80 font-light leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
