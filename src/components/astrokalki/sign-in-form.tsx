"use client";

import { useState, useEffect } from "react";

/**
 * Magic-link sign-in form for the /account page.
 *
 * Flow:
 *   1. Fetch the NextAuth CSRF token from /api/auth/csrf.
 *   2. On submit, POST { email, csrfToken, callbackUrl } to /api/auth/signin/email.
 *   3. NextAuth calls sendVerificationRequest (configured in /src/lib/auth.ts)
 *      which dispatches the branded magic-link email via sendEmail().
 *   4. Show "check your inbox" state. The user clicks the link in the email,
 *      NextAuth verifies the token, and redirects to /account (callbackUrl).
 *
 * The form includes the `website` honeypot for consistency with other
 * AstroKalki forms (defence-in-depth — NextAuth has its own bot defenses).
 */
export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch CSRF token on mount — NextAuth requires it on every POST.
  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken || null))
      .catch(() => setError("Could not initialise sign-in. Refresh and try again."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !csrfToken) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin/email", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          csrfToken,
          callbackUrl: "/account",
        }).toString(),
      });

      if (!res.ok) {
        // NextAuth returns 200 on success even if email is invalid format,
        // so a non-2xx here is genuinely unexpected.
        setError("Sign-in request failed. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — please retry.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-md">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light">
          Check your inbox
        </p>
        <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] mb-4">
          We sent a sign-in link to <span className="text-[#c9a96e]">{email}</span>. Click the link in the email to enter your member portal.
        </p>
        <p className="text-sm text-[#7a7a7a] font-light leading-[1.7]">
          The link expires in 24 hours. If you don&apos;t see the email within a few minutes, check your promotions folder. If it&apos;s not there,{" "}
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="text-[#c9a96e] underline underline-offset-4 hover:text-[#f0eee9] transition-colors"
          >
            try a different email
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      {/* Honeypot — visually hidden */}
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
        <label htmlFor="signin-website">Website (leave empty)</label>
        <input
          type="text"
          id="signin-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value=""
          onChange={() => {}}
        />
      </div>

      <div className="mb-8">
        <label
          htmlFor="signin-email"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light"
        >
          Your email
        </label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          autoFocus
          className="w-full bg-transparent border-b border-white/[0.08] focus:border-[#c9a96e]/60 px-0 py-3 text-base text-[#f0eee9] font-light outline-none transition-colors placeholder:text-[#3a3a3a]"
        />
        <p className="mt-3 text-[11px] text-[#5a5a5a] font-light leading-relaxed">
          We&apos;ll email you a one-time sign-in link. No password to remember, no account to create.
        </p>
      </div>

      {error && (
        <p className="text-xs text-[#a58a54]/80 font-light mb-4">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !csrfToken || !email}
        className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Sending…" : "Send sign-in link"}
        {!loading && <span className="text-[#c9a96e]">→</span>}
      </button>
    </form>
  );
}
