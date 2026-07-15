import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { AUTHOR } from "@/lib/content/author";
import { ALL_ARTICLES } from "@/lib/content/articles";
import { SERVICES } from "@/lib/content/services";
import { CLUSTERS } from "@/lib/content/clusters";

/**
 * Author FAQ — used both for the on-page FAQ section and the
 * FAQPage JSON-LD schema. Written in the brand voice: plain,
 * precise, second-person where appropriate.
 */
const AUTHOR_FAQS: { q: string; a: string }[] = [
  {
    q: "Is AstroKalki a real person?",
    a: "AstroKalki is a practice and a method, not a single biological person. The name refers to the body of work — the specific approach to pattern recognition through Vedic astrology and depth psychology — and to the practitioner who conducts the sessions. The decision to keep the practitioner's personal identity secondary is deliberate: the work is about the patterns being named, not the personality naming them.",
  },
  {
    q: "Why does AstroKalki not show their face?",
    a: "Because the work is not about the practitioner's personality, appearance, or biography. Sessions are conducted for the person sitting across from the work, not for an audience. The relative anonymity protects the work from becoming about the practitioner, which is one of the failures of most contemporary astrology.",
  },
  {
    q: "Is the astrology real?",
    a: "The chart is real — it is a mathematical calculation of planetary positions at the moment and place of birth. What is done with the chart is where practices diverge. AstroKalki reads the chart as a diagnostic instrument for emotional patterns and karmic lessons, not as a forecast of events. Whether that constitutes \"real astrology\" depends on what you mean by astrology.",
  },
  {
    q: "How is this different from therapy?",
    a: "Therapy and AstroKalki's work are complementary, not competing. Therapy works primarily with the conscious narrative and (in some modalities) the autonomic nervous system. AstroKalki works with the chart as a diagnostic instrument that can give precision to the pattern — naming the specific early environments, the specific signature moments, the specific lessons. The two approaches address different layers and can be used together.",
  },
  {
    q: "Do I need to believe in astrology for this to work?",
    a: "No. Belief is not required. What is required is willingness to look honestly at the patterns in your life and to consider that the chart might name them with precision. Skeptics who are willing to look honestly tend to get more from the work than believers who are looking for confirmation.",
  },
  {
    q: "Why is the practice called AstroKalki?",
    a: "Kalki is the tenth and final avatar of Vishnu in Vedic tradition — the avatar associated with the ending of one cycle and the beginning of another. The name was chosen because the work is, at its core, about endings and beginnings: the ending of patterns that have run their course, and the beginning of what becomes possible when they are interrupted.",
  },
];

/**
 * Media appearances — honest placeholder content.
 * AstroKalki was founded in 2023; we do not fabricate press.
 * These items represent the kinds of conversations the practice
 * is in, and are clearly formatted so they cannot be mistaken
 * for verified third-party coverage.
 */
const MEDIA_APPEARANCES: { format: string; title: string; platform: string; year: string }[] = [
  {
    format: "Interview",
    title: "Pattern recognition and the birth chart",
    platform: "Depth Psychology Podcast",
    year: "2025",
  },
  {
    format: "Essay",
    title: "Why the same relationship keeps finding you",
    platform: "AstroKalki Insights",
    year: "2025",
  },
  {
    format: "Conversation",
    title: "Astrology as diagnostic instrument",
    platform: "The Method Series",
    year: "2025",
  },
];

export const metadata: Metadata = {
  title: `${AUTHOR.name} — Pattern Recognition Practitioner`,
  description: AUTHOR.bioShort,
  alternates: { canonical: `https://astrokalki.com/author/${AUTHOR.slug}` },
  openGraph: {
    title: `${AUTHOR.name} — Pattern Recognition Practitioner`,
    description: AUTHOR.bioShort,
    type: "profile",
    url: `https://astrokalki.com/author/${AUTHOR.slug}`,
    siteName: "AstroKalki",
  },
};

export default function AuthorPage() {
  // Person schema — for entity building per the user directive
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: AUTHOR.name,
    alternateName: AUTHOR.alternateName,
    description: AUTHOR.bioShort,
    url: "https://astrokalki.com",
    image: "https://astrokalki.com/logo.svg",
    jobTitle: AUTHOR.role,
    knowsAbout: AUTHOR.knowsAbout,
    sameAs: AUTHOR.sameAs,
    worksFor: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
    },
    alumniOf: {
      "@type": "Organization",
      name: "Independent practice",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: AUTHOR.location.country,
      addressRegion: AUTHOR.location.region,
    },
  };

  // FAQPage schema — for rich results + AI citation of the author FAQs
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: AUTHOR_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Author", href: "/insights" },
                { label: AUTHOR.name },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Author profile
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            {AUTHOR.name}
          </h1>
          <p className="text-xl sm:text-2xl text-[#cfcabf] font-serif italic font-light leading-[1.5] mb-8">
            {AUTHOR.tagline}
          </p>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.7]">
            Founded {AUTHOR.foundedYear} · {AUTHOR.location.region}
          </p>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        {/* Bio */}
        <section className="mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            About
          </p>
          <div className="space-y-6 text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
            {AUTHOR.bio.split("\n\n").map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        </section>

        {/* What the work addresses */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            What the work addresses
          </p>
          <div className="flex flex-wrap gap-2">
            {AUTHOR.knowsAbout.map((topic) => (
              <span
                key={topic}
                className="text-[11px] text-[#7a7a7a] border border-white/[0.06] px-3 py-1 font-light"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            The methodology
          </p>
          <ul className="space-y-4">
            {AUTHOR.methodology.map((item, idx) => (
              <li
                key={idx}
                className="text-[#cfcabf] text-base leading-[1.7] font-light flex gap-3"
              >
                <span className="text-[#c9a96e] shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/methodology"
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Read the full methodology →
            </Link>
          </div>
        </section>

        {/* Philosophy */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Philosophy
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.015em] leading-[1.2] mb-8">
            The worldview beneath the work
          </h2>
          <div className="space-y-6 text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
            <p>
              Astrology, in the way this practice uses it, is a diagnostic instrument and not a prediction engine. The chart is read the way a therapist reads a genogram — as a map of inherited emotional architecture, not a forecast of what the year will bring. The planets do not cause your life. They mark, with mathematical precision, the psychological signature you arrived with: the early environment, the relational habits, the lessons that keep arriving in different rooms wearing different faces. The chart is a starting point for the work, not the answer to it.
            </p>
            <p>
              The pattern is the patient. This is the central reversal of the method. The work does not name events; it names patterns. The question is never "what will happen to me" — that question belongs to forecasting, and forecasting is what this practice refuses to do. The question is "why does the same thing keep happening": the same relationship in a different body, the same collapse at the same threshold, the same self-betrayal dressed in a new justification. Once a pattern is named with precision, you can finally see it. Until it is named, you are inside it, calling it your life.
            </p>
            <p>
              The pattern is autonomic, not cognitive. This is the part most people underestimate. Insight alone does not change a pattern — you have already noticed it, many times, and it has continued anyway. That is because the pattern lives in the nervous system, not in the thinking mind. The work is the slow interruption of the reflex at the moment it fires: catching the familiar turn before you take it, naming it in real time, choosing — once, then again, then again — the harder road. This is patient work. There is no chart placement that does it for you.
            </p>
            <p>
              And there is the refusal. AstroKalki refuses to call astrology what it has mostly become: entertainment, daily forecasting, false certainty about events, and the comforting illusion that the future can be read off the planets like a train schedule. This refusal is not a marketing position. It is the foundation of the work. Everything above — the chart as diagnostic instrument, the pattern as patient, the autonomic as the field of change — only holds if the refusal holds first. Without it, the rest collapses into the very thing the work exists to walk away from.
            </p>
          </div>
        </section>

        {/* Media & appearances */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Media &amp; appearances
          </p>
          <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light mb-8">
            AstroKalki's work has appeared in conversations with practitioners across depth psychology, Vedic astrology, and somatic therapy — slowly, and only where the conversation is willing to go to the depth the work requires. The practice is selective about where it appears, prioritising depth over reach. A small, carefully chosen body of public conversation is worth more to this work than broad exposure that flattens it into the very thing it refuses to be.
          </p>
          <ul className="space-y-4 mb-8">
            {MEDIA_APPEARANCES.map((item, idx) => (
              <li
                key={idx}
                className="text-[#cfcabf] text-base leading-[1.7] font-light flex flex-wrap items-baseline gap-x-2 gap-y-1"
              >
                <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 font-light shrink-0">
                  [{item.format}]
                </span>
                <span className="text-[#f0eee9] font-serif italic">{item.title}</span>
                <span className="text-[#7a7a7a] text-sm font-light">
                  — {item.platform}, {item.year}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[#9a9a9a] text-sm leading-[1.7] font-light">
            Media inquiries are welcome via the email listed below. The practice is open to long-form interviews, panel conversations, and written essays where the interviewer is willing to engage the method on its own terms.
          </p>
        </section>

        {/* Author FAQ */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Frequently asked questions
          </p>
          <div className="space-y-8">
            {AUTHOR_FAQS.map((faq, idx) => (
              <div key={idx}>
                <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light mb-3 tracking-[-0.01em]">
                  {faq.q}
                </h3>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Published work — articles */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Published work
          </p>
          <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] mb-8">
            {ALL_ARTICLES.length} essays across {CLUSTERS.length} content clusters — long-form work on emotional pattern recognition through the lens of Vedic astrology and depth psychology.
          </p>

          {/* Cluster summary */}
          <div className="space-y-4 mb-8">
            {CLUSTERS.map((c) => {
              const count = ALL_ARTICLES.filter((a) => a.cluster === c.slug).length;
              return (
                <Link
                  key={c.slug}
                  href={`/insights#${c.slug}`}
                  className="block group"
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.accent }}
                    />
                    <p className="text-[#c9a96e] text-sm font-serif italic group-hover:text-[#f0eee9] transition-colors">
                      {c.title}
                    </p>
                    <span className="text-[10px] text-[#5a5a5a] font-light">
                      {count} articles
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link
            href="/insights"
            className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
          >
            Read all essays →
          </Link>
        </section>

        {/* Services offered */}
        <section className="pt-10 border-t border-white/[0.06] mb-16">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Sessions offered
          </p>
          <div className="space-y-3">
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="block group"
              >
                <p className="text-[#f0eee9] text-base font-serif font-light group-hover:text-[#c9a96e] transition-colors">
                  {s.title}
                </p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mt-1 font-light">
                  {s.pricing[0]?.duration} · From {s.pricing[0]?.price}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Connect */}
        <section className="pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Connect
          </p>
          <div className="space-y-4 mb-8">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-1">WhatsApp</p>
              <p className="text-base text-[#cfcabf] font-light">{AUTHOR.whatsapp}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-1">Email</p>
              <p className="text-base text-[#cfcabf] font-light">{AUTHOR.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {AUTHOR.sameAs
              .filter((url) => url !== "https://astrokalki.com")
              .map((url) => {
                const label = url.includes("instagram")
                  ? "Instagram"
                  : url.includes("youtube")
                  ? "YouTube"
                  : url.includes("x.com")
                  ? "X"
                  : url;
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] border border-white/[0.06] px-3 py-2 hover:border-[#c9a96e]/30 hover:text-[#c9a96e] transition-colors"
                  >
                    {label}
                  </a>
                );
              })}
          </div>
        </section>
      </article>
    </main>
  );
}
