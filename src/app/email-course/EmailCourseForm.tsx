"use client";

/**
 * Email course signup form.
 *
 * Visible state machine:
 *   idle    → email input + text-link submit
 *   loading → submitting… (disabled input)
 *   success → "Check your inbox" confirmation
 *   error   → inline error, retry allowed
 *
 * Submit flow:
 *   1. Client-side validation (basic email format).
 *   2. POST /api/email-course with { email, website: "" } (honeypot).
 *   3. The API handles:
 *        - Already enrolled → returns 200 with friendly message
 *        - New enrollment   → returns 201 with Day 1 dispatched message
 *        - Both surfaces as "success" state with the API's message.
 *
 * Visual language: borderless email input with thin gold underline, text-link
 * submit — matches the newsletter component at /components/astrokalki/newsletter.tsx.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(5, "Email is too short")
    .max(254, "Email is too long")
    .email("Enter a valid email"),
  // Honeypot — must stay empty. Real users never see this field.
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function EmailCourseForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", website: "" },
  });

  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onSubmit = async (values: FormValues) => {
    setStatus({ kind: "loading" });

    try {
      const res = await fetch("/api/email-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          // Honeypot — must be empty. Real users never see this field.
          website: values.website ?? "",
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        const message =
          data.error ||
          (res.status === 429
            ? "Too many attempts. Try again in a few minutes."
            : "Something went wrong. Try again.")
            ;
        setStatus({ kind: "error", message });
        return;
      }

      // Both 201 (new enrollment) and 200 (already enrolled) land here.
      const message =
        data.message || "Check your inbox — Day 1 is on its way.";
      setStatus({ kind: "success", message });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  };

  // ─── Success state ───────────────────────────────────────────────────────
  if (status.kind === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-md"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 pb-3 border-b border-[#c9a96e]/30">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9a96e"
            strokeWidth="1.5"
            className="mt-1 shrink-0"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <div>
            <p className="text-sm text-[#f0eee9] font-light leading-[1.7]">
              {status.message}
            </p>
            <p className="text-[11px] text-[#7a7a7a] font-light mt-2 leading-[1.7]">
              Day 1 is in your inbox now. Days 2 through 5 will arrive one per
              day. Whitelist <span className="text-[#c9a96e]">astrokalki.com</span> so they don&apos;t land in spam.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Form state (idle / loading / error) ─────────────────────────────────
  const isLoading = status.kind === "loading";
  const errorMessage = status.kind === "error" ? status.message : errors.email?.message;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md"
      noValidate
      aria-label="Start the free 5-day email course"
    >
      {/* Honeypot — visually hidden, also labelled for screen readers */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="ec-website">Leave this empty</label>
        <input
          id="ec-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="flex gap-3 border-b border-white/[0.1] pb-3 focus-within:border-[#c9a96e]/60 transition-colors duration-500">
        <input
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          aria-label="Email address"
          aria-invalid={Boolean(errorMessage)}
          disabled={isLoading}
          {...register("email")}
          className="flex-1 bg-transparent text-sm text-[#f0eee9] focus:outline-none placeholder:text-[#3a3a3a] font-light disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500 cursor-pointer whitespace-nowrap font-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending…" : "Start the course →"}
        </button>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-[#a58a54] mt-3 font-light"
            role="alert"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-[#5a5a5a] mt-4 font-light leading-[1.7]">
        Five emails. One per day. No spam. Unsubscribe with one click.
      </p>
    </form>
  );
}
