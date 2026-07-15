import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import SubscribeButton from "@/components/astrokalki/subscribe-button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * /membership — public membership pricing page.
 *
 * Two subscription tiers (Monthly ₹999, Yearly ₹9999), each rendered as an
 * editorial row in the AstroKalki dark design system. CTAs deep-link to the
 * Stripe-hosted Checkout page via /api/stripe/checkout.
 *
 * Server component:
 *   - Reads the NextAuth session to pre-fill the email on the subscribe
 *     button and to surface an "already a member?" panel if applicable.
 *   - No DB writes from this page.
 *
 * Visual language: matches /services, /insights, /patterns/atlas — Playfair
 * Display serif, gold (#c9a96e) accents, Roman-numeral editorial numbering,
 * thin gold dividers, generous whitespace (py-32 sm:py-48 section padding).
 */

export const metadata: Metadata = {
  title: "Membership — AstroKalki",
  description:
    "AstroKalki membership — monthly or annual. Recurring pattern recognition sessions, priority booking, recording archive access, and the Pattern Atlas. Cancel anytime.",
  alternates: { canonical: "https://astrokalki.com/membership" },
  openGraph: {
    title: "AstroKalki Membership — Pattern Recognition, Recurring",
    description:
      "Monthly or annual membership. Recurring sessions, priority booking, recording archive, the Pattern Atlas. Cancel anytime.",
    type: "website",
    url: "https://astrokalki.com/membership",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki Membership",
    description:
      "Monthly or annual membership. Recurring sessions, priority booking, recording archive, the Pattern Atlas.",
  },
  keywords: [
    "astrology membership",
    "recurring astrology consultation",
    "pattern recognition subscription",
    "monthly astrology session",
    "annual astrology membership",
    "priority booking astrology",
  ],
};

const PLANS = [
  {
    number: "I",
    id: "monthly" as const,
    name: "Monthly",
    price: "₹999",
    period: "/ month",
    tagline: "For the person still deciding whether this is theirs.",
    description:
      "The monthly membership is the right door if you've done one session and want to keep the work going without committing to a year. You can cancel anytime from the member portal — no email back-and-forth, no friction.",
    features: [
      "One 60-minute session per month, priority booked",
      "Recording archive access — every past session, replayable",
      "Full Pattern Atlas access — all 10 structured patterns, updated continuously",
      "Priority booking ahead of public queue",
      "Member-only reflections — short written pieces between sessions",
    ],
    ctaLabel: "Start Monthly",
    popular: true,
  },
  {
    number: "II",
    id: "yearly" as const,
    name: "Annual",
    price: "₹9,999",
    period: "/ year",
    tagline: "For the person who already knows the pattern is theirs.",
    description:
      "The annual membership is for the person who has done the recognition work and is now in the long, unglamorous business of interrupting the pattern. Two months effectively free vs. monthly. Cancel anytime; we prorate the unused months.",
    features: [
      "Everything in Monthly, for 12 months",
      "12 sessions — one per month, transferable if you skip a month",
      "Annual chart review — a longer reading of how the year's pattern is shifting",
      "Birthday reading — a focused session timed to your solar return",
      "Direct message support between sessions",
      "Early access to new essays, Atlas patterns, and offerings",
    ],
    ctaLabel: "Go Annual",
    popular: false,
  },
];

const INCLUDED = [
  {
    title: "Monthly sessions",
    body: "One structured 60-minute session every month, booked against your chart and the pattern you are working on. Sessions do not expire if you skip a month — they roll forward.",
  },
  {
    title: "Recording archive",
    body: "Every session is recorded (with consent) and added to your private archive. Re-watch a moment from three months ago to see how the pattern has shifted. Audio + video, yours permanently.",
  },
  {
    title: "Pattern Atlas access",
    body: "Full access to the 10-pattern Atlas — the proprietary knowledge layer AstroKalki has built. Each pattern's nine-field structure (symptoms, origin, impact, shadow side, what it's mistaken for) is yours to read against your own chart.",
  },
  {
    title: "Priority booking",
    body: "Member bookings sit ahead of the public queue. If a slot opens up, members hear about it first. The public wait is real; this is the way around it.",
  },
];

export default async function MembershipPage() {
  // Read session to (a) pre-fill email on subscribe buttons, (b) surface
  // "already a member?" panel if the user has an active membership.
  const session = await getServerSession(authOptions).catch(() => null);
  const signedInEmail = session?.user?.email || "";

  let activeMembership: { plan: string; currentPeriodEnd: Date | null } | null = null;
  if (signedInEmail) {
    const m = await db.membership.findFirst({
      where: {
        OR: [
          { email: signedInEmail },
          { userId: (session?.user as { id?: string })?.id || "" },
        ],
        status: "active",
      },
      orderBy: { createdAt: "desc" },
      select: { plan: true, currentPeriodEnd: true },
    });
    if (m) activeMembership = m;
  }

  const membershipSchema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "AstroKalki Membership",
    description:
      "Recurring pattern recognition membership — monthly or annual. Sessions, archive access, Pattern Atlas, priority booking.",
    itemListElement: PLANS.map((plan) => ({
      "@type": "Offer",
      priceCurrency: "INR",
      price: plan.id === "monthly" ? "999" : "9999",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: plan.id === "monthly" ? "999" : "9999",
        priceCurrency: "INR",
        billingDuration: plan.id === "monthly" ? "P1M" : "P1Y",
        unitCode: "MON",
      },
      description: plan.description,
      name: `AstroKalki ${plan.name} Membership`,
    })),
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(membershipSchema) }}
      />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Membership" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Membership
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            The work, made <span className="text-[#c9a96e] italic">regular.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            Pattern recognition is not a single session. The pattern was built over years; interrupting it is the work of months. Membership is the structure that holds that work — recurring sessions, an archive you can revisit, and the Atlas to read against your own chart.
          </p>
          <p className="mt-8 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
            Cancel anytime · Prorated refunds · INR pricing
          </p>
        </div>
      </header>

      {/* ─── Already a member panel ─────────────────────────────────────────── */}
      {activeMembership && (
        <section className="border-b border-white/[0.04] bg-white/[0.015]">
          <div className="max-w-4xl mx-auto px-6 sm:px-10 py-10 sm:py-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-2 font-light">
                  You are already a member
                </p>
                <p className="text-base text-[#cfcabf] font-light leading-[1.7]">
                  Your <span className="text-[#c9a96e] capitalize">{activeMembership.plan}</span> membership is active{activeMembership.currentPeriodEnd ? ` until ${activeMembership.currentPeriodEnd.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}` : ""}.
                </p>
              </div>
              <Link
                href="/account"
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors whitespace-nowrap"
              >
                Go to member portal
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Plans — editorial table, matching /services visual language ──── */}
      <section className="py-16 sm:py-24 px-6 sm:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              Two doors
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
              Same work. Different cadence.
            </h2>
            <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              The monthly membership is the right door if you&apos;re still testing whether this work is yours. The annual is for when you already know it is. Both include the same set of member benefits; the difference is commitment, and the price that comes with it.
            </p>
          </div>

          <div className="border-t border-white/[0.06]">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className="border-b border-white/[0.06] py-12 sm:py-16 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10"
              >
                {/* Number + title + price */}
                <div className="md:col-span-5">
                  <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/40 font-mono block mb-4">
                    {plan.number}
                  </span>
                  <h3 className="text-[#f0eee9] text-2xl sm:text-3xl font-serif font-light tracking-[-0.01em] mb-3 leading-tight">
                    {plan.name}
                  </h3>
                  {plan.popular && (
                    <span className="inline-block text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/80 border border-[#c9a96e]/30 px-3 py-1.5">
                      Most chosen
                    </span>
                  )}
                  <div className="flex items-baseline gap-2 mt-6">
                    <span className="text-[#c9a96e] text-3xl sm:text-4xl font-serif font-light">
                      {plan.price}
                    </span>
                    <span className="text-[11px] tracking-[0.2em] uppercase text-[#7a7a7a] font-light">
                      {plan.period}
                    </span>
                  </div>
                </div>

                {/* Description + features */}
                <div className="md:col-span-5">
                  <p className="text-[#cfcabf] text-base sm:text-lg font-serif italic font-light leading-[1.5] mb-5">
                    {plan.tagline}
                  </p>
                  <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.8] mb-6 font-light max-w-md">
                    {plan.description}
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-[12px] text-[#7a7a7a] leading-[1.7] font-light flex gap-3"
                      >
                        <span className="text-[#c9a96e]/50 shrink-0">—</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA — SubscribeButton client component */}
                <div className="md:col-span-2 flex md:justify-end md:items-end">
                  <div className="w-full md:w-auto self-start md:self-end">
                    <SubscribeButton
                      plan={plan.id}
                      label={plan.ctaLabel}
                      defaultEmail={signedInEmail}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[#5a5a5a] text-[10px] tracking-[0.2em] mt-12 font-light">
            All memberships include chart preparation. Cancel anytime from the member portal. Prorated refunds on annual plans. Prices in INR.
          </p>
        </div>
      </section>

      {/* ─── What&apos;s included ──────────────────────────────────────────── */}
      <section className="border-t border-white/[0.04] bg-white/[0.015] py-16 sm:py-24 px-6 sm:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
              What&apos;s inside
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
              The four things membership gives you.
            </h2>
            <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              These are not perks. They are the four instruments the work requires — recurring time, an archive to revisit, the structured knowledge to read against, and priority access to the calendar.
            </p>
          </div>

          <div className="space-y-12">
            {INCLUDED.map((item, idx) => (
              <div
                key={item.title}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10"
              >
                <div className="md:col-span-2">
                  <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/50 font-mono">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="md:col-span-10">
                  <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-base text-[#cfcabf] font-light leading-[1.8] max-w-2xl">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ / footer of the page ──────────────────────────────────────── */}
      <section className="border-t border-white/[0.04] py-16 sm:py-24 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Before you decide
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-12">
            Common questions.
          </h2>

          <div className="space-y-10">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes. From the member portal, you can cancel your subscription at any time. The membership stays active until the end of the current billing period, then expires. No email back-and-forth, no retention calls.",
              },
              {
                q: "What happens to my recordings if I cancel?",
                a: "Your recording archive stays accessible. Recordings made during your membership period remain yours — the archive is not paywalled retroactively. The Atlas access stays too; we don't revoke knowledge.",
              },
              {
                q: "Do unused sessions roll over?",
                a: "Yes — one month forward. If you skip a month, your next month has two sessions available. Beyond one month of rollover, sessions expire. This keeps the work cadenced rather than letting it pile up.",
              },
              {
                q: "Can I switch between monthly and annual?",
                a: "Yes, from the member portal via the Stripe billing interface. Switching from monthly to annual prorates your existing payment toward the annual plan. Switching from annual to monthly issues a prorated refund for the unused months.",
              },
              {
                q: "What if I can't make a session I booked?",
                a: "Reschedule up to 24 hours before the session, no questions asked. Inside 24 hours, the session is forfeit — your slot was held against other members who wanted it.",
              },
              {
                q: "Is this a replacement for therapy?",
                a: "No. Membership is pattern recognition work, not clinical care. If you are in crisis or working with a therapist on trauma recovery, the membership is a complement, not a substitute. We will say so directly if we think therapy is the more appropriate next step.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-white/[0.04] pb-8">
                <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3">
                  {item.q}
                </h3>
                <p className="text-base text-[#cfcabf] font-light leading-[1.8]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>

          {/* Closing CTA */}
          <div className="mt-16 pt-10 border-t border-white/[0.04] text-center">
            <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
              Not ready to commit? Start with a single session. If it lands, the membership is there.
            </p>
            <Link
              href="/services"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              See single sessions
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
