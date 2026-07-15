"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { openWhatsApp } from "@/lib/whatsapp";
import { useI18n } from "@/lib/i18n-context";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);

    fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "website",
        // Honeypot — must be empty. Real users never see this field.
        website: "",
      }),
    }).catch(() => {});

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "newsletter_signup", data: { source: "website" }, page: "/" }),
    }).catch(() => {});

    openWhatsApp({ type: "newsletter", email });
  };

  return (
    <section id="newsletter" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-2xl mx-auto">
        <div>
          <h2 className="text-[#f0eee9] text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.02em] font-serif font-light mb-5">
            {t("newsletter.headline")}
          </h2>
          <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] max-w-md mb-12 font-light">
            {t("newsletter.subtitle")}
          </p>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="max-w-md"
              method="post"
            >
              <div className="flex gap-3 border-b border-white/[0.1] pb-3">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  aria-label="Email address"
                  className="flex-1 bg-transparent text-sm text-[#f0eee9] focus:outline-none placeholder:text-[#3a3a3a] font-light"
                />
                <button
                  type="submit"
                  name="subscribe"
                  className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500 cursor-pointer whitespace-nowrap font-light"
                >
                  Subscribe →
                </button>
              </div>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-[#25D366]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-sm font-light">
                {t("newsletter.redirecting")}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
