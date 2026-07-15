"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

/**
 * ReferralForm — client component for the /refer page.
 *
 * Two states:
 *   1. Code generator form (name + email → POST /api/referrals)
 *   2. Success: shows the generated code with Copy + WhatsApp share buttons,
 *      plus a "Generate another" link that returns to the form (keeping the
 *      email pre-filled for stats lookup).
 *
 * Form: borderless inputs with bottom underline, gold focus underline —
 * matches booking.tsx + testimonials/submit.
 *
 * Honeypot: hidden "website" field that real users never see.
 */

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please share your name (at least 2 characters).")
    .max(80, "Name must be under 80 characters.")
    .regex(
      /^[\p{L}\p{M}'’\-.\s]+$/u,
      "Name may only contain letters, spaces, hyphens, and apostrophes."
    ),
  email: z
    .string()
    .trim()
    .min(5, "Email is required.")
    .max(254, "Email is too long.")
    .email("Please enter a valid email.")
    .refine((e) => !e.endsWith(".con"), "Did you mean .com?")
    .refine((e) => !e.endsWith(".cm"), "Did you mean .com?"),
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GeneratedCode {
  code: string;
  referrerName: string;
  uses: number;
}

export default function ReferralForm() {
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", website: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          website: values.website || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(
          data.error ||
            (res.status === 429
              ? "Too many requests. Please try again later."
              : "Something went wrong. Please try again.")
        );
        return;
      }
      setGenerated({
        code: data.code,
        referrerName: data.referrerName || values.name,
        uses: data.uses ?? 0,
      });
    } catch {
      setServerError("Network error — please retry.");
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.code);
      setCopied(true);
      // Reset after 2.5s
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback — select-then-copy via a hidden textarea
      const ta = document.createElement("textarea");
      ta.value = generated.code;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        setServerError("Copy failed — please copy the code manually.");
      }
      document.body.removeChild(ta);
    }
  };

  const whatsappShareUrl = generated
    ? `https://wa.me/?text=${encodeURIComponent(
        `I thought of you. I've been doing pattern work with AstroKalki — psychologically-grounded astrology, no horoscopes. If you book a session, use my code ${generated.code}.\n\nhttps://astrokalki.com/services?ref=${generated.code}`
      )}`
    : "#";

  const handleReset = () => {
    setGenerated(null);
    setServerError(null);
    setCopied(false);
    reset({ name: "", email: "", website: "" });
  };

  /* ─── Success state ─────────────────────────────────────────────── */
  if (generated) {
    return (
      <div className="border border-white/[0.06] bg-[#0a0a0a]/40 p-8 sm:p-12">
        {/* Eyebrow + heading */}
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
          Your code is live
        </p>
        <h3 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3 leading-tight">
          Share it. The pattern finds its people.
        </h3>
        <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md mb-10">
          When someone books their first session using this code, you get a
          free 30-minute follow-up. No limit on how many times it works.
        </p>

        {/* The code itself */}
        <div className="mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3 font-light">
            Your code
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <code
              className="font-mono text-3xl sm:text-5xl text-[#c9a96e] tracking-[0.15em] font-light select-all"
              aria-label="Your referral code"
            >
              {generated.code}
            </code>
            <button
              onClick={handleCopy}
              type="button"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400/80" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats line */}
        <div className="mb-10 pb-10 border-b border-white/[0.04]">
          <div className="grid grid-cols-2 gap-6 max-w-sm">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1 font-light">
                Times used
              </p>
              <p className="font-mono text-2xl text-[#f0eee9] font-light">
                {generated.uses}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1 font-light">
                Follow-ups earned
              </p>
              <p className="font-mono text-2xl text-[#c9a96e] font-light">
                {generated.uses}
              </p>
            </div>
          </div>
        </div>

        {/* Share row */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Share on WhatsApp
            <ExternalLink className="size-3.5" />
          </a>
          <button
            onClick={handleReset}
            type="button"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors duration-500"
          >
            <RefreshCw className="size-3.5" />
            Generate another
          </button>
        </div>

        {/* Helper text */}
        <p className="text-[10px] text-[#5a5a5a] mt-10 font-light leading-relaxed max-w-md">
          Tip: paste the code into the &ldquo;referred by&rdquo; field when
          someone you&apos;ve shared it with is on the booking form. The code is
          case-insensitive.
        </p>
      </div>
    );
  }

  /* ─── Form state ────────────────────────────────────────────────── */
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="border border-white/[0.06] bg-[#0a0a0a]/40 p-8 sm:p-12 space-y-10"
    >
      <div>
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light">
          Generate your code
        </p>
        <h3 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] leading-tight mb-3">
          Two fields. Eight characters.
        </h3>
        <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] max-w-md">
          We use your name + email to generate a unique code. If you already
          have one, we&apos;ll return it instead of creating a duplicate.
        </p>
      </div>

      {/* Honeypot */}
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
        <label htmlFor="website">Website (leave empty)</label>
        <input
          type="text"
          id="website"
          autoComplete="off"
          tabIndex={-1}
          {...register("website")}
        />
      </div>

      {/* NAME */}
      <fieldset>
        <label
          htmlFor="ref-name"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
        >
          Your name
        </label>
        <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
          The name attached to your code. Used only so we know who earned the
          follow-up.
        </p>
        <input
          id="ref-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          {...register("name")}
          className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors placeholder:text-[#3a3a3a] font-light"
        />
        {errors.name && (
          <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
            <AlertCircle className="size-3" />
            {errors.name.message}
          </p>
        )}
      </fieldset>

      {/* EMAIL */}
      <fieldset>
        <label
          htmlFor="ref-email"
          className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
        >
          Your email
        </label>
        <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
          The email you book sessions with. This is how we match your referrals
          to your account.
        </p>
        <input
          id="ref-email"
          type="email"
          autoComplete="email"
          placeholder="you@private.email"
          {...register("email")}
          className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors placeholder:text-[#3a3a3a] font-light"
        />
        {errors.email && (
          <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
            <AlertCircle className="size-3" />
            {errors.email.message}
          </p>
        )}
      </fieldset>

      {/* SERVER ERROR */}
      {serverError && (
        <div className="border border-red-400/20 bg-red-400/[0.04] p-4">
          <p className="text-xs text-red-400/90 font-light flex items-start gap-2">
            <AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
            <span>{serverError}</span>
          </p>
        </div>
      )}

      {/* SUBMIT */}
      <div className="pt-6 border-t border-white/[0.04]">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Generating
            </>
          ) : (
            <>
              Generate my code
              <ArrowRight className="size-3.5 text-[#c9a96e]" />
            </>
          )}
        </button>
        <p className="text-[10px] text-[#5a5a5a] mt-4 font-light leading-relaxed max-w-md">
          Code generation is rate-limited to 5 per hour per device. If you
          already have a code with this email, we&apos;ll return it.
        </p>
      </div>
    </form>
  );
}
