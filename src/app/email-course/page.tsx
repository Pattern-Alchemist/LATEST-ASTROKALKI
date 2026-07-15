import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import EmailCourseForm from "./EmailCourseForm";

/**
 * /email-course — landing page for the free 5-day "Pattern Recognition
 * Foundations" email course.
 *
 * Lead magnet: a substantial (800–1200 word) email lands daily for five days.
 * Each email teaches one foundational pattern-recognition concept in the
 * AstroKalki voice, ending with a reflective question and a soft CTA to
 * book a session.
 *
 * Visual language: matches /membership, /services — dark editorial, generous
 * whitespace, Roman-numeral curriculum numbering, thin gold dividers,
 * borderless email input with gold underline.
 */

export const metadata: Metadata = {
  title: "The 5-Day Pattern Recognition Foundations Course — AstroKalki",
  description:
    "A free 5-day email course on pattern recognition. One substantial email per day — what a pattern is, the abandonment loop, the control pattern, people-pleasing as self-abandonment, and what to do next. Direct, psychological, no mystical jargon.",
  alternates: { canonical: "https://astrokalki.com/email-course" },
  openGraph: {
    title: "The 5-Day Pattern Recognition Foundations Course — AstroKalki",
    description:
      "Five days. Five emails. The four patterns that show up most often in thousands of readings — and how to start seeing your own. Free.",
    type: "website",
    url: "https://astrokalki.com/email-course",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "5-Day Pattern Recognition Foundations — AstroKalki",
    description:
      "A free 5-day email course. What a pattern is, the abandonment loop, the control pattern, people-pleasing as self-abandonment, and what to do next.",
  },
  keywords: [
    "pattern recognition",
    "abandonment loop",
    "control pattern",
    "people pleasing",
    "self abandonment",
    "free email course",
    "psychological patterns",
    "depth psychology course",
  ],
};

const CURRICULUM = [
  {
    number: "01",
    title: "What is a pattern?",
    summary:
      "Pattern recognition vs. prediction. Why the same pain keeps showing up with a different face. The chart as a diagnostic tool — not a forecast.",
    outcome:
      "A working definition of a pattern you can use the same day. One exercise to catch your own stance in real time.",
  },
  {
    number: "02",
    title: "The abandonment loop",
    summary:
      "The most common pattern AstroKalki sees. How it forms in childhood, how it shows up in adult relationships — and why “just communicate” doesn’t fix it.",
    outcome:
      "The signature shape of the loop in your life. The first concrete repetition that interrupts it.",
  },
  {
    number: "03",
    title: "The control pattern",
    summary:
      "When managing your environment becomes the pattern itself. The difference between agency and control. Why “I have to handle everything” is sometimes the loop talking.",
    outcome:
      "A precise test to tell agency from control. One small letting-go you can do today.",
  },
  {
    number: "04",
    title: "People-pleasing as self-abandonment",
    summary:
      "The cost of being easy to be with. How attending to others’ needs becomes the most effective way to never meet your own.",
    outcome:
      "Why boundaries aren’t the first move. The actual first move — and how to survive the guilt that comes with it.",
  },
  {
    number: "05",
    title: "What to do next",
    summary:
      "Integration. Naming is the beginning, not the end. When self-work is enough, when a session helps, and how to tell the difference.",
    outcome:
      "A clear map for the months ahead — and a soft, unhurried door into a session if you want one.",
  },
];

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Pattern Recognition Foundations",
  description:
    "A free 5-day email course on pattern recognition. What a pattern is, the abandonment loop, the control pattern, people-pleasing as self-abandonment, and what to do next.",
  provider: {
    "@type": "Organization",
    name: "AstroKalki",
    sameAs: "https://astrokalki.com",
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "Online",
    courseWorkload: "PT15M",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
};

export default function EmailCoursePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "5-Day Course" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Free 5-Day Email Course
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Pattern recognition,{" "}
            <span className="text-[#c9a96e] italic">foundations.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl mb-10">
            Five days. Five emails. The four patterns that show up most often across thousands of readings — and how to start seeing your own. No mystical jargon. No horoscope language. Just a working vocabulary for the stance you&apos;ve been holding so long you forgot it was a stance.
          </p>

          {/* Signup form */}
          <EmailCourseForm />

          <p className="mt-10 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            5 emails · 1 per day · No cost · Unsubscribe anytime
          </p>
        </div>
      </header>

      {/* ─── Why this course ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10 border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Why this course exists
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-6 leading-[1.15]">
            Most people go their whole lives without ever catching their own pattern in the act.
          </h2>
          <div className="space-y-5 text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8]">
            <p>
              The same argument in a different kitchen. The same kind of person on the other side of the table. The same exit you keep walking toward, just through different doors. We call it bad luck, or fate, or “just the way I am.” None of those words help.
            </p>
            <p>
              A pattern is a stance you took, once, to survive something — and kept taking long after the thing you were surviving was over. The first move of the work is not to fix anything. It&apos;s to see the stance. That&apos;s what this course does. Five days of language for what you&apos;re already doing.
            </p>
            <p className="text-[#9a9a9a] italic font-serif">
              This is not a horoscope. It is not a forecast. It is a diagnostic — for the posture you&apos;ve been holding so long you forgot it was a posture.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Curriculum ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              The five days
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
              One idea per day. Each one a foundation.
            </h2>
            <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              Each email is substantial — roughly a thousand words — and ends with a reflective question and one small exercise. You&apos;ll read it in five minutes. You&apos;ll sit with it for the rest of the day.
            </p>
          </div>

          <div className="border-t border-white/[0.06]">
            {CURRICULUM.map((item) => (
              <div
                key={item.number}
                className="border-b border-white/[0.06] py-10 sm:py-14 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10"
              >
                <div className="md:col-span-2">
                  <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/50 font-mono">
                    {item.number}
                  </span>
                </div>
                <div className="md:col-span-10">
                  <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-4 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.8] mb-4 font-light max-w-2xl">
                    {item.summary}
                  </p>
                  <p className="text-[12px] text-[#c9a96e]/80 leading-[1.7] font-light italic font-serif">
                    You&apos;ll leave with: {item.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who this is for ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10 border-b border-white/[0.04] bg-white/[0.015]">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Who this is for
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-10">
            You&apos;ll get a lot out of this if…
          </h2>
          <ul className="space-y-5">
            {[
              "You keep ending up in the same relationship with a different face on the other side of the table.",
              "You’re the one who holds it together — and you’re tired in a way sleep doesn’t fix.",
              "You’re described as easy to be with, generous, low-drama — and you’re almost never with yourself.",
              "You’ve read the self-help books and you understand the pattern intellectually, but your body is still doing it anyway.",
              "You’re curious about pattern work but not ready to book a session yet — you want to feel out the voice first.",
            ].map((line, i) => (
              <li
                key={i}
                className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] flex gap-4"
              >
                <span className="text-[#c9a96e] shrink-0 mt-1">—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── What this is not ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10 border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            What this is not
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-10">
            Let&apos;s be honest about the limits.
          </h2>
          <div className="space-y-6 text-base text-[#cfcabf] font-light leading-[1.8]">
            <p>
              This course will give you language. It will not fix anything. You can name the abandonment loop on a Tuesday and still find yourself standing in it on Friday. Naming is the beginning, not the end.
            </p>
            <p>
              It is also not therapy. It is not a replacement for clinical care. If you are in crisis or working with a therapist on trauma recovery, this course is a complement, not a substitute. We will say so directly if we think therapy is the more appropriate next step.
            </p>
            <p>
              And it is not a horoscope. There is no chart to read here, no forecast, no mystical language. Just five days of psychological specificity. The chart comes later, if you ever want it — in a session, against your specific history.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Begin
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-6 leading-[1.15]">
            Five days from now, you&apos;ll have a{" "}
            <span className="text-[#c9a96e] italic">vocabulary</span> for what
            you&apos;ve been doing.
          </h2>
          <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] mb-12 max-w-xl mx-auto">
            The course is free. The first email lands in your inbox the moment you sign up.
          </p>

          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <EmailCourseForm />
            </div>
          </div>

          <p className="mt-12 text-[12px] text-[#5a5a5a] font-light">
            Prefer to start with a session instead?{" "}
            <Link
              href="/#booking"
              className="text-[#c9a96e] hover:text-[#f0eee9] transition-colors border-b border-[#c9a96e]/30 hover:border-[#c9a96e] pb-0.5"
            >
              Book a reading
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
