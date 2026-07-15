"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n-context";

const tierKeys = [
  {
    id: "observer",
    number: "I",
    titleKey: "membership.single.title",
    descriptionKey: "membership.single.description",
    featureKeys: [
      "membership.single.feature1",
      "membership.single.feature2",
      "membership.single.feature3",
      "membership.single.feature4",
    ],
    ctaKey: "membership.single.cta",
    price: "₹1,999",
    period: "one-time",
    membershipType: "single",
    popular: false,
    icon: "/images/icon-observer.png",
  },
  {
    id: "deep-work",
    number: "II",
    titleKey: "membership.monthly.title",
    descriptionKey: "membership.monthly.description",
    featureKeys: [
      "membership.monthly.feature1",
      "membership.monthly.feature2",
      "membership.monthly.feature3",
      "membership.monthly.feature4",
      "membership.monthly.feature5",
    ],
    ctaKey: "membership.monthly.cta",
    price: "₹999",
    period: "/month",
    membershipType: "monthly",
    popular: true,
    icon: "/images/icon-deep-work.png",
  },
];

export default function MembershipTiers() {
  const { t } = useI18n();

  return (
    <section id="membership" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-20 sm:mb-32">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("membership.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-3xl">
            {t("membership.headline1")}{" "}
            <span className="text-[#6a6a6a] italic font-light">{t("membership.headline2")}</span>
          </h2>
          <p className="text-[#9a9a9a] text-base leading-[1.8] max-w-2xl mt-6">
            Choose your path to deeper self-understanding. Each tier offers progressive depth.
          </p>
        </div>

        {/* Tier cards — premium layout with glass morphism */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {tierKeys.map((tier, idx) => (
            <div
              key={tier.id}
              className={`group relative rounded-xl overflow-hidden transition-all duration-500 fade-in-section`}
              style={{animationDelay: `${idx * 150}ms`}}
            >
              {/* Background layers */}
              <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                tier.popular
                  ? 'bg-gradient-to-br from-[#c9a96e]/10 via-[#0a0a0a] to-[#050505] border border-[#c9a96e]/40'
                  : 'bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#000000] border border-[#c9a96e]/15'
              } group-hover:border-[#c9a96e]/60`} />
              
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                tier.popular ? 'shadow-2xl shadow-[#c9a96e]/40' : 'shadow-lg shadow-[#c9a96e]/20'
              }`} />

              <div className={`relative z-10 p-8 sm:p-10 h-full flex flex-col ${
                tier.popular ? 'bg-[#050505]/40' : 'bg-[#050505]/20'
              } backdrop-blur-sm`}>
                
                {/* Badge */}
                {tier.popular && (
                  <div className="mb-6">
                    <span className="inline-block text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/90 border border-[#c9a96e]/50 px-3 py-1.5 bg-[#c9a96e]/5">
                      {t("membership.mostPopular")}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className="w-20 h-20 mb-6 relative">
                  <Image
                    src={tier.icon}
                    alt={tier.id}
                    fill
                    className="object-contain"
                    priority={tier.popular}
                  />
                </div>

                {/* Title */}
                <h3 className="text-[#f0eee9] text-2xl sm:text-3xl font-serif tracking-[-0.01em] mb-3 leading-tight group-hover:text-[#c9a96e] transition-colors">
                  {t(tier.titleKey)}
                </h3>

                {/* Description */}
                <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-8 flex-grow">
                  {t(tier.descriptionKey)}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-8 pb-8 border-b border-[#c9a96e]/10">
                  <span className="text-[#c9a96e] text-4xl font-serif">{tier.price}</span>
                  <span className="text-[11px] tracking-[0.2em] uppercase text-[#7a7a7a]">{tier.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-10 flex-grow">
                  {tier.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="text-[13px] text-[#b0aca5] leading-[1.7] flex gap-3">
                      <span className="text-[#c9a96e] shrink-0 mt-0.5">✓</span>
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  href="/membership"
                  className={`inline-flex items-center justify-center gap-2 text-[11px] tracking-[0.3em] uppercase px-6 py-3 rounded-lg transition-all duration-300 ${
                    tier.popular
                      ? 'bg-[#c9a96e] text-[#050505] hover:bg-[#e8d5b7] hover:shadow-xl hover:shadow-[#c9a96e]/40 hover:-translate-y-1'
                      : 'text-[#f0eee9] border border-[#c9a96e]/40 hover:border-[#c9a96e]/70 hover:bg-[#c9a96e]/5 hover:text-[#c9a96e]'
                  }`}
                >
                  {t(tier.ctaKey)}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 sm:mt-20 pt-12 border-t border-[#c9a96e]/10">
          <p className="text-[#7a7a7a] text-[12px] tracking-[0.2em] leading-relaxed max-w-3xl">
            {t("membership.footer")} All memberships include lifetime access to recorded sessions, community support, and quarterly check-ins with your patterns.
          </p>
        </div>
      </div>
    </section>
  );
}
