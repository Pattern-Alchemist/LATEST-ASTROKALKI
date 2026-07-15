"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * LeadMagnet — a calm, inline email-capture section that offers a free
 * resource (Pattern Recognition Guide) in exchange for an email address.
 *
 * Design principles:
 *   - Feels like a natural section, not a popup or interruption
 *   - Gold-on-dark aesthetic matching the AstroKalki design system
 *   - Minimal copy focused on the value of the resource
 *   - Success state with confirmation + secondary CTA to booking
 *   - Honeypot field for bot protection
 *   - Wires to POST /api/lead-magnets for delivery + drip enrollment
 */

const LEAD_MAGNET_TYPE = "pattern-guide";

interface LeadMagnetProps {
  /** Optional variant to differentiate placement styling */
  variant?: "default" | "compact";
  /** Optional className for additional styling */
  className?: string;
}

export default function LeadMagnet({
  variant = "default",
  className = "",
}: LeadMagnetProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/lead-magnets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || email.split("@")[0],
          leadMagnetType: LEAD_MAGNET_TYPE,
          // Honeypot — must be empty for real users
          website: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);

      // Fire analytics event (non-blocking)
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "lead_magnet_download",
          data: { type: LEAD_MAGNET_TYPE },
          page: "/",
        }),
      }).catch(() => {});
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  };

  const isCompact = variant === "compact";

  return (
    <section
      className={`relative ${isCompact ? "py-20 sm:py-24" : "py-32 sm:py-48"} px-6 sm:px-10 lg:px-16 ${className}`}
    >
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              {/* Gold accent line */}
              <div className="w-12 h-px bg-[#c9a96e]/40 mb-8" />

              {/* Section label */}
              <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-6 font-light">
                Free Resource
              </p>

              {/* Headline */}
              <h2 className="text-[#f0eee9] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.08] tracking-[-0.02em] font-serif font-light mb-5">
                The Pattern Recognition Guide
              </h2>

              {/* Description */}
              <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] max-w-md mb-8 font-light">
                24 pages. Seven patterns. One question you have been avoiding.
              </p>
              <p className="text-[#7a7a7a] text-sm leading-[1.85] max-w-md mb-10 font-light">
                This is not a horoscope. It is a map of the architecture
                beneath your repeating choices — written in the same plain
                language as every session. Enter your email, and it lands in
                your inbox.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="max-w-md space-y-5">
                {/* Name field (optional) */}
                <div className="border-b border-white/[0.1] pb-2">
                  <label htmlFor="lead-magnet-name" className="sr-only">
                    Your first name
                  </label>
                  <input
                    id="lead-magnet-name"
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    autoComplete="name"
                    className="w-full bg-transparent text-sm text-[#f0eee9] focus:outline-none placeholder:text-[#3a3a3a] font-light py-1"
                  />
                </div>

                {/* Email field (required) */}
                <div className="border-b border-white/[0.1] pb-2">
                  <label htmlFor="lead-magnet-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="lead-magnet-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-[#f0eee9] focus:outline-none placeholder:text-[#3a3a3a] font-light py-1"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-lg text-sm tracking-wide overflow-hidden transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {/* Gradient border background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c9a96e] via-[#e8d5b7] to-[#a8884d] rounded-lg p-px" />
                  <div className="absolute inset-px bg-[#050505] rounded-[6px] transition-all duration-500 group-hover:bg-[#0a0a0a]" />

                  {/* Shimmer */}
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e8e6e1]/15 to-transparent animate-shimmer" />
                  </div>

                  {/* Content */}
                  <span className="relative z-10 flex items-center gap-2 text-[#c9a96e] group-hover:text-[#e8e6e1] transition-colors duration-400">
                    {submitting ? "Sending…" : "Send me the guide"}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-400 ${
                        submitting ? "" : "group-hover:translate-x-1"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </button>

                {/* Privacy note */}
                <p className="text-[10px] text-[#5a5a5a] mt-4 leading-relaxed font-light">
                  We respect your inbox. No spam. Unsubscribe anytime. Your
                  email is used only to deliver this guide and occasional
                  pattern observations.
                </p>
              </form>

              {/* Error state */}
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-red-400/80 text-sm font-light border-l-2 border-red-400/40 pl-3"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          ) : (
            /* ── Success state ─────────────────────────────────── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="w-12 h-px bg-[#c9a96e]/40 mb-8 mx-auto" />

              <div className="w-14 h-14 rounded-full border border-[#4ade80]/30 flex items-center justify-center mx-auto mb-6">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <h2 className="text-[#f0eee9] text-2xl sm:text-3xl font-serif font-light mb-4 leading-tight">
                Your guide is on its way
              </h2>
              <p className="text-[#9a9a9a] text-sm leading-[1.85] max-w-sm mx-auto mb-8 font-light">
                The Pattern Recognition Guide has been sent to{" "}
                <span className="text-[#cfcabf]">{email}</span>. It should
                arrive within a few minutes.
              </p>
              <p className="text-[#7a7a7a] text-xs leading-[1.8] max-w-xs mx-auto mb-10 font-light">
                In the meantime — if one of the seven patterns in the guide
                names something you recognise, a full decode session is where
                the real work begins.
              </p>
              <a
                href="/#booking"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500"
              >
                Book a session <span>→</span>
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
