import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import PatternQuiz from "./PatternQuiz";

/**
 * Pattern Atlas quiz — "Find your pattern".
 *
 * Server component. Renders the editorial header (breadcrumbs, eyebrow,
 * headline, intro) and the interactive <PatternQuiz /> client component,
 * which owns all quiz state (question flow, scoring, result reveal).
 *
 * SEO: indexed as a tool page with a stable canonical. The result card is
 * rendered client-side after interaction (no shared result URL by design —
 * we don't want a hundred /quiz?result=the-rescuer pages competing with the
 * canonical /patterns/atlas/the-rescuer page in the index).
 */

export const metadata: Metadata = {
  title: "Find Your Pattern — AstroKalki Pattern Atlas Quiz",
  description:
    "A seven-question quiz that maps your answers to the ten AstroKalki Atlas patterns — The Rescuer, The Abandonment, The Performer, The Invisible Child, The Emotional Caretaker, The Self-Sabotage, The Chaser, The Avoider, The Outsider, The Hyper-Independent, The Overthinker. Get your pattern in three minutes.",
  alternates: { canonical: "https://astrokalki.com/patterns/atlas/quiz" },
  openGraph: {
    title: "Find Your Pattern — AstroKalki Pattern Atlas Quiz",
    description:
      "Seven questions. Ten patterns. The one pattern that matches you most precisely — with a synthesis of why, and a link to the full diagnostic page.",
    type: "website",
    url: "https://astrokalki.com/patterns/atlas/quiz",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Your Pattern — AstroKalki Pattern Atlas Quiz",
    description:
      "Seven questions to land on the one Atlas pattern that matches you most precisely.",
  },
  keywords: [
    "pattern quiz",
    "which pattern am I",
    "psychological patterns quiz",
    "emotional pattern test",
    "attachment pattern quiz",
    "self-diagnostic",
    "AstroKalki quiz",
  ],
};

export default function QuizPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* Editorial header — breadcrumbs, eyebrow, headline, intro */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Pattern Atlas", href: "/patterns/atlas" },
                { label: "Quiz" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Find your pattern
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Seven questions.
            <br />
            <span className="text-[#7a7a7a]">Ten patterns.</span>
            <br />
            <span className="text-[#c9a96e] italic">One answer.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            The Atlas is a library of ten psychological patterns, each
            structured the same way. This quiz weighs your answers against all
            ten and lands you on the one that matches you most precisely —
            with a synthesis of why, and a link to the full diagnostic page.
          </p>
          <p className="mt-8 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            7 questions · About 3 minutes · No email required
          </p>
        </div>
      </header>

      {/* Quiz — interactive client component */}
      <PatternQuiz />
    </main>
  );
}
