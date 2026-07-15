import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { SERVICES } from "@/lib/content/services";

export const metadata: Metadata = {
  title: "Services — AstroKalki",
  description:
    "Five ways into the same work — relationship pattern analysis, karmic relationship reading, emotional pattern decode, shadow work consultation, and life direction session. Each one a focused session that names the pattern running beneath your situation.",
  alternates: { canonical: "https://astrokalki.com/services" },
  openGraph: {
    title: "AstroKalki Sessions — Five Doors Into the Same Work",
    description:
      "Relationship patterns, karmic readings, emotional pattern decode, shadow work, life direction. Five focused sessions, each naming the pattern running beneath your situation.",
    type: "website",
    url: "https://astrokalki.com/services",
    siteName: "AstroKalki",
  },
};

export default function ServicesIndex() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Services" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Sessions
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            Five doors into the same work.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            The sessions are not different services. They are five entry points, framed by the specific emotional situation you are likely to be in when you arrive. Choose the door that fits, or start with the Relationship Pattern Analysis if you are unsure.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="space-y-6">
          {SERVICES.map((service, idx) => (
            <div
              key={service.slug}
              className="group p-8 sm:p-10 border border-white/[0.05] hover:border-[#c9a96e]/25 transition-colors"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-6 flex-1 min-w-0">
                  <span className="text-[#c9a96e]/50 font-mono text-xs pt-2 shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
                      {service.title}
                    </h2>
                    <p className="text-base sm:text-lg text-[#cfcabf] font-serif italic font-light leading-[1.6] mb-5">
                      {service.headline}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
                      <span>{service.pricing[0]?.duration}</span>
                      <span>·</span>
                      <span>From {service.pricing[0]?.price}</span>
                      <span>·</span>
                      <span className="text-[#c9a96e]/70">{service.targetKeyword}</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/services/${service.slug}`}
                  className="shrink-0 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap mt-2"
                >
                  Learn more →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-white/[0.04] text-center">
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            Not sure which session fits? Start with the micro-reading on the homepage — it will tell you which pattern is yours, and the right session follows.
          </p>
          <Link
            href="/#micro-reading"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
          >
            Take the micro-reading
            <span>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
