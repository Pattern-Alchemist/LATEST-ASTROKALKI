"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, RotateCcw, Share2, ArrowRight } from "lucide-react";
import {
  ATLAS_PATTERNS,
  type AtlasPattern,
} from "@/lib/content/patterns/atlas";
import { getAtlasMeta } from "@/lib/content/patterns/micro-to-atlas";
import { SERVICE_BY_SLUG } from "@/lib/content/services";
import PatternPortrait from "@/components/astrokalki/pattern-portrait";

/**
 * PatternQuiz — the interactive "Find your pattern" quiz.
 *
 * Flow:
 *   1. Seven questions, each with four options. Each option maps to one of
 *      the ten Atlas patterns (options are designed so every pattern is
 *      reachable from ≥2 questions).
 *   2. After the last answer, the pattern with the most accumulated points
 *      wins. Ties are broken by Atlas order (deterministic).
 *   3. Result card reveals: pattern name (Playfair), tagline (italic
 *      Playfair), "Why this pattern matches you" synthesis, "What you said"
 *      list of the user's answers that pointed here, and CTAs to the full
 *      pattern page + the related service. "Retake quiz" resets state.
 *      "Share result" uses navigator.share when available, falling back to
 *      clipboard copy with a transient confirmation.
 *
 * Design system: bg #050505, gold #c9a96e. Question text in Playfair, large.
 * Answer options as borderless cards with a bottom underline, gold on
 * selected/hover. Step indicator in mono. NO blue/indigo.
 *
 * Server-safe: this is a client component. The quiz logic (question pool,
 * scoring, synthesis copy) lives in module scope so it can be unit-tested
 * without rendering.
 */

const CINZEL = { fontFamily: "var(--font-cinzel)" } as const;

// ─────────────────────────────────────────────────────────────────────────
// Question pool
// ─────────────────────────────────────────────────────────────────────────

interface QuizOption {
  /** Atlas slug this option scores for. */
  pattern: string;
  text: string;
}

interface QuizQuestion {
  id: number;
  /** Short label shown above the question, e.g. "Conflict". */
  theme: string;
  prompt: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    theme: "Conflict",
    prompt: "When conflict arises in a close relationship, you tend to…",
    options: [
      {
        pattern: "the-rescuer",
        text: "Step in to fix it — even when the conflict isn't yours to fix.",
      },
      {
        pattern: "the-avoider",
        text: "Withdraw emotionally, sometimes physically. Wait for it to pass.",
      },
      {
        pattern: "the-self-sabotage",
        text: "Pick a fight you don't really want, then use it as the reason to leave.",
      },
      {
        pattern: "the-chaser",
        text: "Pursue the other person harder — call, text, push for resolution — even when they pull away.",
      },
    ],
  },
  {
    id: 2,
    theme: "Inner weather",
    prompt: "Your recurring emotional state, the one underneath the surface, is…",
    options: [
      {
        pattern: "the-invisible-child",
        text: "A low-grade flatness — like feeling nothing very strongly, ever.",
      },
      {
        pattern: "the-abandonment",
        text: "Anxiety — about being left, about losing people, about the next departure.",
      },
      {
        pattern: "the-emotional-caretaker",
        text: "Guilt — for not doing enough, not being enough, not holding everyone well enough.",
      },
      {
        pattern: "the-performer",
        text: "Tension — you can never fully exhale, never fully arrive, never stop producing.",
      },
    ],
  },
  {
    id: 3,
    theme: "Feedback",
    prompt: "The feedback you hear most often, from people who know you well, is…",
    options: [
      {
        pattern: "the-hyper-independent",
        text: "\u201CYou're so strong. So independent. You always have it together.\u201D",
      },
      {
        pattern: "the-rescuer",
        text: "\u201CYou always seem to end up with someone who needs you.\u201D",
      },
      {
        pattern: "the-invisible-child",
        text: "\u201CYou're so quiet — I forget you're here sometimes.\u201D",
      },
      {
        pattern: "the-avoider",
        text: "\u201CI never quite know what you're really feeling.\u201D",
      },
    ],
  },
  {
    id: 4,
    theme: "Stress response",
    prompt: "In stressful moments, your default response is to…",
    options: [
      {
        pattern: "the-performer",
        text: "Work harder. Produce more. Push through. Stopping feels like dying.",
      },
      {
        pattern: "the-emotional-caretaker",
        text: "Hold everyone else's feelings — and forget you have any of your own.",
      },
      {
        pattern: "the-hyper-independent",
        text: "Take care of it alone. Asking for help isn't a real option.",
      },
      {
        pattern: "the-self-sabotage",
        text: "Do something that makes it worse — pick a fight, quit, binge, disappear.",
      },
    ],
  },
  {
    id: 5,
    theme: "History",
    prompt: "The pattern you recognise most clearly in your history is…",
    options: [
      {
        pattern: "the-chaser",
        text: "Falling for people who are leaving, and losing interest in people who stay.",
      },
      {
        pattern: "the-abandonment",
        text: "Leaving relationships preemptively — or clinging long past the point of dignity.",
      },
      {
        pattern: "the-outsider",
        text: "Feeling like you don't belong — even in your own family, your own friend group.",
      },
      {
        pattern: "the-emotional-caretaker",
        text: "Being the listener, the supporter, the one no one thinks to listen to.",
      },
    ],
  },
  {
    id: 6,
    theme: "Receiving",
    prompt: "When something good finally happens to you, you…",
    options: [
      {
        pattern: "the-self-sabotage",
        text: "Feel restless, suspicious, or like you need to do something to ruin it.",
      },
      {
        pattern: "the-performer",
        text: "Can't enjoy it — you're already thinking about the next thing to produce.",
      },
      {
        pattern: "the-invisible-child",
        text: "Minimise it, deflect, or shrug it off. It doesn't quite land.",
      },
      {
        pattern: "the-abandonment",
        text: "Worry about when the other shoe will drop, who will leave, what it will cost.",
      },
    ],
  },
  {
    id: 7,
    theme: "The unsaid",
    prompt: "In your closest relationships, the thing you cannot say is…",
    options: [
      {
        pattern: "the-hyper-independent",
        text: "\u201CI need you.\u201D",
      },
      {
        pattern: "the-emotional-caretaker",
        text: "\u201CI'm not okay.\u201D",
      },
      {
        pattern: "the-outsider",
        text: "\u201CI don't belong here.\u201D",
      },
      {
        pattern: "the-invisible-child",
        text: "\u201CI want to be seen.\u201D",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Per-pattern synthesis — written in second person, 2-3 sentences.
// Derived from the clinical material in atlas.ts (conciseAnswer + tagline).
// ─────────────────────────────────────────────────────────────────────────

const SYNTHESIS: Record<string, string> = {
  "the-rescuer":
    "Your answers cluster around a single, familiar reflex: the moment someone near you is in pain, your nervous system treats their pain as your problem to solve. This is not generosity — it is a survival strategy installed when love first became synonymous with being needed. The pattern runs until you can tolerate watching someone you love struggle without intervening, and finally ask the harder question: who am I when no one needs me?",
  "the-abandonment":
    "Your answers point to a nervous system that learned, early, that love is unreliable and that closeness ends in pain. The reflex runs in two directions — sometimes you leave first, sometimes you cling too long — but it is the same wound underneath. The pattern is not really about the partner in front of you; it is about an old loss being re-triggered, and the adult body reverting to the survival strategy it learned when the original abandonment happened.",
  "the-performer":
    "Your answers describe someone who learned, very early, that love was a transaction: I produce, therefore I am seen; I stop, therefore I disappear. The drive that looks like ambition from outside is actually an attachment strategy running underneath. The pattern continues until the moment you are forced to stop — by burnout, by illness, by the audience thinning — and finally meet the question you have been running from: who am I when nothing is being produced?",
  "the-invisible-child":
    "Your answers describe someone who learned, before they had words for it, that the safest way to exist was to take up as little space as possible. The disappearing has become so habitual that you no longer notice you are doing it; you simply experience yourself as quiet, as shy, as not really one for the spotlight. The pattern ends not when you become loud, but when you allow yourself to take up space without apology — to voice the need, the opinion, the longing you have been swallowing for years.",
  "the-emotional-caretaker":
    "Your answers describe someone who became the listener, the holder, the one everyone comes to — while their own emotional life went unattended. You can describe other people's inner states with great precision; you struggle to describe your own. The pattern runs until the backlog of unmet feeling finally catches up with you, and you allow someone to hold you instead of always being the one who holds.",
  "the-self-sabotage":
    "Your answers point to a pattern that does not feel like self-destruction from inside — it feels like clarity, caution, or self-respect in the moment. That is exactly what makes it so hard to see. The sabotage is the acting-out of a nervous-system conviction: that good things do not last, and that the only safe move is to control the moment of destruction yourself. The pattern ends when you can finally tolerate the anxiety of receiving what you actually want, without tearing it down.",
  "the-chaser":
    "Your answers describe someone who does not fall in love with people — they fall in love with the chase. The intensity you feel is real, but it is the intensity of pursuit, not of connection; the moment someone becomes truly available, the charge collapses. Underneath is a nervous system that learned love must be pursued and that being chosen, fully, is dangerous. The pattern runs until you can tolerate receiving love without needing to escape it.",
  "the-avoider":
    "Your answers describe someone who learned, early, that the safest response to intensity — conflict, need, intimacy — is to withdraw. The withdrawal is rarely dramatic; it is a quiet pulling-back, a wall going up, a decision made in the body before the mind catches up. The pattern is not a preference for solitude; it is a survival strategy that grew into a personality. It ends when you can stay in the room — physically, emotionally — when every cell wants to leave.",
  "the-outsider":
    "Your answers point to a pattern installed by being the new one, the different one, the one who never quite fit — often across childhoods, cultures, or family systems. Belonging, for you, has always been conditional and provisional, and the nervous system learned to expect rejection before it arrived. The pattern is not a temperament; it is a strategy that protected you when belonging was genuinely unavailable. It ends when you stop proving your outsider status and let yourself belong somewhere, imperfectly.",
  "the-hyper-independent":
    "Your answers describe someone who learned, usually through early betrayal or absence, that needing others is unsafe — that the only reliable person is yourself. The independence looks like strength from outside, and is praised for it, which makes the pattern harder to see. Underneath is a nervous system that read every early dependence as a setup for betrayal. The pattern ends when you can ask for help and survive the vulnerability of receiving it.",
};

// ─────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────

interface QuizResult {
  /** Atlas slug of the winning pattern. */
  slug: string;
  /** The resolved AtlasPattern object (always present — winner is always a real slug). */
  pattern: AtlasPattern;
  /** Pattern slug → number of answers that pointed to it. */
  scores: Record<string, number>;
  /** The user's selected option per question — keyed by question id. */
  answers: Record<number, number>;
  /** Questions whose chosen option pointed to the winning pattern. */
  matchingQuestions: { question: QuizQuestion; option: QuizOption }[];
}

function calculateResult(answers: Record<number, number>): QuizResult {
  const scores: Record<string, number> = {};
  const matchingByPattern: Record<
    string,
    { question: QuizQuestion; option: QuizOption }[]
  > = {};

  for (const q of QUESTIONS) {
    const optIdx = answers[q.id];
    if (optIdx === undefined) continue;
    const opt = q.options[optIdx];
    if (!opt) continue;
    scores[opt.pattern] = (scores[opt.pattern] ?? 0) + 1;
    if (!matchingByPattern[opt.pattern]) matchingByPattern[opt.pattern] = [];
    matchingByPattern[opt.pattern].push({ question: q, option: opt });
  }

  // Sort by score desc, then by atlas order (deterministic tiebreak).
  const atlasOrder = new Map(ATLAS_PATTERNS.map((p, i) => [p.slug, i]));
  const sorted = Object.entries(scores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const ai = atlasOrder.get(a[0]) ?? 999;
    const bi = atlasOrder.get(b[0]) ?? 999;
    return ai - bi;
  });

  const winnerSlug = sorted[0]?.[0] ?? ATLAS_PATTERNS[0].slug;
  const winnerPattern =
    ATLAS_PATTERNS.find((p) => p.slug === winnerSlug) ?? ATLAS_PATTERNS[0];

  return {
    slug: winnerSlug,
    pattern: winnerPattern,
    scores,
    answers,
    matchingQuestions: matchingByPattern[winnerSlug] ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

type Phase = "questions" | "result";

export default function PatternQuiz() {
  const [phase, setPhase] = useState<Phase>("questions");
  const [current, setCurrent] = useState(0); // index into QUESTIONS
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [shared, setShared] = useState(false);

  const total = QUESTIONS.length;
  const question = QUESTIONS[current];
  const isLast = current === total - 1;

  const result = useMemo(
    () => (phase === "result" ? calculateResult(answers) : null),
    [phase, answers]
  );

  const selectOption = (optionIdx: number) => {
    const nextAnswers = { ...answers, [question.id]: optionIdx };
    setAnswers(nextAnswers);

    // Auto-advance after a short beat so the user sees their selection
    // highlighted before the next question slides in.
    window.setTimeout(() => {
      if (isLast) {
        setPhase("result");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setCurrent((c) => Math.min(c + 1, total - 1));
      }
    }, 280);
  };

  const retake = () => {
    setAnswers({});
    setCurrent(0);
    setPhase("questions");
    setShared(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (current === 0) return;
    setCurrent((c) => Math.max(0, c - 1));
  };

  const shareResult = async () => {
    if (!result) return;
    const url = `${window.location.origin}/patterns/atlas/${result.slug}`;
    const shareData = {
      title: `${result.pattern.name} — AstroKalki Pattern Atlas`,
      text: `${result.pattern.tagline}\n\nFind your pattern:`,
      url,
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 2400);
      }
    } catch {
      // User cancelled share, or clipboard failed. Silent.
    }
  };

  // ── Result phase ──
  if (phase === "result" && result) {
    return (
      <ResultCard
        result={result}
        onRetake={retake}
        onShare={shareResult}
        shared={shared}
      />
    );
  }

  // ── Questions phase ──
  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
      {/* Step indicator + progress */}
      <div className="mb-12 sm:mb-16">
        <div className="flex items-baseline justify-between mb-4">
          <span
            className="text-[11px] tracking-[0.3em] text-[#c9a96e]/60 font-mono"
            aria-current="step"
          >
            {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span
            className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]"
            style={CINZEL}
          >
            {question.theme}
          </span>
        </div>
        {/* Progress rule */}
        <div className="relative h-px bg-white/[0.06]">
          <motion.div
            className="absolute inset-y-0 left-0 bg-[#c9a96e]/60"
            initial={false}
            animate={{ width: `${((current + 1) / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {/* Question */}
          <h2 className="text-[#f0eee9] text-2xl sm:text-3xl md:text-4xl font-serif font-light tracking-[-0.015em] leading-[1.2] mb-12 sm:mb-16">
            {question.prompt}
          </h2>

          {/* Options — borderless cards with bottom underline, gold on selected/hover */}
          <div role="group" aria-label={question.prompt}>
            {question.options.map((opt, idx) => {
              const selected = answers[question.id] === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectOption(idx)}
                  aria-pressed={selected}
                  aria-label={`Option ${idx + 1}: ${opt.text}`}
                  className={`group w-full text-left py-6 sm:py-7 border-b transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-inset ${
                    selected
                      ? "border-[#c9a96e] bg-[#c9a96e]/[0.025]"
                      : "border-white/[0.06] hover:border-[#c9a96e]/40 hover:bg-white/[0.01]"
                  } -mx-4 px-4 sm:-mx-6 sm:px-6`}
                >
                  <div className="flex items-baseline gap-5">
                    <span
                      className={`text-[10px] tracking-[0.25em] font-mono shrink-0 pt-1 transition-colors ${
                        selected ? "text-[#c9a96e]" : "text-[#3a3a3a] group-hover:text-[#7a7a7a]"
                      }`}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-base sm:text-lg font-light leading-[1.55] transition-colors ${
                        selected
                          ? "text-[#c9a96e]"
                          : "text-[#cfcabf] group-hover:text-[#f0eee9]"
                      }`}
                    >
                      {opt.text}
                    </span>
                    {selected && (
                      <Check
                        className="h-4 w-4 text-[#c9a96e] shrink-0 ml-auto pt-1"
                        aria-hidden
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Back / progress controls */}
      <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={goBack}
          disabled={current === 0}
          className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#f0eee9] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer font-light"
          style={CINZEL}
        >
          ← Previous
        </button>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#3a3a3a]">
          {Object.keys(answers).length} of {total} answered
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Result card
// ─────────────────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onRetake,
  onShare,
  shared,
}: {
  result: QuizResult;
  onRetake: () => void;
  onShare: () => void;
  shared: boolean;
}) {
  const { pattern, slug, scores, matchingQuestions } = result;
  const meta = getAtlasMeta(slug);
  const serviceSlug = pattern.relatedService;
  const service = serviceSlug ? SERVICE_BY_SLUG[serviceSlug] : undefined;
  const synthesis = SYNTHESIS[slug] ?? pattern.conciseAnswer;
  const winnerScore = scores[slug] ?? 0;
  const totalAnswered = Object.values(scores).reduce((a, b) => a + b, 0);

  // Email capture for the PatternPortrait CTA. The quiz itself doesn't
  // require an email — but portrait generation does (we persist the
  // portrait keyed by email so it shows up in the member portal + the
  // inline gallery on a return visit). The input is optional: only when
  // the user types a valid email does the portrait UI render.
  const [portraitEmail, setPortraitEmail] = useState("");
  const emailValid =
    portraitEmail.length > 4 && portraitEmail.includes("@") && portraitEmail.includes(".");

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Eyebrow */}
          <p
            className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-8 font-light"
            style={CINZEL}
          >
            Your pattern
          </p>

          {/* Pattern name — Playfair, large */}
          <h2 className="text-[#f0eee9] text-4xl sm:text-5xl md:text-6xl font-serif font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {pattern.name}
          </h2>

          {/* Tagline — italic Playfair */}
          <p className="text-[#cfcabf] text-xl sm:text-2xl font-serif italic font-light leading-[1.4] mb-10 max-w-2xl">
            {pattern.tagline}
          </p>

          {/* Cluster + intensity meta line */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] tracking-[0.25em] uppercase text-[#5a5a5a] mb-12 pb-8 border-b border-white/[0.06]">
            <span style={CINZEL} className="text-[#c9a96e]/80">
              {meta.cluster}
            </span>
            <span className="text-[#3a3a3a]">·</span>
            <IntensityDots intensity={meta.intensity} />
            <span className="text-[#3a3a3a]">·</span>
            <span className="font-mono text-[10px]">
              {winnerScore} of {totalAnswered} answers
            </span>
            <span className="text-[#3a3a3a]">·</span>
            <span className="font-mono text-[10px]">
              {pattern.readTime} min read
            </span>
          </div>

          {/* Why this pattern matches you */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mb-12"
          >
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light"
              style={CINZEL}
            >
              Why this pattern matches you
            </p>
            <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light max-w-2xl">
              {synthesis}
            </p>
          </motion.div>

          {/* What you said — the answers that pointed here */}
          {matchingQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="mb-12"
            >
              <p
                className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-4 font-light"
                style={CINZEL}
              >
                What you said
              </p>
              <ul className="space-y-0">
                {matchingQuestions.map(({ question, option }, idx) => (
                  <li
                    key={question.id}
                    className={`grid grid-cols-12 gap-4 py-4 border-b border-white/[0.04] ${
                      idx === matchingQuestions.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <span
                      className="col-span-3 sm:col-span-2 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] pt-1"
                      style={CINZEL}
                    >
                      {question.theme}
                    </span>
                    <span className="col-span-9 sm:col-span-10 text-[#cfcabf] text-sm sm:text-[15px] font-light leading-[1.65] italic">
                      &ldquo;{option.text}&rdquo;
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* CTAs — full pattern page + related service */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
          >
            <Link
              href={`/patterns/atlas/${slug}`}
              className="group block p-6 border border-white/[0.06] hover:border-[#c9a96e]/40 hover:bg-white/[0.01] transition-colors duration-300"
            >
              <p
                className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-3"
                style={CINZEL}
              >
                Read the full pattern
              </p>
              <p className="text-[#f0eee9] text-lg font-serif font-light leading-tight mb-2 group-hover:text-[#c9a96e] transition-colors">
                {pattern.name}
              </p>
              <p className="text-[#9a9a9a] text-[13px] font-light leading-[1.7] mb-4">
                The full nine-field structure — symptoms, origin, relationship
                and career impact, shadow side, and what it&apos;s mistaken for.
              </p>
              <span
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e]"
                style={CINZEL}
              >
                Open pattern page
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>

            {service && (
              <Link
                href={`/services/${serviceSlug}`}
                className="group block p-6 border border-white/[0.06] hover:border-[#c9a96e]/40 hover:bg-white/[0.01] transition-colors duration-300"
              >
                <p
                  className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-3"
                  style={CINZEL}
                >
                  The related service
                </p>
                <p className="text-[#f0eee9] text-lg font-serif font-light leading-tight mb-2 group-hover:text-[#c9a96e] transition-colors">
                  {service.title}
                </p>
                <p className="text-[#9a9a9a] text-[13px] font-light leading-[1.7] mb-4">
                  A structured astrology session that works directly with this
                  pattern&apos;s birth-chart signature.
                </p>
                <span
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#c9a96e]"
                  style={CINZEL}
                >
                  Explore the service
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            )}
          </motion.div>

          {/* Retake + Share */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="flex flex-wrap items-center gap-6 pt-8 border-t border-white/[0.04]"
          >
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors cursor-pointer"
              style={CINZEL}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Retake quiz
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors cursor-pointer"
              style={CINZEL}
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {shared ? "Link copied" : "Share result"}
            </button>
          </motion.div>

          {/* ─── Pattern portrait CTA ───────────────────────────────────────
              An AI-generated visual of the user's pattern. The quiz doesn't
              collect an email natively, so we capture one inline here — the
              portrait is keyed by email (so it surfaces in /account + on
              return visits). Once a valid email is entered, the
              PatternPortrait component renders with the full generate /
              download / share / regenerate flow. */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mt-20 pt-10 border-t border-white/[0.04]"
          >
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-3 font-light"
              style={CINZEL}
            >
              A visual of your pattern
            </p>
            <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light mb-6 max-w-xl">
              Receive a one-of-a-kind AI-generated image — abstract, cinematic,
              keyed to the emotional shape of <span className="text-[#cfcabf] italic">{pattern.name}</span>. No two are alike.
            </p>

            {/* Email gate — minimal input, same visual language as the
                micro-reading email field. Once valid, the portrait UI mounts. */}
            {!emailValid ? (
              <div className="max-w-md">
                <label
                  htmlFor="quiz-portrait-email"
                  className="sr-only"
                >
                  Your email — to generate and save your pattern portrait
                </label>
                <div className="flex gap-3 border-b border-white/[0.08] pb-3 focus-within:border-[#c9a96e]/60 transition-colors">
                  <input
                    id="quiz-portrait-email"
                    type="email"
                    value={portraitEmail}
                    onChange={(e) => setPortraitEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    aria-required="true"
                    className="flex-1 bg-transparent text-sm text-[#f0eee9] focus:outline-none placeholder:text-[#3a3a3a] font-light"
                  />
                </div>
                <p className="text-[10px] text-[#5a5a5a] mt-3 tracking-wide font-light">
                  We use your email to save the portrait to your account. No spam — unsubscribe anytime.
                </p>
              </div>
            ) : (
              <PatternPortrait pattern={slug} email={portraitEmail} />
            )}
          </motion.div>

          {/* Cross-links — the other patterns, in case the user wants to browse */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="mt-20 pt-10 border-t border-white/[0.04]"
          >
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light"
              style={CINZEL}
            >
              The other nine
            </p>
            <p className="text-[#9a9a9a] text-sm leading-[1.8] font-light mb-6 max-w-xl">
              Patterns often overlap. Browse the rest of the Atlas to see what
              else might be running underneath.
            </p>
            <Link
              href="/patterns/atlas"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-2 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
              style={CINZEL}
            >
              Browse the full Atlas
              <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// IntensityDots — duplicated from AtlasExplorer so this file has no client
// imports from a sibling client component (avoids bundling the whole
// explorer just for the dots).
// ─────────────────────────────────────────────────────────────────────────

function IntensityDots({
  intensity,
}: {
  intensity: "Low" | "Medium" | "High" | "Unknown";
}) {
  const level =
    intensity === "High" ? 3 : intensity === "Medium" ? 2 : intensity === "Low" ? 1 : 0;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Intensity: ${intensity}`}
      title={`Intensity: ${intensity}`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`block h-1.5 w-1.5 rounded-full ${
            i < level ? "bg-[#c9a96e]" : "bg-[#2a2a2a]"
          }`}
        />
      ))}
      <span className="ml-1 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] font-mono">
        {intensity}
      </span>
    </span>
  );
}
