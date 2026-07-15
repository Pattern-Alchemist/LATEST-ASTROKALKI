import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";

/**
 * The Mirror Method — AstroKalki's branded five-step pattern recognition framework.
 *
 * Different from /methodology (which documents how the chart is read in detail),
 * this page is the elevated, memorable framework that names the practice:
 *
 *   1. Pattern Recognition      — name the loop
 *   2. Emotional Origin         — find the installation moment
 *   3. Karmic Reinforcement     — read the chart signature
 *   4. Behavioural Expression   — map how it runs today
 *   5. Conscious Intervention   — design the exit
 *
 * This is the framework that gets cited. Every pattern in the Atlas is decoded
 * through this five-step sequence, and every session follows it.
 */

export const metadata: Metadata = {
  title: "The Mirror Method — AstroKalki's Pattern Recognition Framework",
  description:
    "The Mirror Method is the five-step pattern recognition framework AstroKalki uses to decode emotional and behavioural loops: Pattern Recognition, Emotional Origin, Karmic Reinforcement, Behavioural Expression, Conscious Intervention. Not prediction. Pattern recognition.",
  alternates: { canonical: "https://astrokalki.com/method" },
  openGraph: {
    title: "The Mirror Method — AstroKalki's Five-Step Framework",
    description:
      "Pattern Recognition → Emotional Origin → Karmic Reinforcement → Behavioural Expression → Conscious Intervention. The framework every AstroKalki session follows.",
    type: "website",
    url: "https://astrokalki.com/method",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Mirror Method — AstroKalki",
    description:
      "The five-step pattern recognition framework. Pattern Recognition → Emotional Origin → Karmic Reinforcement → Behavioural Expression → Conscious Intervention.",
  },
  keywords: [
    "pattern recognition framework",
    "mirror method",
    "astrology psychology method",
    "emotional pattern decoding",
    "karmic pattern work",
    "shadow work framework",
    "depth psychology astrology",
  ],
};

const STEPS = [
  {
    number: "01",
    name: "Pattern Recognition",
    tagline: "Name the loop.",
    detail:
      "The first step is the hardest: naming the pattern that is running beneath your experience. Not the partner, not the job, not the situation — the structure that repeats across all of them. This is what the Pattern Atlas exists to make possible. Recognition is not insight. Insight is a thought; recognition is when the nervous system registers that the pattern is real, that it is yours, and that it has been running for longer than you knew. Recognition is the moment the loop stops being invisible — which is the precondition for anything else changing.",
    how: "Through the chart signature (the placements that mark the pattern), the structured Atlas field set (symptoms, how it shows up, what it's mistaken for), and the conversation that confirms which pattern is actually active in your life right now.",
  },
  {
    number: "02",
    name: "Emotional Origin",
    tagline: "Find the installation moment.",
    detail:
      "Every pattern was installed somewhere. Not in this life alone — but in the specific early environment that taught your nervous system this was how love, safety, or survival worked. The second step traces the pattern back to its origin: the household, the parent, the moment or pattern of moments that wrote the code. This is not blame. It is history. Without seeing where the pattern was installed, you cannot see why your nervous system still runs it — and you will continue to interpret the pattern as a character flaw rather than a survival reflex that grew into a personality.",
    how: "Through the Moon (the early environment), the 4th house (the mother, the home), and the IC (the deepest root of the chart). The pattern's origin is written in these placements, and we trace it together against your actual lived history.",
  },
  {
    number: "03",
    name: "Karmic Reinforcement",
    tagline: "Read the chart signature.",
    detail:
      "The third step reads how the pattern has been reinforced across time — not just in this life, but in the deeper architecture the chart points to. This is where Vedic astrology earns its place in the framework: the chart reveals the karmic signature of the pattern, the specific placements and periods (dashas) that have re-triggered it across your life, and the timing of when the pattern is most likely to activate again. This is not mysticism. It is pattern recognition at a longer timescale — the chart as a map of which nervous-system patterns have been most reinforced, and when they will next be tested.",
    how: "Through the planetary lords of the houses involved, the dasha sequence (the Vedic timing system), and the aspect patterns that mark where the chart has been most heavily conditioned. This is the layer traditional astrology calls 'karmic'; we treat it as the architecture of long-term reinforcement.",
  },
  {
    number: "04",
    name: "Behavioural Expression",
    tagline: "Map how it runs today.",
    detail:
      "The fourth step brings the pattern into the present: how does it actually run in your life right now? In your relationships, your work, your body, your money, your friendships, your daily decisions. The chart points to the architecture; the conversation maps the architecture to your actual lived experience. This is where the pattern stops being abstract and becomes specific — the text you didn't send, the meeting you avoided, the fight you picked, the opportunity you declined. Without this step, the work stays theoretical. With it, you see exactly where the pattern is operating in your life this week, this month, this season.",
    how: "Through structured conversation against the Atlas field set — Symptoms, How it shows up, Relationship impact, Career impact — held against your actual current relationships and choices. The chart identifies; the conversation confirms.",
  },
  {
    number: "05",
    name: "Conscious Intervention",
    tagline: "Design the exit.",
    detail:
      "The fifth step is the one most clients want first, but it cannot come before the other four. Conscious intervention is the design of the actual exit — the specific moments where the pattern will try to repeat, and what you do at each of those moments. Not theory, not affirmation, not 'do the work' — but the concrete next moves that interrupt the pattern at the points where it has always run on autopilot. This step also names what intervention cannot do (resolve the underlying wound, replace therapy, produce instant change) and what it can do (give you a precise map of where to act, and what acting looks like).",
    how: "Through the exit mapping at the end of the session — the specific upcoming moments where the pattern will activate, the body cue that tells you it is activating, and the action that interrupts it. The intervention is small, specific, and repeatable. The pattern does not end in one session; it ends over months of these small interruptions.",
  },
];

const PRINCIPLES = [
  {
    title: "The chart is a mirror, not a forecast.",
    body: "The Mirror Method uses the chart the way a mirror uses light — to show you what is already there but cannot be seen from inside it. The chart does not predict your future. It reflects your architecture, so that the architecture can be recognised, named, and ultimately interrupted where it no longer serves.",
  },
  {
    title: "Recognition precedes intervention.",
    body: "Most people want to skip to the intervention. They want the technique, the practice, the fix. The Mirror Method refuses this. Until the pattern is recognised — fully, in the body, not just in the mind — no intervention will hold. The first three steps exist to make recognition possible. The fourth makes it specific. Only then does the fifth become useful.",
  },
  {
    title: "The chart identifies; the conversation confirms.",
    body: "The chart can name the pattern, but it cannot tell you how the pattern is actually running in your life today. That requires the conversation — your lived experience held against the chart's architecture, with you as the validator. The chart is not imposed on you. It is confirmed by you, moment by moment, until you can see what it is pointing to.",
  },
  {
    title: "Intervention is small, specific, and repeatable.",
    body: "The Mirror Method does not promise transformation. It promises precision. The exit from a pattern is not a single dramatic act; it is a series of small, specific interruptions at the moments where the pattern tries to repeat. Most of these moments are unglamorous — the unreturned text, the declined invitation, the conversation that would normally be avoided. The intervention is the same action, taken before the pattern has time to take over, repeated until the nervous system learns a new response.",
  },
  {
    title: "The wound does not have to be healed to be interrupted.",
    body: "Healing is the work of years, often of therapy, and the Mirror Method does not pretend otherwise. What the method offers is different: the pattern can be interrupted even before the underlying wound is healed. Recognition gives you a small but real window between the trigger and the response — and in that window, a different choice becomes possible. Over time, the different choice becomes the new pattern, and the old one fades.",
  },
];

// Lineage citations — the intellectual anchors that ground the method
const LINEAGE = [
  {
    name: "Carl Jung",
    role: "Shadow, persona, individuation",
    citation:
      "Jung's framework of the shadow — the disowned parts of the psyche that we project onto others and meet in our own lives — is the integration layer of the Mirror Method. The chart identifies the shadow material; the Jungian framework provides the practice of integration.",
    reference: "Jung, C. G. (1959). Aion: Researches into the Phenomenology of the Self. Princeton University Press.",
  },
  {
    name: "John Bowlby",
    role: "Attachment theory",
    citation:
      "Bowlby's attachment framework — the early bonding patterns that shape adult relating — is the relational lens of the method. The Moon and 4th house map the attachment style; attachment theory provides the framework for working with it.",
    reference: "Bowlby, J. (1969). Attachment and Loss, Vol. 1: Attachment. Basic Books.",
  },
  {
    name: "Gabor Maté",
    role: "Stress, disease, and the embodied nervous system",
    citation:
      "Maté's work on the relationship between suppressed emotion, chronic stress, and physical illness grounds the method's commitment to the body. The patterns the chart identifies are not cognitive; they are procedural, encoded in the nervous system, and they express in the body long before they express in the mind.",
    reference: "Maté, G. (2003). When the Body Says No: The Cost of Hidden Stress. Knopf Canada.",
  },
  {
    name: "Bessel van der Kolk",
    role: "Trauma and the body",
    citation:
      "Van der Kolk's research on how trauma is encoded in the body — and why insight alone does not change it — is the honesty layer of the method. Recognition is necessary but not sufficient. The pattern lives in the nervous system, and the work of interrupting it is the work of retraining the nervous system over time.",
    reference: "van der Kolk, B. (2014). The Body Keeps the Score: Brain, Mind, and Body in the Healing of Trauma. Viking.",
  },
];

export default function MethodPage() {
  const methodSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The Mirror Method — AstroKalki's Pattern Recognition Framework",
    description:
      "The five-step framework AstroKalki uses to decode emotional and behavioural patterns through Vedic astrology and depth psychology.",
    author: { "@type": "Organization", name: "AstroKalki" },
    publisher: { "@type": "Organization", name: "AstroKalki" },
    articleSection: "Psychology",
    inLanguage: "en",
    keywords: [
      "pattern recognition",
      "mirror method",
      "vedic astrology",
      "depth psychology",
      "shadow work",
    ].join(", "),
  };

  // HowTo schema — captures the 5-step framework for rich results
  // Steps are derived from the STEPS array (single source of truth).
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "The Mirror Method",
    description:
      "The five-step pattern recognition framework AstroKalki uses to decode emotional and behavioural loops through Vedic astrology and depth psychology. Pattern Recognition → Emotional Origin → Karmic Reinforcement → Behavioural Expression → Conscious Intervention.",
    inLanguage: "en",
    totalTime: "PT60M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "INR", value: "1999" },
    tool: [
      {
        "@type": "HowToTool",
        name: "Vedic birth chart — used as a diagnostic instrument, not a forecast",
      },
      {
        "@type": "HowToTool",
        name: "Structured Atlas field set — symptoms, origin, impact, shadow side",
      },
    ],
    step: STEPS.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: `Step ${idx + 1}: ${step.name}`,
      text: `${step.tagline} ${step.detail} How it is done: ${step.how}`,
    })),
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(methodSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "The Mirror Method" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            The Mirror Method™
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            Five steps. One mirror. The pattern, finally seen.
          </h1>
          <p className="text-xl sm:text-2xl text-[#cfcabf] font-serif italic font-light leading-[1.5]">
            The framework every AstroKalki session follows. Pattern Recognition → Emotional Origin → Karmic Reinforcement → Behavioural Expression → Conscious Intervention.
          </p>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {/* The premise */}
        <section className="mb-16">
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
            The Mirror Method is the named framework behind every AstroKalki
            session, every pattern in the Atlas, and every guide on the site.
            It is not new age thinking dressed up in psychology language. It
            is a specific, sequenced approach to pattern work that draws on
            Vedic astrology as a diagnostic instrument, depth psychology as an
            integration framework, and attachment theory as a relational lens.
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mt-6">
            The method is called the Mirror Method because that is what the
            chart is used for: not to predict, not to fix, not to spiritualise
            — but to mirror back the architecture you cannot see from inside
            it. The chart shows you the pattern. The conversation confirms it.
            The five steps give the work its structure. Without the structure,
            pattern recognition becomes vague; with it, the work becomes
            precise enough to actually interrupt the loops that have been
            running your life.
          </p>
        </section>

        {/* The five steps */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-12 font-light">
            The five steps
          </p>
          <div className="space-y-16">
            {STEPS.map((step) => (
              <div key={step.number}>
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-8 mb-6">
                  <div className="flex sm:block items-baseline gap-3">
                    <span className="text-[#c9a96e]/40 font-mono text-xs">
                      {step.number}
                    </span>
                    <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] font-light sm:mt-2">
                      {step.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl text-[#f0eee9] font-serif italic font-light leading-[1.5] mb-4">
                      {step.tagline}
                    </p>
                    <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mb-5">
                      {step.detail}
                    </p>
                    <div className="pl-4 border-l border-[#c9a96e]/20">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light">
                        How it is done
                      </p>
                      <p className="text-sm text-[#9a9a9a] font-light leading-[1.7]">
                        {step.how}
                      </p>
                    </div>
                  </div>
                </div>
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
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The lineage — citation layer */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            The lineage
          </p>
          <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-10">
            The Mirror Method does not exist in isolation. It draws on four
            intellectual lineages — depth psychology, attachment theory,
            somatic trauma work, and Vedic astrology — and is honest about the
            debt it owes each. These are the citations that ground the method
            in traditions longer than itself.
          </p>
          <div className="space-y-10">
            {LINEAGE.map((item) => (
              <div key={item.name}>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-3">
                  <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em]">
                    {item.name}
                  </h3>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 font-light">
                    {item.role}
                  </p>
                </div>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light mb-2">
                  {item.citation}
                </p>
                <p className="text-xs text-[#5a5a5a] font-mono leading-[1.6] italic">
                  {item.reference}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What the method is not */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            What the method is not
          </p>
          <ul className="space-y-4">
            {[
              "A prediction system. The Mirror Method does not forecast events, name soulmates, or time success. The chart is read as architecture, not forecast.",
              "A substitute for therapy. The method is a complement to therapy, not a replacement — particularly for trauma work, crisis care, or sustained mental health treatment.",
              "A quick fix. Recognition can happen in a session. Interruption takes months. The pattern is procedural, encoded in the nervous system, and it changes through repetition, not revelation.",
              "A belief system. You do not need to believe in astrology for the method to work. The chart is a diagnostic instrument; its usefulness is measured in recognition, not faith.",
              "A cure for the wound. The wound that installed the pattern does not have to be healed for the pattern to be interrupted. But the method does not pretend to heal the wound. That is the work of therapy, lived experience, and time.",
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
            The Mirror Method is the framework behind every session. If you want to experience it on your own pattern, the work begins with one of the five doors.
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
              href="/patterns/atlas"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-3 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              The Pattern Atlas
              <span>→</span>
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a] border-b border-white/[0.08] pb-3 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-colors"
            >
              The technical methodology
              <span>→</span>
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
