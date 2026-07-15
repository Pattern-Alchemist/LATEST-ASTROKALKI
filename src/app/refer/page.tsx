import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import ReferralForm from "./ReferralForm";
import ReferralStats from "./ReferralStats";

/**
 * /refer — public referral hub.
 *
 * Editorial long-form page explaining AstroKalki's referral programme:
 * when someone you refer books their first session, you get a free
 * 30-minute follow-up. No limits on how many follow-ups you can earn.
 *
 * Sections:
 *   1. Hero — "Refer a pattern. Not a product."
 *   2. How it works — 3 numbered steps
 *   3. Code generator — ReferralForm client component
 *   4. Stats lookup — ReferralStats client component
 *   5. FAQ — 5 questions
 *
 * Visual language: AstroKalki dark editorial — bg #050505, gold #c9a96e,
 * Playfair Display serif headlines, Cinzel labels, generous whitespace,
 * numbered lists with mono digits. No blue/indigo.
 *
 * This is a server component — the only client islands are ReferralForm
 * and ReferralStats, both of which are scoped to their respective sections.
 */

export const metadata: Metadata = {
  title: "Refer a pattern. — AstroKalki",
  description:
    "AstroKalki referral programme: when someone you refer books a session, you get a free 30-minute follow-up. No limits. Generate your code and share it.",
  alternates: { canonical: "https://astrokalki.com/refer" },
  openGraph: {
    title: "Refer a pattern. Not a product.",
    description:
      "When someone you refer books a session with AstroKalki, you get a free 30-minute follow-up. No limits. Generate your code.",
    type: "website",
    url: "https://astrokalki.com/refer",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki Referrals — Refer a pattern.",
    description:
      "Refer someone to AstroKalki. They book a session. You get a free 30-minute follow-up. No limits.",
  },
  keywords: [
    "astrology referral",
    "referral programme astrology",
    "free follow-up session",
    "refer a friend astrology",
    "AstroKalki referral",
  ],
};

const STEPS = [
  {
    number: "01",
    title: "Share your code.",
    body: "You get a unique 8-character code. Send it to whoever you think would benefit from this work — by WhatsApp, email, voice. The code is case-insensitive.",
  },
  {
    number: "02",
    title: "They book a session.",
    body: "Your friend books their first session and pastes your code into the 'referred by' field. We attribute the booking to you. They get the work; you get the credit.",
  },
  {
    number: "03",
    title: "You get a follow-up.",
    body: "Within a week of their session, we email you to schedule a free 30-minute follow-up. Use it to revisit a chart, ask what surfaced in their session, or just check in.",
  },
];

const FAQ = [
  {
    q: "What does the follow-up session cover?",
    a: "Whatever you want. The 30-minute follow-up is yours. Most people use it to revisit their own chart in light of what surfaced in their friend's session — patterns echo between people, and seeing the pattern in someone close to you often clarifies your own. You can also use it as a chart refresh, a question you've been holding, or a quick check-in.",
  },
  {
    q: "Is there a limit on how many follow-ups I can earn?",
    a: "No. Every referral that converts into a booked session earns you a follow-up. If you refer five people and three book, you get three follow-ups. We don't cap it because we'd rather you share the work widely than ration your sharing.",
  },
  {
    q: "What happens if someone I refer doesn't book?",
    a: "Nothing — no penalty, no follow-up earned. The code only counts when it's attached to a paid session. The 'uses' counter on your code reflects actual conversions, not just shares.",
  },
  {
    q: "Can I refer someone who's already on the newsletter?",
    a: "Yes. The referral is attributed at the moment of booking, not at the moment of newsletter signup. If they've been reading for months and finally book using your code, you still get the follow-up.",
  },
  {
    q: "How do I check how many times my code has been used?",
    a: "Scroll down to the 'Already have a code?' section. Enter your email and we'll show you your code and its use count. The count updates within minutes of a conversion.",
  },
];

export default function ReferPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24 lg:py-32">
          <div className="mb-10">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Referrals" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-8 font-light">
            Referrals
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            Refer a pattern.
            <br />
            <span className="text-[#c9a96e] italic">Not a product.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            AstroKalki does not run paid ads. The work travels by word of mouth,
            from one person who recognised their pattern to another who is
            starting to suspect theirs. This page exists to make that sharing
            effortless — and to reward it.
          </p>
          <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] max-w-2xl mt-6">
            When someone you refer books a session, you get a{" "}
            <span className="text-[#c9a96e]">free 30-minute follow-up</span>.
            No limit on how many times this works.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#generate"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
            >
              Generate your code
              <span>↓</span>
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.1] pb-3 hover:border-[#c9a96e]/50 hover:text-[#f0eee9] transition-colors duration-500"
            >
              How it works
              <span>↓</span>
            </Link>
            <Link
              href="/#booking"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.1] pb-3 hover:border-[#c9a96e]/50 hover:text-[#f0eee9] transition-colors duration-500"
            >
              Book a session
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── How it works ──────────────────────────────────────────────── */}
      <section id="how" className="py-20 sm:py-28 lg:py-32 px-6 sm:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 sm:mb-20">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4 leading-tight">
              Three steps. No fine print.
            </h2>
            <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              The referral programme is intentionally simple. Share, they book,
              you follow up. We don&apos;t expire codes, we don&apos;t cap
              follow-ups, we don&apos;t ask you to fill out a form to redeem.
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10"
              >
                <div className="md:col-span-2">
                  <span className="font-mono text-3xl sm:text-4xl text-[#c9a96e]/50 tracking-tight font-light">
                    {step.number}
                  </span>
                </div>
                <div className="md:col-span-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-4 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] max-w-2xl">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Code generator ────────────────────────────────────────────── */}
      <section
        id="generate"
        className="border-t border-white/[0.04] bg-white/[0.015] py-20 sm:py-28 lg:py-32 px-6 sm:px-10 scroll-mt-20"
      >
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 sm:mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              Generate your code
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4 leading-tight">
              Eight characters. Yours.
            </h2>
            <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              The code is uniquely yours, attached to your email. We use it to
              match bookings to your account so the follow-up credit lands in
              the right inbox.
            </p>
          </div>

          <ReferralForm />
        </div>
      </section>

      {/* ─── Stats lookup ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 sm:mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              Your stats
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4 leading-tight">
              How many follow-ups have you earned?
            </h2>
            <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              Enter your email to see your code and its use count.
            </p>
          </div>

          <ReferralStats />
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.04] bg-white/[0.015] py-20 sm:py-28 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 sm:mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              Before you share
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-4">
              Common questions.
            </h2>
          </div>

          <div className="space-y-10 sm:space-y-12">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-white/[0.04] pb-8 sm:pb-10">
                <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-4 leading-snug">
                  {item.q}
                </h3>
                <p className="text-base text-[#cfcabf] font-light leading-[1.8]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>

          {/* Closing */}
          <div className="mt-16 pt-10 border-t border-white/[0.04] text-center">
            <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
              Ready when you are. The form is above.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="#generate"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500"
              >
                Back to the form
                <span>↑</span>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] border-b border-white/[0.1] pb-2 hover:border-[#c9a96e]/50 hover:text-[#f0eee9] transition-colors duration-500"
              >
                View pricing
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
