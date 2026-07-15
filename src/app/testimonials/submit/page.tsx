"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, BadgeCheck } from "lucide-react";

/**
 * /testimonials/submit — public submission form.
 *
 * Long-form editorial layout matching the /testimonials page aesthetic:
 *   - dark cinematic background (#050505)
 *   - borderless inputs with bottom underline, gold focus underline
 *   - text-link-style submit button (no boxed button)
 *   - honeypot field "website" — bots fill it, humans never see it
 *
 * On submit → POST /api/testimonials with { quote, context, initials, email,
 * pattern?, bookingId?, website }.
 *
 * The testimonial is created with status='pending' regardless — admin
 * moderation is always required. If bookingId is provided AND the booking
 * exists + is completed + the email matches, a VerifiedReview record is
 * created linking the testimonial to the booking. The admin sees a
 * "Verified Session" badge in the moderation queue, signalling this is a
 * genuine session attendee — not an anonymous submission.
 *
 * URL params (set by the recap email + review-request email CTAs):
 *   - ?booking=<bookingId>   pre-fills the booking reference field
 *   - ?email=<encoded email> pre-fills the email field
 *
 * Success state replaces the form with a quiet editorial confirmation and a
 * link back to /testimonials. Errors are surfaced inline.
 *
 * Note: pattern enum must mirror TESTIMONIAL_PATTERNS in
 * /src/lib/security/validation.ts.
 */

const PATTERN_OPTIONS = [
  { value: "", label: "— None in particular —" },
  { value: "abandonment-loop", label: "Abandonment Loop" },
  { value: "control-pattern", label: "Control Pattern" },
  { value: "people-pleasing", label: "People-Pleasing" },
  { value: "emotional-numbness", label: "Emotional Numbness" },
  { value: "overthinking", label: "Overthinking" },
  { value: "self-doubt", label: "Self-Doubt" },
  { value: "other", label: "Other / not listed" },
] as const;

const submitSchema = z.object({
  quote: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(2000, "Please keep it under 2000 characters."),
  context: z
    .string()
    .trim()
    .min(3, "Tell us which session this was after.")
    .max(100, "Context must be under 100 characters."),
  initials: z
    .string()
    .trim()
    .min(2, "Initials are required (e.g. 'R., 34').")
    .max(20, "Initials must be under 20 characters."),
  email: z
    .string()
    .trim()
    .min(5, "Email is required for moderation reply.")
    .max(254, "Email is too long.")
    .email("Please enter a valid email."),
  pattern: z
    .string()
    .optional(),
  // Optional booking reference — if present + matches a completed booking
  // owned by this email, the testimonial is auto-verified on submit.
  bookingId: z
    .string()
    .trim()
    .max(100, "Booking reference too long.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Honeypot — must remain empty. Real users never see this field.
  website: z.string().max(0).optional(),
});

type SubmitFormValues = z.infer<typeof submitSchema>;

function SubmitTestimonialForm() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [submittedVerified, setSubmittedVerified] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // ─── Pre-fill from URL params (?booking=…&email=…) ───────────────
  // The recap email and review-request email CTAs include these params so
  // the submit form is pre-filled with the booking reference + email,
  // enabling the auto-verify flow (the user doesn't have to know or type
  // their booking ID). When both params are present, we also show a
  // banner explaining the Verified Session badge.
  const prefilledBooking = searchParams.get("booking") || "";
  const prefilledEmail = searchParams.get("email") || "";
  // Show the "we're glad you had a session" banner when EITHER the booking
  // reference OR the email came from the URL — both indicate this visit
  // came from a session email link.
  const showVerifiedBanner = Boolean(prefilledBooking || prefilledEmail);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      quote: "",
      context: "",
      initials: "",
      email: prefilledEmail,
      pattern: "",
      bookingId: prefilledBooking,
      website: "",
    },
  });

  const onSubmit = async (values: SubmitFormValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: values.quote,
          context: values.context,
          initials: values.initials,
          email: values.email,
          pattern: values.pattern || undefined,
          bookingId: values.bookingId || undefined,
          // Honeypot — must be empty. Real users never see this field.
          website: values.website || "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 429 / 400 / 500 — surface the message
        setServerError(
          data.error ||
            (res.status === 429
              ? "Too many submissions. Please try again later."
              : "Something went wrong. Please try again.")
        );
        return;
      }

      // 201 — success. The testimonial is always 'pending' (admin moderates),
      // but if `verified` is true, a VerifiedReview row links it to a
      // completed booking — the admin will see a "Verified Session" badge
      // in the moderation queue, signalling this is a genuine session
      // attendee.
      setSubmittedVerified(Boolean(data.verified));
      setSubmitted(true);
    } catch {
      setServerError("Network error — please retry.");
    }
  };

  // ─── Success state ────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f0eee9] flex items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center">
          <div className="w-12 h-px bg-[#c9a96e]/40 mx-auto mb-8" />
          {submittedVerified ? (
            <div className="inline-flex items-center gap-2 text-[#c9a96e] mb-8">
              <BadgeCheck className="size-10" strokeWidth={1} />
            </div>
          ) : (
            <CheckCircle2 className="size-10 text-[#c9a96e]/80 mx-auto mb-8" strokeWidth={1} />
          )}
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            {submittedVerified ? "Verified & awaiting review" : "Received"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-[-0.02em] mb-6 leading-tight">
            {submittedVerified
              ? "Thank you. Your verified testimonial is awaiting review."
              : "Thank you. Your words are awaiting review."}
          </h1>
          <p className="text-[#9a9a9a] text-base leading-[1.8] font-light mb-10 max-w-md mx-auto">
            {submittedVerified
              ? "Because you linked your booking reference, your testimonial is marked as a Verified Session. Each submission is still read by hand — if your pattern is selected to be published, it will appear anonymously with a gold 'Verified Session' badge, alongside your first-initial, age, and the session it followed."
              : "Each submission is read by hand. If your pattern is selected to be published, it will appear anonymously — first-initial, age, and the session it followed."}
          </p>
          <Link
            href="/testimonials"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Return to testimonials
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  // ─── Form state ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Testimonials", href: "/testimonials" },
                { label: "Share your experience" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Submit a testimonial
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            If a pattern was named, name it back.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            What you write here will not be published immediately. It will be
            read, and if it should be shared, it will appear anonymously — first
            initial, age, the session it followed. Your email is for moderation
            reply only. It will never appear on the site.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {/* ─── Verified-session banner (shown when ?booking or ?email in URL) ───
            When the visitor arrives from a recap or review-request email,
            they land with ?booking=…&email=… in the URL. The banner lets
            them know their testimonial will be linked to their booking and
            (if email matches) will show a Verified badge in the moderation
            queue. */}
        {showVerifiedBanner && (
          <div className="mb-12 p-5 border border-[#c9a96e]/30 bg-[#c9a96e]/[0.03] flex items-start gap-3">
            <BadgeCheck
              className="size-5 text-[#c9a96e] flex-shrink-0 mt-0.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] mb-2 font-light">
                Verified session
              </p>
              <p className="text-sm text-[#cfcabf] font-light leading-[1.7]">
                We&rsquo;re glad you had a session with us. Your booking
                reference is pre-filled below — if your email matches the
                booking, your testimonial will be marked with a{" "}
                <span className="inline-flex items-center gap-1 text-[#c9a96e] align-middle">
                  <BadgeCheck className="size-3" strokeWidth={1.5} />
                  <span
                    className="text-[9px] tracking-[0.2em] uppercase"
                    style={{ fontFamily: "Cinzel, Georgia, serif" }}
                  >
                    Verified
                  </span>
                </span>{" "}
                badge in the moderation queue, signalling to the moderator
                that this is a genuine session attendee. Each submission is
                still read by hand.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-12">
          {/* Honeypot — visually hidden, tabbable=false, autocomplete=off */}
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

          {/* QUOTE */}
          <fieldset>
            <label
              htmlFor="quote"
              className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
            >
              Your words
            </label>
            <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
              Write what happened. Specificity is the only evidence that matters
              in this work — vague praise means nothing. 10 to 2000 characters.
            </p>
            <textarea
              id="quote"
              rows={8}
              placeholder="I came in asking whether I should leave my marriage. I left understanding that the question itself was the pattern…"
              {...register("quote")}
              className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base sm:text-lg text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors resize-none placeholder:text-[#3a3a3a] font-serif font-light italic leading-[1.8]"
            />
            {errors.quote && (
              <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
                <AlertCircle className="size-3" />
                {errors.quote.message}
              </p>
            )}
          </fieldset>

          {/* CONTEXT */}
          <fieldset>
            <label
              htmlFor="context"
              className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
            >
              Which session was this after?
            </label>
            <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
              e.g. &ldquo;After Relationship Pattern Analysis&rdquo; or &ldquo;After
              Shadow Session.&rdquo; 3 to 100 characters.
            </p>
            <input
              id="context"
              type="text"
              placeholder="After Relationship Pattern Analysis"
              {...register("context")}
              className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors placeholder:text-[#3a3a3a] font-light"
            />
            {errors.context && (
              <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
                <AlertCircle className="size-3" />
                {errors.context.message}
              </p>
            )}
          </fieldset>

          {/* INITIALS + EMAIL (two-column on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <fieldset>
              <label
                htmlFor="initials"
                className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
              >
                Initials &amp; age
              </label>
              <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
                e.g. &ldquo;R., 34&rdquo; — this is what will appear publicly.
              </p>
              <input
                id="initials"
                type="text"
                placeholder="R., 34"
                {...register("initials")}
                className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors placeholder:text-[#3a3a3a] font-light"
              />
              {errors.initials && (
                <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
                  <AlertCircle className="size-3" />
                  {errors.initials.message}
                </p>
              )}
            </fieldset>

            <fieldset>
              <label
                htmlFor="email"
                className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
              >
                Your email
              </label>
              <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
                For moderation reply only. Never displayed publicly.
              </p>
              <input
                id="email"
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
          </div>

          {/* BOOKING REFERENCE (optional — drives Verified Session badge) */}
          <fieldset>
            <label
              htmlFor="bookingId"
              className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
            >
              Booking reference{" "}
              <span className="text-[#5a5a5a] normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
              If you have a session booking ID, enter it to flag your
              testimonial as a{" "}
              <span className="inline-flex items-center gap-1 text-[#c9a96e] align-middle">
                <BadgeCheck className="size-3" strokeWidth={1.5} />
                <span
                  className="text-[9px] tracking-[0.2em] uppercase"
                  style={{ fontFamily: "Cinzel, Georgia, serif" }}
                >
                  Verified Session
                </span>
              </span>
              . Verified testimonials are still read by hand, but the
              Verified badge tells the moderator this is a genuine session
              attendee — not an anonymous submission. Anonymous submissions
              without a booking reference still work — they just go through
              the moderation queue without the badge.
            </p>
            <input
              id="bookingId"
              type="text"
              autoComplete="off"
              placeholder="e.g. ckxxxxxxxxxxxxxxxx"
              {...register("bookingId")}
              className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors placeholder:text-[#3a3a3a] font-light font-mono"
            />
            {errors.bookingId && (
              <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
                <AlertCircle className="size-3" />
                {errors.bookingId.message}
              </p>
            )}
          </fieldset>

          {/* PATTERN */}
          <fieldset>
            <label
              htmlFor="pattern"
              className="block text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] mb-3 font-light"
            >
              Pattern surfaced (optional)
            </label>
            <p className="text-[#5a5a5a] text-xs font-light mb-4 leading-relaxed">
              If a specific pattern was named in the session, choose it here.
              Optional — leave blank if none fits.
            </p>
            <select
              id="pattern"
              {...register("pattern")}
              className="w-full bg-transparent border-b border-white/[0.1] px-1 py-3 text-base text-[#f0eee9] focus:border-[#c9a96e] focus:outline-none transition-colors font-light appearance-none cursor-pointer"
            >
              {PATTERN_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-[#050505] text-[#f0eee9]"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.pattern && (
              <p className="mt-2 text-xs text-red-400/80 font-light flex items-center gap-1.5">
                <AlertCircle className="size-3" />
                {errors.pattern.message}
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
                  Sending for review
                </>
              ) : (
                <>
                  Submit for review
                  <ArrowRight className="size-3.5 text-[#c9a96e]" />
                </>
              )}
            </button>
            <p className="text-[10px] text-[#5a5a5a] mt-4 font-light leading-relaxed max-w-md">
              Submissions are rate-limited to three per hour. You will receive a
              confirmation reply at the email you provided once your testimonial
              has been read.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

/**
 * Default export wraps the form in <Suspense> because useSearchParams() is
 * used inside (Next.js 16 requirement — pages using useSearchParams must be
 * wrapped so the static-render shell can degrade gracefully).
 */
export default function SubmitTestimonialPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050505] text-[#f0eee9] flex items-center justify-center">
          <Loader2 className="size-6 text-[#c9a96e]/60 animate-spin" />
        </main>
      }
    >
      <SubmitTestimonialForm />
    </Suspense>
  );
}
