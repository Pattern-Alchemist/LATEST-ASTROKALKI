"use client";

import { useState } from "react";
import { Search, Loader2, AlertCircle, TrendingUp } from "lucide-react";

/**
 * ReferralStats — small inline client widget for the /refer page.
 *
 * The user enters their email (the one they used to generate a code). We
 * look it up against GET /api/referrals?email=... and show how many times
 * their code has been used.
 *
 * This is a separate component because the form and the stats lookup have
 * different state machines and we don't want to bloat ReferralForm.
 */

interface StatsResponse {
  valid: boolean;
  code?: string;
  uses?: number;
  lastUsedAt?: string | null;
}

export default function ReferralStats() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "found"; data: StatsResponse }
    | { kind: "not-found" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/referrals?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      if (res.status === 404) {
        setStatus({ kind: "not-found" });
        return;
      }
      if (!res.ok) {
        setStatus({
          kind: "error",
          message:
            res.status === 429
              ? "Too many lookups. Please wait a minute."
              : "Could not look up your code.",
        });
        return;
      }
      const data = (await res.json()) as StatsResponse;
      if (!data.valid) {
        setStatus({ kind: "not-found" });
        return;
      }
      setStatus({ kind: "found", data });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error — please retry.",
      });
    }
  };

  return (
    <div className="border border-white/[0.06] bg-[#0a0a0a]/40 p-8 sm:p-12">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light">
        Already have a code?
      </p>
      <h3 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] leading-tight mb-3">
        See how many times it&apos;s been used.
      </h3>
      <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md mb-8">
        Enter the email you used to generate your code. We&apos;ll show you the
        code itself and how many follow-ups it&apos;s earned you.
      </p>

      <form onSubmit={lookup} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <fieldset className="flex-1">
            <label
              htmlFor="stats-email"
              className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
            >
              Your email
            </label>
            <input
              id="stats-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@private.email"
              className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors placeholder:text-[#3a3a3a] font-light"
            />
          </fieldset>
          <button
            type="submit"
            disabled={status.kind === "loading" || !email.trim()}
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status.kind === "loading" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Looking up
              </>
            ) : (
              <>
                <Search className="size-3.5" />
                Look up
              </>
            )}
          </button>
        </div>
      </form>

      {/* Result */}
      <div className="mt-8">
        {status.kind === "found" && status.data && (
          <div className="pt-6 border-t border-white/[0.04]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Your code
                </p>
                <code className="font-mono text-2xl sm:text-3xl text-[#c9a96e] tracking-[0.15em] font-light select-all">
                  {status.data.code}
                </code>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                  Times used
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl sm:text-4xl text-[#f0eee9] font-light">
                    {status.data.uses ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] tracking-[0.2em] uppercase text-[#c9a96e]/70">
                    <TrendingUp className="size-3" />
                    Follow-ups earned
                  </span>
                </div>
              </div>
            </div>
            {status.data.lastUsedAt && (
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-light">
                Last used{" "}
                {new Date(status.data.lastUsedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        )}

        {status.kind === "not-found" && (
          <div className="pt-6 border-t border-white/[0.04]">
            <p className="text-sm text-[#9a9a9a] font-light flex items-start gap-2">
              <AlertCircle className="size-4 mt-0.5 flex-shrink-0 text-[#c9a96e]/70" />
              <span>
                No referral found for that email. If you haven&apos;t generated a
                code yet, scroll up to the form.
              </span>
            </p>
          </div>
        )}

        {status.kind === "error" && (
          <div className="pt-6 border-t border-white/[0.04]">
            <p className="text-xs text-red-400/80 font-light flex items-start gap-2">
              <AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
              <span>{status.message}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
