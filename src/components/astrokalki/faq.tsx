"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";

const faqKeys = [
  { questionKey: "faq.q1", answerKey: "faq.a1" },
  { questionKey: "faq.q2", answerKey: "faq.a2" },
  { questionKey: "faq.q3", answerKey: "faq.a3" },
  { questionKey: "faq.q4", answerKey: "faq.a4" },
  { questionKey: "faq.q5", answerKey: "faq.a5" },
  { questionKey: "faq.q6", answerKey: "faq.a6" },
  { questionKey: "faq.q7", answerKey: "faq.a7" },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;
  return (
    <div className="border-b border-white/[0.06]">
      <h3>
        <button
          id={buttonId}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="w-full text-left py-8 grid grid-cols-12 gap-6 cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
        >
          <span className="col-span-2 sm:col-span-1 text-[11px] tracking-[0.3em] text-[#c9a96e]/40 font-mono pt-1" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={`col-span-9 sm:col-span-10 text-base sm:text-lg md:text-xl font-serif font-light leading-tight transition-colors duration-300 ${
            isOpen ? "text-[#c9a96e]" : "text-[#f0eee9] group-hover:text-[#c9a96e]/70"
          }`}>
            {question}
          </span>
          <span className={`col-span-1 text-lg shrink-0 transition-colors duration-300 text-right ${
            isOpen ? "text-[#c9a96e]" : "text-[#5a5a5a]"
          }`} aria-hidden="true">
            {isOpen ? "\u2212" : "+"}
          </span>
        </button>
      </h3>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] pb-8 pl-[8.33%] sm:pl-[8.33%] pr-12 max-w-xl font-light">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t } = useI18n();

  return (
    <section id="faq" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-20 sm:mb-24">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("faq.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-2xl">
            {t("faq.headline1")}{" "}
            <span className="text-[#6a6a6a] italic font-light">{t("faq.headline2")}</span>
          </h2>
        </div>

        <div className="border-t border-white/[0.06]">
          {faqKeys.map((faq, i) => (
            <FAQItem
              key={faq.questionKey}
              question={t(faq.questionKey)}
              answer={t(faq.answerKey)}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
