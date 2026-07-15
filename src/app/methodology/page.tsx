import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";

export const metadata: Metadata = {
  title: "Methodology — How AstroKalki Reads the Chart",
  description:
    "The chart is read here the way a therapist reads a genogram — as a map of inherited emotional architecture. Here is the framework, the lineage it draws from, and what the chart can and cannot do.",
  alternates: { canonical: "https://astrokalki.com/methodology" },
  openGraph: {
    title: "AstroKalki Methodology — Astrology as Diagnostic Tool",
    description:
      "Vedic chart as diagnostic instrument, Jungian shadow work as integration framework, attachment theory as relational lens. The framework and its limits.",
    type: "website",
    url: "https://astrokalki.com/methodology",
    siteName: "AstroKalki",
  },
};

const LINEAGE = [
  {
    name: "Vedic (sidereal) astrology",
    role: "The diagnostic instrument",
    detail:
      "The sidereal zodiac, aligned with the actual positions of the constellations, is the chart used here. The chart is read as a map of the early environment, the survival patterns it installed, and the adult life that follows from those patterns. The chart does not predict events. It maps patterns.",
  },
  {
    name: "Jungian depth psychology",
    role: "The integration framework",
    detail:
      "Jung's framework of the shadow, the persona, the anima/animus, and the process of individuation provides the integration layer. The chart identifies the patterns; the Jungian framework provides the language and practice for integrating them.",
  },
  {
    name: "Attachment theory",
    role: "The relational lens",
    detail:
      "Bowlby and Ainsworth's attachment framework, extended by Sue Johnson and others, provides the lens for understanding relational patterns. The chart's Moon placements and aspects map the attachment style; attachment theory provides the framework for working with it.",
  },
  {
    name: "Somatic nervous-system awareness",
    role: "The body reference",
    detail:
      "The patterns being named are not cognitive; they are procedural, encoded in the nervous system. The work draws on polyvagal theory and somatic experiencing to address patterns at the layer where they live.",
  },
];

const PRINCIPLES = [
  {
    title: "The chart is a diagnostic map, not a forecast.",
    body: "The chart maps patterns — survival patterns, attachment patterns, archetypal patterns. It does not predict events. Anyone who uses the chart to predict events is using the prediction framework, which is unreliable.",
  },
  {
    title: "The chart does not cause the patterns. It marks them.",
    body: "The chart's placements correlate with psychological patterns, but the causation is unclear and probably multifactorial. The correlation is useful even if the causation is not understood. The chart is a map; the territory is your lived experience.",
  },
  {
    title: "Patterns are procedural. Insight alone does not change them.",
    body: "The patterns the chart points to are encoded in the nervous system, not in the mind. Insight helps you recognise the patterns; it does not interrupt them. The interruption requires sustained work — through therapy, through conscious practice, through the slow retraining of the nervous system.",
  },
  {
    title: "The integration is the work of depth psychology.",
    body: "The chart can name the patterns quickly and specifically. The integration — the actual work of changing your relationship with the patterns — is the work of therapy, sustained personal practice, and lived experience. The chart is a complement to therapy, not a substitute.",
  },
  {
    title: "The work is plain-language. No jargon in session.",
    body: "Sessions are conducted in plain language. The chart is read in advance, but the session itself is not spent looking at the chart. It is spent looking at you. The astrological framework is the practitioner's tool, not the client's vocabulary.",
  },
  {
    title: "The work is honest about its limits.",
    body: "The chart cannot predict events, make decisions for you, replace therapy, or resolve trauma. It can identify patterns, clarify thresholds, and make the therapeutic work more targeted. The honesty about limits is part of the integrity of the work.",
  },
];

const SESSION_FLOW = [
  {
    step: "01",
    label: "Intake",
    detail:
      "You share your birth details (date, time, place) and a short description of what you are working on. No essay required — a few sentences about the pattern or threshold is enough.",
  },
  {
    step: "02",
    label: "Chart preparation",
    detail:
      "The chart is pulled and the relevant signatures are identified in advance. The session opens with the pattern already named — the hour is spent understanding the pattern, not discovering it.",
  },
  {
    step: "03",
    label: "Pattern walkthrough",
    detail:
      "The first half of the session walks you through the pattern in your chart and your life — back and forth, with your lived experience as the validator. The pattern is not imposed on you; it is confirmed by you.",
  },
  {
    step: "04",
    label: "Origin trace",
    detail:
      "The middle of the session traces the pattern back to its installation — the early environment, the specific dynamics, the moment or pattern of moments that taught your nervous system this was how love, safety, or survival worked.",
  },
  {
    step: "05",
    label: "Exit mapping",
    detail:
      "The last section maps the practical exits — the specific moments where the pattern will try to repeat, and what to do at each of those moments. Not theory, but the actual next moves.",
  },
  {
    step: "06",
    label: "Recording",
    detail:
      "The session is recorded (audio) and sent to you within 24 hours. Listening back, often months later, is when most of the integration actually lands.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Methodology" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Methodology
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            The chart read the way a therapist reads a genogram.
          </h1>
          <p className="text-xl sm:text-2xl text-[#cfcabf] font-serif italic font-light leading-[1.5]">
            A map of inherited emotional architecture — not a forecast of events.
          </p>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {/* The core premise */}
        <section className="mb-16">
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
            AstroKalki uses Vedic astrology as a pattern recognition instrument rather than a forecasting one. The birth chart is read here the way a therapist reads a genogram — as a map of the early environment, the survival patterns it installed, and the adult life that follows from those patterns.
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mt-6">
            Planetary placements are treated as diagnostic markers for psychological patterns, not as forecasts of events. A Moon-Saturn conjunction is not &quot;a bad year ahead.&quot; It is the signature of an early environment where emotional needs were met with coldness or absence — and the adult life that follows from that nervous system.
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mt-6">
            Sessions are conducted one-to-one, in confidence, and in plain language. No jargon. No mystical deflection. The work is fast, specific, and often uncomfortable — because the patterns being named are the ones a person has spent years not seeing.
          </p>
        </section>

        {/* The lineage */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            The lineage
          </p>
          <div className="space-y-10">
            {LINEAGE.map((item, idx) => (
              <div key={idx}>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-3">
                  <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em]">
                    {item.name}
                  </h3>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 font-light">
                    {item.role}
                  </p>
                </div>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The principles */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            The principles
          </p>
          <div className="space-y-10">
            {PRINCIPLES.map((p, idx) => (
              <div key={idx}>
                <h3 className="text-lg sm:text-xl font-serif text-[#c9a96e] font-light tracking-[-0.01em] mb-3">
                  {p.title}
                </h3>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The session flow */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            How a session flows
          </p>
          <div className="space-y-8">
            {SESSION_FLOW.map((s) => (
              <div key={s.step} className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-8">
                <div className="flex sm:block items-center gap-3">
                  <span className="text-[#c9a96e]/40 font-mono text-xs">{s.step}</span>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] font-light sm:mt-2">
                    {s.label}
                  </p>
                </div>
                <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What the work cannot do */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            What the work cannot do
          </p>
          <ul className="space-y-4">
            {[
              "Predict events — when you will marry, what career to pursue, what year will be difficult.",
              "Make decisions for you — whether to stay in a relationship, take a job, or move to a city.",
              "Replace therapy — particularly for trauma work, crisis care, or sustained mental health treatment.",
              "Resolve trauma — which requires clinical support and the slow work of nervous-system healing.",
              "Guarantee insight — the chart can be read well or poorly; the quality depends on the practitioner.",
            ].map((item, idx) => (
              <li
                key={idx}
                className="text-[#cfcabf] text-base leading-[1.7] font-light flex gap-3"
              >
                <span className="text-[#c9a96e] shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div className="pt-10 border-t border-white/[0.06] text-center">
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            If the methodology resonates, the work begins with a session.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/services"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
            >
              See the sessions
              <span className="text-[#c9a96e]">→</span>
            </Link>
            <Link
              href="/#booking"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-3 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Book a session
              <span>→</span>
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
