"use client";

import { useI18n } from "@/lib/i18n-context";

const itemKeys = [
  "whoFindsMe.item1",
  "whoFindsMe.item2",
  "whoFindsMe.item3",
  "whoFindsMe.item4",
  "whoFindsMe.item5",
];

export default function WhoFindsMe() {
  const { t } = useI18n();

  return (
    <section className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-16 sm:mb-20">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("whoFindsMe.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em] font-serif max-w-2xl">
            {t("whoFindsMe.headline")}
          </h2>
        </div>

        <div>
          {itemKeys.map((key, i) => (
            <div
              key={key}
              className="group border-b border-white/[0.06] py-6 sm:py-8 grid grid-cols-12 gap-4 items-baseline"
            >
              <span className="col-span-1 text-[11px] tracking-[0.3em] text-[#c9a96e]/40 font-mono">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="col-span-11 text-[#8a8a8a] group-hover:text-[#f0eee9] text-base sm:text-lg leading-[1.7] transition-colors duration-500 font-light">
                {t(key)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 sm:mt-20">
          <p className="text-[#c9a96e]/70 text-sm sm:text-base italic font-serif font-light">
            {t("whoFindsMe.footer")}
          </p>
        </div>
      </div>
    </section>
  );
}
