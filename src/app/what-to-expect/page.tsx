import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What to Expect — AstroKalki",
  description:
    "A 60-minute session, conducted over video, focused on naming the specific pattern running your relationships and choices. Here's exactly how it works — before, during, and after.",
  alternates: { canonical: "https://astrokalki.com/what-to-expect" },
  openGraph: {
    title: "What to Expect — AstroKalki",
    description:
      "How a session actually works. Before, during, after. No mysticism, no horoscope language.",
    type: "website",
    url: "https://astrokalki.com/what-to-expect",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "What to Expect — AstroKalki" }],
  },
};

const STEPS = [
  {
    phase: "Before",
    title: "You book. You send your birth details.",
    body: "You pick a duration (30, 60, or 90 minutes). You send your date, time, and place of birth. The more accurate the time, the deeper the reading — but if you don't know it exactly, we can still work with a window.",
    note: "You'll receive an email confirmation with everything you submitted. No payment until the session is confirmed on WhatsApp.",
  },
  {
    phase: "Before",
    title: "I prepare your chart.",
    body: "I spend time with your chart before we meet. I'm not just pulling up a generic reading — I'm looking at the specific patterns visible in your placements. This is why the first session can go deep quickly: the work has already started.",
    note: "If you have a specific situation you want looked at (a relationship, a recurring choice, a pattern you suspect), mention it in your booking message.",
  },
  {
    phase: "During",
    title: "We meet over video.",
    body: "60 minutes (or 30, or 90 — your choice). No recording unless you ask. The session is conversational, not monologue. I'll name what I see; you tell me what lands. The reading sharpens as we go — your reactions tell me which threads to pull.",
    note: "You can stop, ask questions, push back, or ask me to slow down. This is not a performance. It's a conversation.",
  },
  {
    phase: "During",
    title: "I name the pattern.",
    body: "Usually within the first 20 minutes. The pattern has a name, a structure, and a story — and once you see it, you can't unsee it. This is the core of the work. Everything else follows from this moment of recognition.",
    note: "If the pattern I name doesn't land, say so. Sometimes the chart points to a pattern adjacent to the one you came in with — and the conversation shifts.",
  },
  {
    phase: "After",
    title: "You get a written reflection.",
    body: "Within 48 hours, you receive a short, written reflection of the patterns we identified — the names, the structures, and the specific edges we discussed. This is not a transcript. It's a tool for re-reading later, when the recognition has settled.",
    note: "Some patterns take weeks to integrate. The reflection is a way to come back to the work without needing another session.",
  },
  {
    phase: "After",
    title: "You decide what's next.",
    body: "Some clients book one session and that's enough. Others come back for deeper work on a specific pattern. There is no upsell. The first session is not a teaser for a course or a membership. If the work is done, the work is done.",
    note: "If you want to go deeper, the next session can focus on a specific pattern, a specific relationship, or a specific decision you're facing.",
  },
];

const FAQS = [
  {
    q: "Is this a regular astrology reading?",
    a: "No. Most astrology readings tell you what will happen. This work shows you why the same things keep happening. We don't predict events. We name patterns. The chart is used as a map of the patterns you came in with — not a forecast of what's coming.",
  },
  {
    q: "Do I need to know anything about astrology?",
    a: "No. You don't need to know your rising sign, what a house is, or what Saturn represents. I'll explain anything relevant in plain language. The reading is in service of your life — not your astrological literacy.",
  },
  {
    q: "Do I need to believe in astrology for this to work?",
    a: "No. Skeptics often have the most powerful sessions, because their resistance dissolves when confronted with specificity. The chart is a lens, not a faith. You can take what's useful and leave the rest.",
  },
  {
    q: "How is this different from therapy?",
    a: "Therapy works with the conscious mind over time. This work reads the underlying structure immediately. Your chart shows patterns that therapy often takes years to surface — if it surfaces them at all. This is not instead of therapy. It's a complement that often makes therapy more effective.",
  },
  {
    q: "What if the reading brings up something I'm not ready for?",
    a: "I work with depth, not force. You choose how deep we go. If a pattern feels too close, we step back. But the patterns that scare you most are usually the ones running you hardest — and naming them gently is often the beginning of the unblocking.",
  },
  {
    q: "Is the session confidential?",
    a: "Completely. Your birth details, your patterns, your reflection notes — they stay between us. Nothing is shared, ever. Privacy is not policy here; it's foundational.",
  },
  {
    q: "What if I want a recording?",
    a: "I don't record by default — the work tends to land deeper when you're present for it without worrying about reviewing it later. But if you want one, ask at the start of the session and we'll record it for your private use.",
  },
  {
    q: "What if I need to reschedule?",
    a: "Message me on WhatsApp at least 24 hours before the session. Life happens. We'll find another slot. No fee, no friction.",
  },
];

export default function WhatToExpect() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <a
            href="/"
            className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors block mb-8"
          >
            ← AstroKalki
          </a>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Before you book
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            What to expect.
          </h1>
          <p className="text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            How a session actually works. Before, during, after. No mysticism. No horoscope language. Just a careful look at the pattern running your life — and a conversation about how to relate to it.
          </p>
        </div>
      </header>

      {/* Timeline */}
      <section className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        <h2 className="text-2xl sm:text-3xl font-serif text-[#c9a96e] font-light tracking-[-0.015em] mb-12">
          The shape of a session.
        </h2>
        <ol className="space-y-12">
          {STEPS.map((step, i) => (
            <li key={i} className="grid grid-cols-12 gap-6">
              <div className="col-span-12 sm:col-span-3">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-mono font-light mb-2">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] font-light">
                  {step.phase}
                </p>
              </div>
              <div className="col-span-12 sm:col-span-9">
                <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 leading-tight">
                  {step.title}
                </h3>
                <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mb-4">
                  {step.body}
                </p>
                <p className="text-sm text-[#7a7a7a] font-light italic leading-[1.7] border-l-2 border-white/[0.06] pl-4">
                  {step.note}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 sm:px-10 py-16 border-t border-white/[0.06]">
        <h2 className="text-2xl sm:text-3xl font-serif text-[#c9a96e] font-light tracking-[-0.015em] mb-12">
          Questions people ask before booking.
        </h2>
        <div className="border-t border-white/[0.06]">
          {FAQS.map((faq, i) => (
            <details key={i} className="border-b border-white/[0.06] group py-6">
              <summary className="cursor-pointer list-none flex items-baseline justify-between gap-6">
                <h3 className="text-base sm:text-lg font-serif font-light text-[#f0eee9] group-open:text-[#c9a96e] transition-colors leading-tight">
                  {faq.q}
                </h3>
                <span className="text-[#5a5a5a] group-open:text-[#c9a96e] group-open:rotate-45 transition-transform text-2xl font-light shrink-0">
                  +
                </span>
              </summary>
              <p className="text-[#9a9a9a] text-base leading-[1.85] font-light mt-4 max-w-xl">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 sm:px-10 py-20 text-center border-t border-white/[0.06]">
        <p className="text-[#9a9a9a] text-base leading-[1.8] font-light mb-8 max-w-md mx-auto">
          If this is the kind of work you've been looking for, the next step is the micro-reading — 60 seconds to find out which pattern is yours.
        </p>
        <a
          href="/#micro-reading"
          className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
        >
          Take the micro-reading
          <span className="text-[#c9a96e]">→</span>
        </a>
        <p className="text-[11px] text-[#5a5a5a] mt-8 tracking-wide font-light">
          Or skip ahead — <a href="/#booking" className="text-[#7a7a7a] underline underline-offset-4 hover:text-[#c9a96e]">book the full session</a>.
        </p>
      </section>
    </main>
  );
}
