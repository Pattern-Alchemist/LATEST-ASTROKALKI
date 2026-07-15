"use client";

import { useI18n } from "@/lib/i18n-context";

export default function About() {
  const { t } = useI18n();

  return (
    <section id="about" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="mb-20 sm:mb-28">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("about.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-3xl">
            {t("about.headline1")}{" "}
            <span className="text-[#6a6a6a] italic font-light">{t("about.headline2")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
          {/* Left - signature mark */}
          <div className="md:col-span-4">
            <p className="text-[#f0eee9] text-3xl sm:text-4xl font-serif italic font-light leading-[1.1] mb-3">
              AstroKalki
            </p>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 font-light">
              {t("about.subtitle")}
            </p>
          </div>

          {/* Right - text */}
          <div className="md:col-span-8 space-y-6">
            <p className="text-[#f0eee9] text-base sm:text-lg leading-[1.8] font-light">
              {t("about.para1")}
            </p>

            <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] font-light">
              {t("about.para2")}
            </p>

            <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] font-light">
              {t("about.para3")}
            </p>

            {/* Stats — minimal horizontal row */}
            <div className="pt-8 mt-8 border-t border-white/[0.06] flex flex-wrap gap-12 sm:gap-16">
              <div>
                <p className="text-[#c9a96e] text-2xl sm:text-3xl font-serif">500+</p>
                <p className="text-[9px] tracking-[0.3em] text-[#7a7a7a] uppercase mt-2 font-light">
                  {t("about.decodings")}
                </p>
              </div>
              <div>
                <p className="text-[#c9a96e] text-2xl sm:text-3xl font-serif">8+</p>
                <p className="text-[9px] tracking-[0.3em] text-[#7a7a7a] uppercase mt-2 font-light">
                  {t("about.yearsDepth")}
                </p>
              </div>
              <div>
                <p className="text-[#c9a96e] text-2xl sm:text-3xl font-serif">3</p>
                <p className="text-[9px] tracking-[0.3em] text-[#7a7a7a] uppercase mt-2 font-light">
                  {t("about.disciplines")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
