"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const consent = localStorage.getItem("astrokalki-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("astrokalki-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("astrokalki-consent", "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.04] px-4 py-4"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[#7a7a7a] leading-relaxed text-center sm:text-left">
              {t("consent.text")}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={decline}
                className="text-[9px] tracking-[0.15em] uppercase text-[#5a5a5a] hover:text-[#7a7a7a] transition-colors px-4 py-2 cursor-pointer"
              >
                {t("consent.decline")}
              </button>
              <button
                onClick={accept}
                className="btn-primary-gold px-4 py-2 text-[9px] tracking-[0.15em] uppercase rounded-sm cursor-pointer"
              >
                {t("consent.accept")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
