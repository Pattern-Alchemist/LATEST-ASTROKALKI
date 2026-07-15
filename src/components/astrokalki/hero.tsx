"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useI18n } from "@/lib/i18n-context";
import { AvailabilityIndicator } from "@/components/astrokalki/availability-indicator";
import { AbVariant } from "@/components/astrokalki/ab-variant";

/* ── Tiny (16x10) dark cinematic LQIP — base64-encoded PNG.
 *   Matches the hero's #050505 base with a faint warm-amber undertone
 *   near the top (the mirror side). Pre-decoded so first paint shows
 *   a calm dark field instead of a blank box before the real image
 *   streams in via next/image. ── */
const HERO_BLUR_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAAH0lEQVR42mMUFWRlIAWw/PvHMKqBsAYGGmtgIlE9AwAoQA4zPSharQAAAABJRU5ErkJggg==";

/* ── Three-line cinematic headline. Extracted so the A/B test wrapper
 *   can swap in alternative copy without duplicating the animation
 *   classes / framer-motion variants. The visual structure (3 spans,
 *   staggered fade-up, gold italic third line) is identical across
 *   variants — only the copy changes. ── */
function Headline({
  show,
  line1,
  line2,
  line3,
}: {
  show: boolean;
  line1: string;
  line2: string;
  line3: string;
}) {
  return (
    <h1 className="text-[#f0eee9] text-[clamp(2.75rem,8vw,7rem)] leading-[0.98] tracking-[-0.025em]">
      <motion.span
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: show ? 1 : 0, y: show ? 0 : 28 }}
        transition={{ duration: 1.1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="block"
      >
        {line1}
      </motion.span>
      <motion.span
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: show ? 1 : 0, y: show ? 0 : 28 }}
        transition={{ duration: 1.1, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="block text-[#7a7a7a]"
      >
        {line2}
      </motion.span>
      <motion.span
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: show ? 1 : 0, y: show ? 0 : 28 }}
        transition={{ duration: 1.1, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="block text-[#c9a96e] italic font-light"
      >
        {line3}
      </motion.span>
    </h1>
  );
}

/* ─── FINAL HERO — typography-first. Movie-poster composition.
 *   One dominant image. One dominant headline. One CTA. Nothing else.
 *   The headline IS the visual. The image supports it, not the other way around. ─── */
export default function Hero() {
  const [showHeadline, setShowHeadline] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const hasAnimated = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { t } = useI18n();

  // Subtle scroll parallax — image drifts, text fades. Restrained.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.12]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.4, 0]);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const t1 = setTimeout(() => setShowHeadline(true), 400);
    const t2 = setTimeout(() => setShowSubtext(true), 1800);
    const t3 = setTimeout(() => setShowCTA(true), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[720px] w-full overflow-hidden bg-[#050505]"
    >
      {/* ── Layer 0: Dominant image — silhouette + fractured mirror ── */}
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/images/hero-fractured-mirror.png"
          alt="A dark silhouette facing a fractured mirror — the reflection shattered into multiple versions of the same self."
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={HERO_BLUR_PLACEHOLDER}
        />
      </motion.div>

      {/* ── Layer 1: Cinematic gradient — darken left third for typographic legibility ── */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/30" />

      {/* ── Layer 2: Headline + supporting text + single CTA ── */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-20 h-full flex items-center"
      >
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-2xl">
            {/* ── Dominant headline — three lines, one statement ──
             *    Wrapped in <AbVariant> for the "hero-headline" A/B test.
             *    Default (control) uses the canonical i18n copy. Variant
             *    "b" swaps line 2 from "Different Face." to "Same Story."
             *    — a hammer-rhythm variant that repeats the word "Same"
             *    across all three beats to test whether the emphatic
             *    repetition drives more scroll-throughs than the
             *    alternating same/different cadence. The visual
             *    structure (3 spans, staggered fade-up, gold italic
             *    third line) is identical across variants. */}
            <AbVariant
              experimentName="hero-headline"
              default={
                <Headline
                  show={showHeadline}
                  line1={t("hero.headline1")}
                  line2={t("hero.headline2")}
                  line3={t("hero.headline3")}
                />
              }
              variants={{
                b: (
                  <Headline
                    show={showHeadline}
                    line1="Same Pain."
                    line2="Same Story."
                    line3="Same Pattern."
                  />
                ),
              }}
            />

            {/* ── Supporting text — three short lines. Never longer. ── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: showSubtext ? 1 : 0, y: showSubtext ? 0 : 18 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="mt-12 sm:mt-16 max-w-md"
            >
              <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.9] font-light">
                {t("hero.subtext1")}
              </p>
              <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.9] font-light">
                {t("hero.subtext2")}
              </p>
              <p className="text-[#c9a96e]/80 text-sm sm:text-base leading-[1.9] font-light italic">
                {t("hero.subtext3")}
              </p>
            </motion.div>

            {/* ── Single CTA. The only one. ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: showCTA ? 1 : 0, y: showCTA ? 0 : 14 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mt-14 sm:mt-20"
            >
              <a
                href="#booking"
                aria-label={`${t("hero.cta1")} — book a session from ₹1,999`}
                className="inline-flex items-center gap-3 text-[11px] tracking-[0.35em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-4 focus-visible:ring-offset-[#050505]"
              >
                <span className="flex flex-col items-start leading-tight">
                  <span>{t("hero.cta1")}</span>
                  <span className="text-[8px] font-light text-[#9a9a9a] tracking-[0.2em] normal-case">
                    from ₹1,999 / 60 min
                  </span>
                </span>
                <span className="text-[#c9a96e]" aria-hidden="true">→</span>
              </a>

              {/* ── Tiny live-availability indicator. Subtle, never
                   distracting. Renders nothing until the socket
                   connects + a state arrives — so the hero is
                   unaffected if the mini-service is down. ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 3.4, ease: "easeOut" }}
                className="mt-8 min-h-[6px]"
              >
                <AvailabilityIndicator variant="badge" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
