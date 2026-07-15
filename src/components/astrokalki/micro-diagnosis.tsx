"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { openWhatsApp } from "@/lib/whatsapp";
import { useI18n } from "@/lib/i18n-context";

const patternIds = [
  { id: "heartbreak", labelKey: "microDiagnosis.pattern.heartbreak", insightKey: "microDiagnosis.pattern.heartbreak.insight" },
  { id: "sabotage", labelKey: "microDiagnosis.pattern.sabotage", insightKey: "microDiagnosis.pattern.sabotage.insight" },
  { id: "misunderstood", labelKey: "microDiagnosis.pattern.misunderstood", insightKey: "microDiagnosis.pattern.misunderstood.insight" },
  { id: "exhaustion", labelKey: "microDiagnosis.pattern.exhaustion", insightKey: "microDiagnosis.pattern.exhaustion.insight" },
  { id: "purpose", labelKey: "microDiagnosis.pattern.purpose", insightKey: "microDiagnosis.pattern.purpose.insight" },
  { id: "attachment", labelKey: "microDiagnosis.pattern.attachment", insightKey: "microDiagnosis.pattern.attachment.insight" },
];

export default function MicroDiagnosis() {
  const [selected, setSelected] = useState<string[]>([]);
  const { t } = useI18n();

  const togglePattern = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    const selectedLabels = patternIds
      .filter((p) => selected.includes(p.id))
      .map((p) => t(p.labelKey));

    openWhatsApp({
      type: "booking",
      name: "",
      email: "",
      duration: "",
      price: "",
      contexts: selectedLabels,
      message: `Pattern self-diagnosis: ${selectedLabels.join(", ")}`,
    });
  };

  return (
    <section id="micro-diagnosis" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-4xl mx-auto">
        {/* Section header — appears instantly, no reveal animation */}
        <div className="mb-20 sm:mb-24">
          {/* Thin gold marker — signals "begin here" without decoration */}
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-10" />
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e] mb-8 font-light">
            {t("microDiagnosis.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-2xl">
            {t("microDiagnosis.headline1")}{" "}
            <span className="text-[#c9a96e] italic font-light">{t("microDiagnosis.headline2")}</span>
          </h2>
        </div>

        {/* Pattern options — glass cards with glow */}
        <div className="space-y-4 sm:space-y-6">
          {patternIds.map((pattern, i) => {
            const isSelected = selected.includes(pattern.id);
            return (
              <button
                key={pattern.id}
                onClick={() => togglePattern(pattern.id)}
                className={`relative w-full text-left rounded-xl px-6 sm:px-8 py-5 sm:py-7 transition-all duration-500 group ${
                  isSelected
                    ? "bg-[#c9a96e]/8 border border-[#c9a96e]/50 shadow-lg shadow-[#c9a96e]/15"
                    : "bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] hover:border-[#c9a96e]/30"
                }`}
              >
                {/* Glow background on select */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c9a96e]/10 to-transparent opacity-50 blur-xl -z-10" />
                )}

                <div className="flex items-baseline gap-6">
                  {/* Number badge */}
                  <span className={`text-xs sm:text-sm tracking-[0.3em] font-mono font-bold pt-1 transition-colors duration-500 ${
                    isSelected ? "text-[#c9a96e]" : "text-[#c9a96e]/50"
                  }`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Pattern content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-base sm:text-lg md:text-xl font-montserrat font-semibold leading-tight transition-colors duration-500 ${
                      isSelected
                        ? "text-[#e8e6e1]"
                        : "text-[#b0aca5] group-hover:text-[#e8e6e1]"
                    }`}>
                      {t(pattern.labelKey)}
                    </p>
                    
                    {isSelected && (
                      <p className="text-[#c9a96e]/80 text-xs sm:text-sm mt-3 font-montserrat font-light leading-relaxed">
                        {t(pattern.insightKey)}
                      </p>
                    )}
                  </div>

                  {/* Check icon */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#c9a96e] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue CTA */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
              className="mt-16 sm:mt-20"
            >
              <p className="text-[#b0aca5] text-sm leading-relaxed mb-10 max-w-md font-montserrat font-light">
                {selected.length === 1
                  ? t("microDiagnosis.onePattern")
                  : `${selected.length} ${t("microDiagnosis.multiplePatterns")}`}
                {" "}{t("microDiagnosis.notCoincidence")}
              </p>
              <button
                onClick={handleContinue}
                className="group relative inline-flex items-center gap-3 px-8 py-3 rounded-lg font-montserrat font-semibold text-sm tracking-wide overflow-hidden transition-all duration-500"
              >
                {/* Gradient border background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#c9a96e] to-[#a8884d] rounded-lg p-px" />
                <div className="absolute inset-px bg-[#050505] rounded-[6px]" />
                
                {/* Content */}
                <span className="relative z-10 flex items-center gap-3 text-[#c9a96e] group-hover:text-[#e8e6e1] transition-colors duration-300">
                  {t("microDiagnosis.continue")}
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </span>

                {/* Glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#c9a96e]/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
