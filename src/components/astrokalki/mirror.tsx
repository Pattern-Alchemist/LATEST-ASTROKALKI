"use client";

import { useI18n } from "@/lib/i18n-context";

const pillarKeys = [
  {
    number: "01",
    titleKey: "mirror.pillar1.title",
    descriptionKey: "mirror.pillar1.description",
    detailKey: "mirror.pillar1.detail",
  },
  {
    number: "02",
    titleKey: "mirror.pillar2.title",
    descriptionKey: "mirror.pillar2.description",
    detailKey: "mirror.pillar2.detail",
  },
  {
    number: "03",
    titleKey: "mirror.pillar3.title",
    descriptionKey: "mirror.pillar3.description",
    detailKey: "mirror.pillar3.detail",
  },
];

export default function Mirror() {
  const { t } = useI18n();

  return (
    <section id="mirror" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-5xl mx-auto">
        {/* Section header — editorial, no decorative imagery */}
        <div className="mb-20 sm:mb-32">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("mirror.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-2xl">
            {t("mirror.headline1")}{" "}
            <span className="text-[#c9a96e] italic font-light">{t("mirror.headline2")}</span>
          </h2>
          <p className="text-[#8a8a8a] text-sm sm:text-base max-w-md mt-8 leading-[1.8] font-light">
            {t("mirror.subtitle")}
          </p>
        </div>

        {/* Three pillars — pure typography, generous whitespace */}
        <div className="space-y-16 sm:space-y-24">
          {pillarKeys.map((pillar) => (
            <div
              key={pillar.number}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10"
            >
              <div className="md:col-span-2">
                <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/50 font-mono">
                  {pillar.number}
                </span>
              </div>
              <div className="md:col-span-10">
                <h3 className="text-[#f0eee9] text-xl sm:text-2xl md:text-3xl font-serif tracking-[-0.01em] mb-4 leading-tight">
                  {t(pillar.titleKey)}
                </h3>
                <p className="text-[#9a9a9a] text-sm sm:text-base max-w-xl leading-[1.85] mb-4">
                  {t(pillar.descriptionKey)}
                </p>
                <p className="text-[#c9a96e]/70 text-[13px] italic font-light leading-relaxed">
                  {t(pillar.detailKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom statement — pure typographic moment */}
        <div className="mt-32 sm:mt-48 text-center">
          <p className="text-[#f0eee9] text-[clamp(1.25rem,3vw,2rem)] font-serif italic font-light max-w-xl mx-auto leading-[1.5]">
            &ldquo;{t("mirror.quote1")}
            <br />
            {t("mirror.quote2")}&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
