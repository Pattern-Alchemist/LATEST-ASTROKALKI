/**
 * Voice ASR transcription → micro-reading option matcher.
 *
 * The micro-reading quiz has 3 voice-able steps:
 *   1. Birth month      — 12 options (English month names + Hindi month names)
 *   2. Emotional pattern — 6 options (abandonment / control / people-pleasing /
 *      emotional-numbness / overthinking / self-doubt)
 *   3. Relationship frustration — 6 options (same-fight / attracting-wrong /
 *      cant-leave / losing-myself / communication / trust)
 *
 * Strategy: for each option we maintain a list of keywords/phrases (English +
 * Hindi, including common short forms and misspellings). For a transcription
 * we score every option by:
 *   - exact substring match of any keyword (highest score)
 *   - Levenshtein-distance similarity for short keywords (≥ 0.6 ratio)
 * We then pick the highest-scoring option and report a 0–1 confidence.
 *
 * Confidence calibration (used by the UI):
 *   ≥ 0.85 — auto-select (we heard X clearly)
 *   0.55–0.85 — show transcription, suggest the match, user confirms
 *   < 0.55 — no useful match, just show the raw transcription
 */

/* -------------------------------------------------------------------------- */
/*  Levenshtein distance (small, dependency-free)                              */
/* -------------------------------------------------------------------------- */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Single-row DP
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Normalised similarity ratio (0 = no overlap, 1 = identical). */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/* -------------------------------------------------------------------------- */
/*  Tokenisation                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Lowercase + strip punctuation. Keeps Devanagari range intact.
 * Returns both the full normalized string AND the word-token list so callers
 * can do phrase-contains OR token-level matches.
 */
function normalize(text: string): { lower: string; tokens: string[] } {
  const lower = text
    .toLowerCase()
    // Replace common punctuation with spaces, keep letters/numbers/Devanagari
    .replace(/[.,!?;:"'`()\[\]{}\-—–_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = lower.split(" ").filter((t) => t.length > 0);
  return { lower, tokens };
}

/* -------------------------------------------------------------------------- */
/*  Match engine                                                              */
/* -------------------------------------------------------------------------- */

interface OptionDef {
  /** Canonical value returned to the client (month name / pattern id / frustration id). */
  value: string;
  /** Keywords/phrases that, if present in the transcription, indicate this option. */
  keywords: string[];
}

interface MatchResult {
  value: string;
  confidence: number;
}

/**
 * Score a single option against a normalized transcription.
 * Returns a 0–1 confidence.
 *
 * Scoring rules (in priority order):
 *   1. Exact full-phrase match of a multi-word keyword → 1.0
 *   2. Token-level exact match of a single-word keyword → 0.95
 *   3. Token-level fuzzy match (similarity ≥ 0.75) of a single-word keyword
 *      → that similarity ratio, scaled to 0.55–0.9
 *   4. Substring containment of keyword in transcription → 0.7
 *
 * The highest score across all keywords wins.
 */
function scoreOption(option: OptionDef, lower: string, tokens: string[]): number {
  let best = 0;
  for (const kw of option.keywords) {
    const kwLower = kw.toLowerCase().trim();
    if (!kwLower) continue;

    // Multi-word keyword → phrase match
    if (kwLower.includes(" ")) {
      if (lower.includes(kwLower)) {
        best = Math.max(best, 1.0);
        continue;
      }
      // Fuzzy phrase match: compare on token overlap
      const kwTokens = kwLower.split(" ").filter((t) => t.length > 0);
      const overlap = kwTokens.filter((t) => tokens.includes(t)).length;
      if (kwTokens.length > 0) {
        const ratio = overlap / kwTokens.length;
        if (ratio >= 0.75) {
          best = Math.max(best, 0.6 + ratio * 0.3); // 0.85–0.9
        }
      }
      continue;
    }

    // Single-word keyword
    // 1. Exact token match
    if (tokens.includes(kwLower)) {
      best = Math.max(best, 0.95);
      continue;
    }
    // 2. Substring containment (handles plurals / suffixed forms)
    if (lower.includes(kwLower)) {
      best = Math.max(best, 0.7);
      continue;
    }
    // 3. Fuzzy token match — but only for keywords of length ≥ 4 (avoid
    //    false positives on tiny words like "may")
    if (kwLower.length >= 4) {
      let bestSim = 0;
      for (const tok of tokens) {
        if (Math.abs(tok.length - kwLower.length) > 3) continue;
        const sim = similarity(tok, kwLower);
        if (sim > bestSim) bestSim = sim;
      }
      if (bestSim >= 0.75) {
        // scale 0.75 → 0.55, 1.0 → 0.85
        const scaled = 0.55 + (bestSim - 0.75) * (0.3 / 0.25);
        best = Math.max(best, scaled);
      }
    }
  }
  return best;
}

/**
 * Match a transcription against a list of options. Returns the best option
 * (with its confidence), or null if no option scored above the floor.
 *
 * The floor is 0.5 — below that, we don't trust any match and let the UI
 * show the raw transcription for manual selection.
 */
function matchOptions(
  transcription: string,
  options: OptionDef[]
): MatchResult | null {
  if (!transcription || transcription.trim().length === 0) return null;
  const { lower, tokens } = normalize(transcription);
  if (tokens.length === 0) return null;

  let best: { value: string; confidence: number } | null = null;
  for (const opt of options) {
    const score = scoreOption(opt, lower, tokens);
    if (score > 0 && (!best || score > best.confidence)) {
      best = { value: opt.value, confidence: score };
    }
  }

  if (!best || best.confidence < 0.5) return null;
  // Round to 2 decimals for client display
  return {
    value: best.value,
    confidence: Math.round(best.confidence * 100) / 100,
  };
}

/* -------------------------------------------------------------------------- */
/*  Option tables                                                            */
/* -------------------------------------------------------------------------- */

const MONTH_OPTIONS: OptionDef[] = [
  {
    value: "January",
    keywords: ["january", "jan", "जनवरी", "जनवरि"],
  },
  {
    value: "February",
    keywords: ["february", "feb", "फ़रवरी", "फरवरी", "फरवरि"],
  },
  {
    value: "March",
    keywords: ["march", "mar", "मार्च"],
  },
  {
    value: "April",
    keywords: ["april", "apr", "अप्रैल", "अप्रिल"],
  },
  {
    value: "May",
    keywords: ["may", "मई"],
  },
  {
    value: "June",
    keywords: ["june", "jun", "जून"],
  },
  {
    value: "July",
    keywords: ["july", "jul", "जुलाई", "जुलाई", "जुलाई"],
  },
  {
    value: "August",
    keywords: ["august", "aug", "अगस्त", "अगस्त", "अगस्त"],
  },
  {
    value: "September",
    keywords: ["september", "sep", "sept", "सितंबर", "सितम्बर"],
  },
  {
    value: "October",
    keywords: ["october", "oct", "अक्टूबर", "अक्टूबर", "अक्टूबर"],
  },
  {
    value: "November",
    keywords: ["november", "nov", "नवंबर", "नवम्बर"],
  },
  {
    value: "December",
    keywords: ["december", "dec", "दिसंबर", "दिसम्बर"],
  },
];

const PATTERN_OPTIONS: OptionDef[] = [
  {
    value: "abandonment",
    keywords: [
      "abandonment", "abandon", "abandoned", "leaving", "left",
      "fear of abandonment",
      "छोड़े", "छोड़", "छोड़ना", "छोड़े जाने", "अकेला", "अकेले",
    ],
  },
  {
    value: "control",
    keywords: [
      "control", "controlling", "need for control",
      "कंट्रोल", "नियंत्रण", "नियंत्रित",
    ],
  },
  {
    value: "people-pleasing",
    keywords: [
      "people-pleasing", "people pleasing", "pleaser", "pleasing",
      "keeping everyone happy", "people pleaser",
      "सबको खुश", "खुश रखना", "खुश करना",
    ],
  },
  {
    value: "emotional-numbness",
    keywords: [
      "numbness", "numb", "emotional numbness", "frozen", "freeze", "deep freeze",
      "महसूस न", "महसूस नहीं", "सुन्न", "सुनन",
    ],
  },
  {
    value: "overthinking",
    keywords: [
      "overthinking", "overthink", "over thinking", "spiraling", "spiral", "labyrinth",
      "सोचते रह", "सोच", "ज़्यादा सोच", "ज्यादा सोच",
    ],
  },
  {
    value: "self-doubt",
    keywords: [
      "self-doubt", "self doubt", "doubt", "doubting", "chronic doubt", "erosion",
      "शक", "खुद पर शक", "संदेह", "खुद पर संदेह",
    ],
  },
];

const FRUSTRATION_OPTIONS: OptionDef[] = [
  {
    value: "same-fight",
    keywords: [
      "same fight", "same argument", "same conflict", "repeating fight", "fight on repeat",
      "वही झगड़ा", "झगड़ा", "झगड़े", "बार-बार झगड़ा",
    ],
  },
  {
    value: "attracting-wrong",
    keywords: [
      "attracting wrong", "wrong type", "wrong people", "wrong kind",
      "wrong partners", "attracting the wrong",
      "गलत किस्म", "गलत लोग", "गलत लोगों",
    ],
  },
  {
    value: "cant-leave",
    keywords: [
      "can't leave", "cant leave", "cannot leave", "unable to leave", "stuck", "can't get out",
      "न छोड़ पाना", "छोड़ नहीं", "छोड़ न", "नहीं छोड़ पाते",
    ],
  },
  {
    value: "losing-myself",
    keywords: [
      "losing myself", "lose myself", "lost myself", "losing myself in",
      "खुद को खो", "खो देना", "खो जाना",
    ],
  },
  {
    value: "communication",
    keywords: [
      "communication", "understood", "never understood", "truly understood",
      "feeling understood", "misunderstood", "being misunderstood",
      "समझे न", "समझ नहीं", "समझा न", "न समझा",
    ],
  },
  {
    value: "trust",
    keywords: [
      "trust", "trusting wrong", "wrong people trust", "trusting the wrong",
      "भरोसा", "गलत लोगों पर भरोसा", "गलत पर भरोसा",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function matchBirthMonth(
  transcription: string
): { month: string; confidence: number } | null {
  const r = matchOptions(transcription, MONTH_OPTIONS);
  if (!r) return null;
  return { month: r.value, confidence: r.confidence };
}

export function matchEmotionalPattern(
  transcription: string
): { pattern: string; confidence: number } | null {
  const r = matchOptions(transcription, PATTERN_OPTIONS);
  if (!r) return null;
  return { pattern: r.value, confidence: r.confidence };
}

export function matchFrustration(
  transcription: string
): { frustration: string; confidence: number } | null {
  const r = matchOptions(transcription, FRUSTRATION_OPTIONS);
  if (!r) return null;
  return { frustration: r.value, confidence: r.confidence };
}

/**
 * Dispatch helper — used by the API route so it doesn't have to know which
 * matcher to call for which step.
 */
export function matchForStep(
  step: number,
  transcription: string
):
  | { matchedValue: string; confidence: number }
  | null {
  if (step === 1) {
    const r = matchBirthMonth(transcription);
    return r ? { matchedValue: r.month, confidence: r.confidence } : null;
  }
  if (step === 2) {
    const r = matchEmotionalPattern(transcription);
    return r ? { matchedValue: r.pattern, confidence: r.confidence } : null;
  }
  if (step === 3) {
    const r = matchFrustration(transcription);
    return r ? { matchedValue: r.frustration, confidence: r.confidence } : null;
  }
  return null;
}
