"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { microReadingToAtlasPatternObject } from "@/lib/content/patterns/micro-to-atlas";
import VoiceInput, { type VoiceResult } from "@/components/astrokalki/voice-input";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const emotionalPatternKeys = [
  { id: "abandonment", labelKey: "microReading.pattern.abandonment" },
  { id: "control", labelKey: "microReading.pattern.control" },
  { id: "people-pleasing", labelKey: "microReading.pattern.peoplePleasing" },
  { id: "emotional-numbness", labelKey: "microReading.pattern.emotionalNumbness" },
  { id: "overthinking", labelKey: "microReading.pattern.overthinking" },
  { id: "self-doubt", labelKey: "microReading.pattern.selfDoubt" },
];

const frustrationKeys = [
  { id: "same-fight", labelKey: "microReading.frustration.sameFight" },
  { id: "attracting-wrong", labelKey: "microReading.frustration.attractingWrong" },
  { id: "cant-leave", labelKey: "microReading.frustration.cantLeave" },
  { id: "losing-myself", labelKey: "microReading.frustration.losingMyself" },
  { id: "communication", labelKey: "microReading.frustration.communication" },
  { id: "trust", labelKey: "microReading.frustration.trust" },
];

const patternHintKeys: Record<string, { titleKey: string; descriptionKey: string; number: string }> = {
  "abandonment": { titleKey: "microReading.hint.abandonment.title", descriptionKey: "microReading.hint.abandonment.description", number: "4" },
  "control": { titleKey: "microReading.hint.control.title", descriptionKey: "microReading.hint.control.description", number: "8" },
  "people-pleasing": { titleKey: "microReading.hint.peoplePleasing.title", descriptionKey: "microReading.hint.peoplePleasing.description", number: "2" },
  "emotional-numbness": { titleKey: "microReading.hint.emotionalNumbness.title", descriptionKey: "microReading.hint.emotionalNumbness.description", number: "7" },
  "overthinking": { titleKey: "microReading.hint.overthinking.title", descriptionKey: "microReading.hint.overthinking.description", number: "5" },
  "self-doubt": { titleKey: "microReading.hint.selfDoubt.title", descriptionKey: "microReading.hint.selfDoubt.description", number: "3" },
};

/* -------------------------------------------------------------------------- */
/*  Voice-intake helpers                                                      */
/* -------------------------------------------------------------------------- */

/** Convert a pattern id ("people-pleasing") into its i18n label key. */
function patternIdToLabelKey(id: string): string {
  switch (id) {
    case "people-pleasing": return "microReading.pattern.peoplePleasing";
    case "emotional-numbness": return "microReading.pattern.emotionalNumbness";
    case "self-doubt": return "microReading.pattern.selfDoubt";
    default: return `microReading.pattern.${id}`;
  }
}

/** Convert a frustration id ("same-fight") into its i18n label key. */
function frustrationIdToLabelKey(id: string): string {
  switch (id) {
    case "same-fight": return "microReading.frustration.sameFight";
    case "attracting-wrong": return "microReading.frustration.attractingWrong";
    case "cant-leave": return "microReading.frustration.cantLeave";
    case "losing-myself": return "microReading.frustration.losingMyself";
    default: return `microReading.frustration.${id}`;
  }
}

/** Confidence threshold above which the UI auto-selects the matched option. */
const AUTO_SELECT_CONFIDENCE = 0.85;

type VoiceHeard =
  | { kind: "matched"; value: string; displayLabel: string; confidence: number }
  | { kind: "unclear"; transcription: string };

export default function MicroReading() {
  const ref = useRef(null);
  const { t } = useI18n();

  const [step, setStep] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedFrustration, setSelectedFrustration] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultRevealed, setResultRevealed] = useState(false);

  // ─── Voice intake state (M6-d) ───
  // Tracks what ASR just heard for the CURRENT step. Reset to null whenever
  // the user advances to a different step. When `kind: 'matched'`, the
  // matching option has already been auto-selected — the banner is purely
  // confirmation ("we heard: January"). When `kind: 'unclear'`, the user
  // must manually pick from the option list below.
  const [voiceHeard, setVoiceHeard] = useState<VoiceHeard | null>(null);

  // Clear voiceHeard on step change so a stale "we heard" banner doesn't
  // carry over from a previous question.
  useEffect(() => {
    setVoiceHeard(null);
  }, [step]);

  // ─── Enhancement #4: Persist partial state for abandoned-flow recovery ───
  // On every step change (and whenever the user types their email), send a
  // debounced POST to /api/micro-reading/partial so we can email them if they
  // abandon. Failures are silent — this must never break the user's flow.
  // NOTE: voiceHeard is intentionally NOT in the deps — it's a transient UX
  // state, not a meaningful quiz answer.
  useEffect(() => {
    if (step < 1) return; // no useful state until they've started

    const timer = setTimeout(() => {
      const payload = {
        email,
        step,
        partialData: {
          month: selectedMonth,
          patterns: selectedPatterns,
          frustration: selectedFrustration,
          step,
        },
        // Honeypot — must be empty. Real users never see this field.
        website: "",
      };
      fetch("/api/micro-reading/partial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [step, email, selectedMonth, selectedPatterns, selectedFrustration]);

  const togglePattern = (id: string) => {
    setSelectedPatterns((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const primaryPattern = selectedPatterns[0] || "abandonment";
  const hintKey = patternHintKeys[primaryPattern];

  // Resolve the matching Atlas pattern (if any) for the result CTA.
  // Uses the user's primary emotional pattern + relationship frustration
  // to pick the most relevant Atlas entry. Falls back to the hub when the
  // mapping is ambiguous or no emotional pattern has been selected yet.
  const atlasPattern = useMemo(
    () => microReadingToAtlasPatternObject(primaryPattern, selectedFrustration ?? ""),
    [primaryPattern, selectedFrustration]
  );

  /* ─── Voice result handler ────────────────────────────────────────── */
  // Called by VoiceInput when the user clicks "Use this" on a transcription.
  //   - High confidence (≥ 0.85) with a matchedValue → auto-select the
  //     matching option AND show the "we heard: X" confirmation banner.
  //   - Lower confidence OR no match → don't auto-select; show the raw
  //     transcription so the user can manually pick from the option list.
  const handleVoiceResult = (currentStep: number, result: VoiceResult) => {
    const { transcription, matchedValue, confidence } = result;

    if (
      matchedValue &&
      typeof confidence === "number" &&
      confidence >= AUTO_SELECT_CONFIDENCE
    ) {
      // Auto-select the matched option.
      if (currentStep === 1) {
        // Month matched value is the full English month name.
        if (months.includes(matchedValue)) {
          setSelectedMonth(matchedValue);
        }
        setVoiceHeard({
          kind: "matched",
          value: matchedValue,
          displayLabel: matchedValue,
          confidence,
        });
      } else if (currentStep === 2) {
        // Multi-select: add the matched pattern if not already selected.
        if (
          emotionalPatternKeys.some((p) => p.id === matchedValue) &&
          !selectedPatterns.includes(matchedValue)
        ) {
          setSelectedPatterns((prev) => [...prev, matchedValue]);
        }
        setVoiceHeard({
          kind: "matched",
          value: matchedValue,
          displayLabel: t(patternIdToLabelKey(matchedValue)),
          confidence,
        });
      } else if (currentStep === 3) {
        if (frustrationKeys.some((f) => f.id === matchedValue)) {
          setSelectedFrustration(matchedValue);
        }
        setVoiceHeard({
          kind: "matched",
          value: matchedValue,
          displayLabel: t(frustrationIdToLabelKey(matchedValue)),
          confidence,
        });
      }
    } else {
      // Low confidence or no match — surface the raw transcription and
      // invite the user to manually pick from the option list.
      setVoiceHeard({
        kind: "unclear",
        transcription: transcription || "",
      });
    }
  };

  const handleEmailSubmit = async () => {
    if (!email) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/micro-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          month: selectedMonth,
          patterns: selectedPatterns,
          frustration: selectedFrustration,
          // Honeypot — must be empty. Real users never see this field.
          website: "",
        }),
      });
    } catch {
      // Silent fail
    }

    setIsSubmitting(false);
    setEmailSubmitted(true);
    setTimeout(() => setResultRevealed(true), 600);
  };

  const canProceed = () => {
    if (step === 1) return selectedMonth !== null;
    if (step === 2) return selectedPatterns.length > 0;
    if (step === 3) return selectedFrustration !== null;
    return true;
  };

  /* ─── "We heard" confirmation banner (rendered above the option grid) ─ */
  const renderVoiceHeardBanner = () => {
    if (!voiceHeard) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 bg-white/[0.02] border border-white/[0.04] p-3"
        role="status"
        aria-live="polite"
        aria-label={t("microReading.voice.heardAria")}
      >
        <p
          style={{ fontFamily: "var(--font-cinzel)" }}
          className="text-[9px] tracking-[0.2em] uppercase text-[#c9a96e]/60 mb-2"
        >
          {t("microReading.voice.weHeard")}
        </p>
        {voiceHeard.kind === "matched" ? (
          <p className="text-sm italic text-[#cfcabf] font-serif leading-relaxed">
            {voiceHeard.displayLabel}
            <span className="ml-2 not-italic text-[10px] tracking-wide text-[#7a7a7a]">
              ({Math.round(voiceHeard.confidence * 100)}% · auto-selected)
            </span>
          </p>
        ) : (
          <p className="text-sm italic text-[#cfcabf] font-serif leading-relaxed">
            &ldquo;{voiceHeard.transcription}&rdquo;
            <span className="block not-italic text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] mt-1.5">
              Pick the closest match below
            </span>
          </p>
        )}
      </motion.div>
    );
  };

  return (
    <section id="micro-reading" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16" ref={ref}>
      <div className="max-w-3xl mx-auto">
        {/* Section header — static, no decorative motion */}
        <div className="mb-20 sm:mb-24">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("microReading.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-2xl">
            {t("microReading.headline1")}{" "}
            <span className="text-[#c9a96e] italic font-light">{t("microReading.headline2")}</span>
          </h2>
          <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.8] mt-6 max-w-md font-light">
            {t("microReading.subtitle")}
          </p>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {/* Step 0: Landing */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8 }}
              >
                <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] mb-10 max-w-md font-light">
                  {t("microReading.landingText")}
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] transition-colors duration-500 cursor-pointer"
                >
                  {t("microReading.beginReading")}
                  <span className="text-[#c9a96e]">→</span>
                </button>
              </motion.div>
            )}

            {/* Step 1: Month */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-10">
                  <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/50 font-mono block mb-4" aria-current="step">01 / 03</span>
                  <h3 className="text-[#f0eee9] text-xl sm:text-2xl font-serif tracking-[-0.01em] font-light leading-tight">
                    {t("microReading.step1Question")}
                  </h3>
                </div>

                {/* "We heard:" confirmation banner (M6-d) */}
                {renderVoiceHeardBanner()}

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="group" aria-label="Birth month selection">
                  {months.map((month, i) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      aria-label={`Birth month: ${month}`}
                      aria-pressed={selectedMonth === month}
                      className={`py-3 px-2 text-[11px] tracking-[0.2em] uppercase font-light transition-colors duration-400 cursor-pointer border-b focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] ${
                        selectedMonth === month
                          ? "border-[#c9a96e] text-[#c9a96e]"
                          : "border-white/[0.06] text-[#7a7a7a] hover:text-[#f0eee9] hover:border-white/[0.2]"
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>

                {/* Voice input — alternative to clicking the month buttons */}
                <div className="mt-8 pt-6 border-t border-white/[0.04]">
                  <VoiceInput
                    step={1}
                    onResult={(r) => handleVoiceResult(1, r)}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Patterns */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-10">
                  <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/50 font-mono block mb-4" aria-current="step">02 / 03</span>
                  <h3 className="text-[#f0eee9] text-xl sm:text-2xl font-serif tracking-[-0.01em] font-light leading-tight">
                    {t("microReading.step2Question")}
                  </h3>
                </div>

                {/* "We heard:" confirmation banner (M6-d) */}
                {renderVoiceHeardBanner()}

                <div className="border-t border-white/[0.06]" role="group" aria-label="Emotional pattern selection">
                  {emotionalPatternKeys.map((pattern, i) => (
                    <button
                      key={pattern.id}
                      onClick={() => togglePattern(pattern.id)}
                      aria-pressed={selectedPatterns.includes(pattern.id)}
                      aria-label={`Pattern ${i + 1}: ${t(pattern.labelKey)}`}
                      className={`w-full text-left py-4 border-b border-white/[0.06] transition-colors duration-400 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-inset ${
                        selectedPatterns.includes(pattern.id) ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"
                      }`}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className={`text-[10px] tracking-[0.2em] font-mono ${
                          selectedPatterns.includes(pattern.id) ? "text-[#c9a96e]" : "text-[#3a3a3a]"
                        }`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={`text-sm font-light transition-colors ${
                          selectedPatterns.includes(pattern.id) ? "text-[#c9a96e]" : "text-[#9a9a9a]"
                        }`}>
                          {t(pattern.labelKey)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Voice input — alternative to clicking the pattern buttons */}
                <div className="mt-8 pt-6 border-t border-white/[0.04]">
                  <VoiceInput
                    step={2}
                    onResult={(r) => handleVoiceResult(2, r)}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Frustrations */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-10">
                  <span className="text-[11px] tracking-[0.3em] text-[#c9a96e]/50 font-mono block mb-4" aria-current="step">03 / 03</span>
                  <h3 className="text-[#f0eee9] text-xl sm:text-2xl font-serif tracking-[-0.01em] font-light leading-tight">
                    {t("microReading.step3Question")}
                  </h3>
                </div>

                {/* "We heard:" confirmation banner (M6-d) */}
                {renderVoiceHeardBanner()}

                <div className="border-t border-white/[0.06]" role="group" aria-label="Frustration selection">
                  {frustrationKeys.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFrustration(item.id)}
                      aria-pressed={selectedFrustration === item.id}
                      aria-label={`Option ${i + 1}: ${t(item.labelKey)}`}
                      className={`w-full text-left py-4 border-b border-white/[0.06] transition-colors duration-400 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-inset ${
                        selectedFrustration === item.id ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"
                      }`}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className={`text-[10px] tracking-[0.2em] font-mono ${
                          selectedFrustration === item.id ? "text-[#c9a96e]" : "text-[#3a3a3a]"
                        }`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={`text-sm font-light transition-colors ${
                          selectedFrustration === item.id ? "text-[#c9a96e]" : "text-[#9a9a9a]"
                        }`}>
                          {t(item.labelKey)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Voice input — alternative to clicking the frustration buttons */}
                <div className="mt-8 pt-6 border-t border-white/[0.04]">
                  <VoiceInput
                    step={3}
                    onResult={(r) => handleVoiceResult(3, r)}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Email capture */}
            {step === 4 && !emailSubmitted && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8 }}
              >
                <h3 className="text-[#f0eee9] text-xl sm:text-2xl font-serif font-light mb-4 leading-tight">
                  {t("microReading.readingReady")}
                </h3>
                <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-10 max-w-md font-light">
                  {t("microReading.enterEmail")}
                </p>

                <div className="max-w-md">
                  <label
                    htmlFor="micro-reading-email"
                    className="sr-only"
                  >
                    Your email address — required to reveal your reading
                  </label>
                  <div className="flex gap-3 border-b border-white/[0.08] pb-3 focus-within:border-[#c9a96e]/60 transition-colors">
                    <input
                      id="micro-reading-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      required
                      aria-required="true"
                      aria-describedby="micro-reading-email-hint"
                      aria-invalid={email.length > 0 && !email.includes("@") ? true : undefined}
                      className="flex-1 bg-transparent text-sm text-[#f0eee9] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] placeholder:text-[#3a3a3a] font-light"
                    />
                    <button
                      onClick={handleEmailSubmit}
                      disabled={!email || isSubmitting}
                      aria-label={`${t("microReading.reveal")} — submit your email to reveal your micro-reading`}
                      className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer shrink-0 hover:text-[#f0eee9] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
                    >
                      {isSubmitting ? "..." : t("microReading.reveal")} →
                    </button>
                  </div>
                  <p id="micro-reading-email-hint" className="text-[10px] text-[#5a5a5a] mt-3 tracking-wide font-light">
                    {t("microReading.unsubscribe")}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 5: Result */}
            {step === 4 && emailSubmitted && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={resultRevealed ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-6 font-light">
                    {t("microReading.yourPattern")}
                  </p>
                  <div className="flex items-baseline gap-6 mb-8">
                    <span className="text-[#c9a96e] text-5xl sm:text-6xl font-serif font-light leading-none">
                      {hintKey.number}
                    </span>
                    <h3 className="text-[#f0eee9] text-xl sm:text-2xl md:text-3xl font-serif font-light leading-tight">
                      {t(hintKey.titleKey)}
                    </h3>
                  </div>
                  <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.85] max-w-md font-light">
                    {t(hintKey.descriptionKey)}
                  </p>
                </motion.div>

                {/* ─── Atlas CTA — natural next step into the deeper reading ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={resultRevealed ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6, duration: 0.9 }}
                  className="mt-12 pt-8 border-t border-white/[0.06]"
                >
                  <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-3 font-light">
                    {t("microReading.atlasCta.eyebrow")}
                  </p>
                  <p className="text-[#9a9a9a] text-sm leading-[1.8] mb-6 max-w-md font-light">
                    {t("microReading.atlasCta.description")}
                  </p>
                  {atlasPattern ? (
                    <Link
                      href={`/patterns/atlas/${atlasPattern.slug}`}
                      className="inline-flex items-baseline gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500 group"
                    >
                      <span>{t("microReading.atlasCta.link")}</span>
                      <span className="font-serif italic normal-case tracking-normal text-base text-[#cfcabf] group-hover:text-[#c9a96e] transition-colors">
                        {atlasPattern.name}
                      </span>
                      <span className="text-[#c9a96e]" aria-hidden>→</span>
                    </Link>
                  ) : (
                    <>
                      <p className="text-[#7a7a7a] text-[12px] italic mb-4 font-light max-w-md">
                        {t("microReading.atlasCta.fallbackNote")}
                      </p>
                      <Link
                        href="/patterns/atlas"
                        className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500"
                      >
                        {t("microReading.atlasCta.hubLink")}
                        <span aria-hidden>→</span>
                      </Link>
                    </>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={resultRevealed ? { opacity: 1 } : {}}
                  transition={{ delay: 0.9, duration: 1 }}
                  className="mt-12 pt-8 border-t border-white/[0.06]"
                >
                  <p className="text-[#7a7a7a] text-[12px] italic mb-6 font-light">
                    {t("microReading.fragmentNote")}
                  </p>
                  <a
                    href="#booking"
                    className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] transition-colors duration-500"
                  >
                    {t("microReading.bookFullDecode")}
                    <span className="text-[#c9a96e]">→</span>
                  </a>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons — static */}
          {step > 0 && step < 4 && (
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/[0.06]">
              <button
                onClick={() => setStep(step - 1)}
                className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] transition-colors cursor-pointer font-light"
              >
                ← {t("microReading.back")}
              </button>
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer hover:text-[#f0eee9] transition-colors"
              >
                {t("microReading.continueBtn")} →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
