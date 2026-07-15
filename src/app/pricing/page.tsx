"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import Navigation from "@/components/astrokalki/navigation";
import Footer from "@/components/astrokalki/footer";

const pricingTiers = [
  {
    id: "single-reading",
    number: "I",
    titleKey: "pricing.single.title",
    descriptionKey: "pricing.single.description",
    price: "₹1,999",
    period: "one-time",
    duration: "60 minutes",
    featureKeys: [
      "pricing.single.feature1",
      "pricing.single.feature2",
      "pricing.single.feature3",
      "pricing.single.feature4",
      "pricing.single.feature5",
    ],
    ctaKey: "pricing.single.cta",
    popular: false,
    icon: "/images/icon-observer.png",
  },
  {
    id: "monthly-membership",
    number: "II",
    titleKey: "pricing.monthly.title",
    descriptionKey: "pricing.monthly.description",
    price: "₹999",
    period: "/month",
    duration: "Unlimited access",
    featureKeys: [
      "pricing.monthly.feature1",
      "pricing.monthly.feature2",
      "pricing.monthly.feature3",
      "pricing.monthly.feature4",
      "pricing.monthly.feature5",
      "pricing.monthly.feature6",
    ],
    ctaKey: "pricing.monthly.cta",
    popular: true,
    icon: "/images/icon-deep-work.png",
  },
  {
    id: "custom-package",
    number: "III",
    titleKey: "pricing.custom.title",
    descriptionKey: "pricing.custom.description",
    price: "Custom",
    period: "tailored",
    duration: "Flexible",
    featureKeys: [
      "pricing.custom.feature1",
      "pricing.custom.feature2",
      "pricing.custom.feature3",
      "pricing.custom.feature4",
    ],
    ctaKey: "pricing.custom.cta",
    popular: false,
    icon: "/images/icon-observer.png",
  },
];

const faqItems = [
  { questionKey: "pricing.faq1.q", answerKey: "pricing.faq1.a" },
  { questionKey: "pricing.faq2.q", answerKey: "pricing.faq2.a" },
  { questionKey: "pricing.faq3.q", answerKey: "pricing.faq3.a" },
  { questionKey: "pricing.faq4.q", answerKey: "pricing.faq4.a" },
];

export default function PricingPage() {
  const { t } = useI18n();

  return (
    <>
      <Navigation />
      <main id="main-content" className="min-h-screen flex flex-col bg-[#050505]">
        {/* Hero section */}
        <section className="relative py-20 sm:py-32 px-6 sm:px-10 lg:px-16 pt-32 sm:pt-48">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-6 font-light">
                {t("pricing.label")}
              </p>
              <h1 className="text-[#f0eee9] text-[clamp(2rem,6vw,4rem)] leading-[1.1] tracking-[-0.02em] font-serif mb-6">
                {t("pricing.hero.headline")}
              </h1>
              <p className="text-[#9a9a9a] text-lg leading-[1.8] max-w-2xl mx-auto mb-8">
                {t("pricing.hero.subheadline")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing tiers */}
        <section className="py-20 sm:py-32 px-6 sm:px-10 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {pricingTiers.map((tier, idx) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group h-full"
                >
                  <div
                    className={`relative rounded-xl overflow-hidden h-full transition-all duration-500 ${
                      tier.popular
                        ? "ring-2 ring-[#c9a96e]/50 shadow-2xl shadow-[#c9a96e]/20"
                        : "ring-1 ring-[#c9a96e]/20"
                    }`}
                  >
                    {/* Background layers */}
                    <div
                      className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                        tier.popular
                          ? "bg-gradient-to-br from-[#c9a96e]/10 via-[#0a0a0a] to-[#050505]"
                          : "bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#000000]"
                      }`}
                    />

                    <div className="relative z-10 p-8 sm:p-10 h-full flex flex-col">
                      {/* Badge */}
                      {tier.popular && (
                        <div className="mb-6">
                          <span className="inline-block text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/90 border border-[#c9a96e]/50 px-3 py-1.5 bg-[#c9a96e]/5">
                            {t("pricing.mostPopular")}
                          </span>
                        </div>
                      )}

                      {/* Number */}
                      <div className="mb-4">
                        <span className="text-[14px] tracking-[0.3em] uppercase text-[#c9a96e]/60 font-light">
                          Tier {tier.number}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-[#f0eee9] text-2xl sm:text-3xl font-serif tracking-[-0.01em] mb-3 leading-tight group-hover:text-[#c9a96e] transition-colors">
                        {t(tier.titleKey)}
                      </h3>

                      {/* Description */}
                      <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-8">
                        {t(tier.descriptionKey)}
                      </p>

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-[#c9a96e]/10">
                        <span className="text-[#c9a96e] text-4xl font-serif font-light">
                          {tier.price}
                        </span>
                        <span className="text-[11px] tracking-[0.2em] uppercase text-[#7a7a7a]">
                          {tier.period}
                        </span>
                      </div>

                      {/* Duration */}
                      <p className="text-[12px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-8">
                        {tier.duration}
                      </p>

                      {/* Features */}
                      <ul className="space-y-4 mb-10 flex-grow">
                        {tier.featureKeys.map((featureKey) => (
                          <li key={featureKey} className="text-[13px] text-[#b0aca5] leading-[1.7] flex gap-3">
                            <span className="text-[#c9a96e] shrink-0 mt-0.5 text-lg">→</span>
                            <span>{t(featureKey)}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Link
                        href="#booking"
                        className={`inline-flex items-center justify-center gap-2 text-[11px] tracking-[0.3em] uppercase px-6 py-3 rounded-lg transition-all duration-300 w-full ${
                          tier.popular
                            ? "bg-[#c9a96e] text-[#050505] hover:bg-[#e8d5b7] hover:shadow-xl hover:shadow-[#c9a96e]/40 hover:-translate-y-1"
                            : "text-[#f0eee9] border border-[#c9a96e]/40 hover:border-[#c9a96e]/70 hover:bg-[#c9a96e]/5 hover:text-[#c9a96e]"
                        }`}
                      >
                        {t(tier.ctaKey)}
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-20 sm:py-32 px-6 sm:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-[#f0eee9] text-3xl font-serif tracking-[-0.01em] mb-16 text-center">
              {t("pricing.comparison.headline")}
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#c9a96e]/20">
                    <th className="text-left p-4 text-[#f0eee9] font-serif text-base tracking-[-0.01em]">Feature</th>
                    {pricingTiers.map((tier) => (
                      <th key={tier.id} className="text-center p-4 text-[#c9a96e]/80 text-[11px] tracking-[0.2em] uppercase font-light">
                        {t(tier.titleKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#c9a96e]/10">
                    <td className="p-4 text-[#9a9a9a]">{t("pricing.compare.sessions")}</td>
                    <td className="p-4 text-center text-[#9a9a9a]">1</td>
                    <td className="p-4 text-center text-[#c9a96e]">Unlimited</td>
                    <td className="p-4 text-center text-[#9a9a9a]">Custom</td>
                  </tr>
                  <tr className="border-b border-[#c9a96e]/10">
                    <td className="p-4 text-[#9a9a9a]">{t("pricing.compare.followup")}</td>
                    <td className="p-4 text-center text-[#9a9a9a]">No</td>
                    <td className="p-4 text-center text-[#c9a96e]">Yes</td>
                    <td className="p-4 text-center text-[#9a9a9a]">Yes</td>
                  </tr>
                  <tr className="border-b border-[#c9a96e]/10">
                    <td className="p-4 text-[#9a9a9a]">{t("pricing.compare.communityAccess")}</td>
                    <td className="p-4 text-center text-[#9a9a9a]">No</td>
                    <td className="p-4 text-center text-[#c9a96e]">Yes</td>
                    <td className="p-4 text-center text-[#9a9a9a]">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 sm:py-32 px-6 sm:px-10 lg:px-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-[#f0eee9] text-3xl font-serif tracking-[-0.01em] mb-16 text-center">
              {t("pricing.faq.headline")}
            </h2>

            <div className="space-y-6">
              {faqItems.map((item, idx) => (
                <motion.details
                  key={idx}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  className="group p-6 border border-[#c9a96e]/20 rounded-lg hover:border-[#c9a96e]/40 transition-colors cursor-pointer"
                >
                  <summary className="flex items-center justify-between list-none">
                    <h3 className="text-[#f0eee9] font-serif text-lg tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
                      {t(item.questionKey)}
                    </h3>
                    <span className="text-[#c9a96e]/60 text-2xl group-open:rotate-180 transition-transform">
                      ›
                    </span>
                  </summary>
                  <p className="text-[#9a9a9a] leading-[1.8] mt-4 text-sm">
                    {t(item.answerKey)}
                  </p>
                </motion.details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-20 sm:py-32 px-6 sm:px-10 lg:px-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-[#f0eee9] text-3xl sm:text-4xl font-serif tracking-[-0.01em] mb-6">
              {t("pricing.cta.headline")}
            </h2>
            <p className="text-[#9a9a9a] text-lg leading-[1.8] mb-10">
              {t("pricing.cta.subheadline")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#booking"
                className="inline-flex items-center justify-center gap-2 text-[11px] tracking-[0.3em] uppercase px-8 py-4 rounded-lg bg-[#c9a96e] text-[#050505] hover:bg-[#e8d5b7] hover:shadow-xl hover:shadow-[#c9a96e]/40 transition-all duration-300"
              >
                {t("pricing.cta.primary")}
                <span>→</span>
              </Link>
              <Link
                href="/refer"
                className="inline-flex items-center justify-center gap-2 text-[11px] tracking-[0.3em] uppercase px-8 py-4 rounded-lg border border-[#c9a96e]/40 text-[#f0eee9] hover:border-[#c9a96e]/70 hover:bg-[#c9a96e]/5 transition-all duration-300"
              >
                {t("pricing.cta.secondary")}
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
