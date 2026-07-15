import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";

export const metadata: Metadata = {
  title: "FAQ — AstroKalki",
  description:
    "Honest answers to the questions people actually ask before booking. Is this like regular astrology? How is it different from therapy? What do I need to provide? Will you tell me what to do?",
  alternates: { canonical: "https://astrokalki.com/faq" },
  openGraph: {
    title: "AstroKalki FAQ — Honest Answers Before You Book",
    description:
      "Is this like regular astrology? How is it different from therapy? What do I need to provide? Honest answers to the questions people actually ask.",
    type: "website",
    url: "https://astrokalki.com/faq",
    siteName: "AstroKalki",
  },
};

const FAQS = [
  {
    category: "The work itself",
    questions: [
      {
        q: "Is this like a regular astrology reading?",
        a: "No. Most astrology readings tell you what will happen. AstroKalki shows you why the same things keep happening. This is pattern recognition, not prediction. We decode the architecture beneath your repeating experiences — the loops you cannot see because you are inside them.",
      },
      {
        q: "How is this different from therapy?",
        a: "Therapy works with the conscious mind over time. AstroKalki works with the underlying architecture immediately. Your birth chart reveals patterns that took therapy years to uncover — if they ever did. This is not instead of therapy. It is what makes therapy finally work, because the pattern being addressed in therapy is suddenly visible in a way it wasn't before.",
      },
      {
        q: "Do I need to believe in astrology for this to work?",
        a: "No. You do not need to believe in gravity for it to affect you. The patterns in your chart exist whether you acknowledge them or not. Skeptics often have the most powerful breakthroughs because their resistance dissolves when confronted with specificity. The chart either maps patterns you can recognise in your lived experience, or it does not. Belief is not required.",
      },
      {
        q: "What is the difference between the five sessions?",
        a: "The sessions are not different services. They are five entry points into the same work, framed by the specific emotional situation you are likely to be in when you arrive. The Relationship Pattern Analysis is the broadest entry. The Karmic Relationship Reading is for when the pattern is showing up as a specific repeating partner. The Emotional Pattern Decode is for when the pattern is a recurring feeling rather than a recurring partner. The Shadow Work Consultation is for when the pattern is showing up as projections onto other people. The Life Direction Session is for when the pattern is a threshold you are standing at. If unsure, start with the Relationship Pattern Analysis.",
      },
    ],
  },
  {
    category: "Practical questions",
    questions: [
      {
        q: "What do I need to provide for a session?",
        a: "Your date of birth, time of birth, and place of birth. The more accurate the time, the deeper the reading. If you do not know your exact birth time, we can still work with a window — but some patterns may be less precise. You can often confirm your birth time with a parent or hospital record.",
      },
      {
        q: "How long is a session?",
        a: "Sessions are 60, 90, or 120 minutes depending on the service and the depth of work. The Relationship Pattern Analysis and Emotional Pattern Decode are 60-90 minutes. The Karmic Relationship Reading is 60-90 minutes. The Shadow Work Consultation and Life Direction Session are 90-120 minutes. The length is chosen at booking based on what you want to work on.",
      },
      {
        q: "Are sessions online or in person?",
        a: "Sessions are online (video call) or by phone/WhatsApp audio. There is no in-person option at this time. The work is the same either way — the chart is read in advance, and the session is a conversation about what the chart shows.",
      },
      {
        q: "Is the session recorded?",
        a: "Yes. Every session is recorded (audio) and sent to you within 24 hours. Listening back, often months later, is when most of the integration actually lands. The recording is yours to keep.",
      },
    ],
  },
  {
    category: "Confidentiality & boundaries",
    questions: [
      {
        q: "Are sessions confidential?",
        a: "Absolutely. Everything shared in a session remains completely confidential. Your birth chart, your patterns, your revelations — they stay between us. Privacy is not just policy. It is sacred. Testimonials on the site are anonymous (first-initial + age + pattern) and are only published with explicit client consent.",
      },
      {
        q: "Will you tell me what to do?",
        a: "No. The session does not make decisions for you. It clarifies the pattern, which usually makes the right decision obvious — but the decision is yours. Anyone who tells you to take a specific job, marry or divorce a specific person, or move to a specific city based on a chart is performing astrology, not pattern recognition.",
      },
      {
        q: "What if I'm in crisis?",
        a: "If you are in active mental health crisis, in a safety-threatening situation, or in the first weeks of an acute grief or shock, the right first call is clinical care or a crisis line — not pattern recognition work. If you are in a sustained threshold — a long-building decision, a slow erosion, a question that has been with you for months — this is often exactly the right moment. Message first if unsure.",
      },
    ],
  },
  {
    category: "What to expect",
    questions: [
      {
        q: "How long until I see results?",
        a: "Immediately. Most clients report that the recognition happens during the session itself — the moment a pattern is named, it loses its invisible power over you. The integration continues for weeks and months after, but the shift begins the moment you see what was hidden.",
      },
      {
        q: "What if I want to go deeper after the first session?",
        a: "That is common. The first session reveals the architecture. Subsequent sessions go deeper into specific patterns, shadow work, or threshold work. Many clients return because each layer reveals new depth. The work deepens as you do. There is no required number of sessions — you come when you are ready to work, and you don't when you are not.",
      },
      {
        q: "Can I book again at major life thresholds?",
        a: "Yes, and many people do. The chart does not change, but the transits activating it do, and the threshold you are at now is not the threshold you will be at in three years. People often return at major transitions — Saturn return (around 28-30), midlife thresholds (around 40-42), relationship endings, career shifts, the deaths of parents. The work meets you where you are at each threshold.",
      },
      {
        q: "What if the chart doesn't seem to match my life?",
        a: "Then the chart may not be useful for you, at least at this layer. The test of the chart is whether it maps patterns you can recognise in your lived experience. If it does not, set the chart aside and use other tools — therapy, self-reflection, feedback from trusted others. The chart is one useful instrument, not the only instrument, and it is not the right instrument for everyone.",
      },
    ],
  },
];

// FAQ schema for the whole page
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.flatMap((cat) =>
    cat.questions.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.a,
      },
    }))
  ),
};

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            FAQ
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            Honest answers, before you book.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            The questions people actually ask, grouped by category. If your question is not here, message on WhatsApp — you will get an honest answer, not a sales pitch.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {FAQS.map((cat, catIdx) => (
          <section
            key={cat.category}
            className={catIdx > 0 ? "mt-16 pt-12 border-t border-white/[0.04]" : ""}
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
              {cat.category}
            </p>
            <div className="space-y-10">
              {cat.questions.map((faq, idx) => (
                <div key={idx}>
                  <h2 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-4">
                    {faq.q}
                  </h2>
                  <p className="text-[#cfcabf] text-base leading-[1.8] font-light">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="mt-16 pt-10 border-t border-white/[0.04] text-center">
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            If the answers here are sufficient, the next move is a session.
          </p>
          <Link
            href="/#booking"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Book a session
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
