"use client";

import { useI18n } from "@/lib/i18n-context";

const statementKeys = [
  { statementKey: "problem.statement1", subtextKey: "problem.subtext1" },
  { statementKey: "problem.statement2", subtextKey: "problem.subtext2" },
  { statementKey: "problem.statement3", subtextKey: "problem.subtext3" },
  { statementKey: "problem.statement4", subtextKey: "problem.subtext4" },
  { statementKey: "problem.statement5", subtextKey: "problem.subtext5" },
];

export default function Problem() {
  const { t } = useI18n();

  return (
    <section id="problem" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="mb-20 sm:mb-28">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("problem.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-3xl">
            {t("problem.headline1")}{" "}
            <span className="text-[#6a6a6a] italic font-light">{t("problem.headline2")}</span>
          </h2>
        </div>

        {/* Pattern statements — editorial list */}
        <div className="border-t border-white/[0.06]">
          {statementKeys.map((item, i) => (
            <div
              key={item.statementKey}
              className="group border-b border-white/[0.06] py-8 sm:py-10 grid grid-cols-12 gap-6"
            >
              <span className="col-span-2 sm:col-span-1 text-[11px] tracking-[0.3em] text-[#c9a96e]/40 font-mono pt-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="col-span-10 sm:col-span-11">
                <p className="text-[#f0eee9] text-lg sm:text-xl md:text-2xl font-serif font-light leading-[1.4] mb-3 group-hover:text-[#c9a96e] transition-colors duration-500">
                  {t(item.statementKey)}
                </p>
                <p className="text-[#7a7a7a] text-sm leading-[1.7] max-h-0 opacity-0 group-hover:max-h-32 group-hover:opacity-100 group-hover:mt-3 transition-all duration-500 overflow-hidden font-light">
                  {t(item.subtextKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
