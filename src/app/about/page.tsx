import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { AUTHOR } from "@/lib/content/author";

export const metadata: Metadata = {
  title: "About AstroKalki — A Pattern Recognition Practice",
  description:
    "AstroKalki is not a brand. It is a method — a pattern recognition practice working at the intersection of Vedic astrology and depth psychology. The work does not predict what will happen. It shows you why the same things keep happening.",
  alternates: { canonical: "https://astrokalki.com/about" },
  openGraph: {
    title: "About AstroKalki — A Pattern Recognition Practice",
    description:
      "AstroKalki uses Vedic astrology as a diagnostic tool, not a prediction engine. The work names the emotional architecture beneath repeating relationships, self-sabotage cycles, and identity thresholds.",
    type: "website",
    url: "https://astrokalki.com/about",
    siteName: "AstroKalki",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "About" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            About
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            AstroKalki is not a brand. It is a method.
          </h1>
          <p className="text-xl sm:text-2xl text-[#cfcabf] font-serif italic font-light leading-[1.5]">
            A pattern recognition practice working at the intersection of Vedic astrology and depth psychology — and a refusal to call astrology what it has mostly become.
          </p>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="space-y-8 text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light">
          {AUTHOR.bio.split("\n\n").map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        {/* What the work is not */}
        <section className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            What the work is not
          </p>
          <ul className="space-y-4">
            {AUTHOR.notFor.map((item, idx) => (
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

        {/* The methodology */}
        <section className="mt-20 pt-10 border-t border-white/[0.06]">
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
          <div className="mt-8">
            <Link
              href="/methodology"
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              Read the full methodology →
            </Link>
          </div>
        </section>

        {/* What the work addresses */}
        <section className="mt-20 pt-10 border-t border-white/[0.06]">
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

        {/* Contact */}
        <section className="mt-20 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            Connect
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-1">WhatsApp</p>
              <p className="text-base text-[#cfcabf] font-light">{AUTHOR.whatsapp}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-1">Email</p>
              <p className="text-base text-[#cfcabf] font-light">{AUTHOR.email}</p>
            </div>
            <div className="flex gap-3 pt-4">
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
          </div>
        </section>

        {/* CTA */}
        <div className="mt-20 pt-10 border-t border-white/[0.06] text-center">
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            If this is the work you have been looking for, the next move is a session.
          </p>
          <Link
            href="/#booking"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Book a session
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>
      </article>
    </main>
  );
}
