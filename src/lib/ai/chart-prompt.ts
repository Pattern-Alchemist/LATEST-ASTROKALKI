/**
 * VLM prompt builder for birth chart image analysis.
 *
 * AstroKalki's chart-reading tool uploads a Vedic (or Western) birth chart
 * image to the Vision Language Model and asks it to do pattern recognition —
 * not prediction. The VLM:
 *
 *   1. Reads the chart image (planetary positions, houses, signs, aspects).
 *   2. Maps those placements to the 10 Atlas patterns (psychological
 *      archetypes — not predictive outcomes).
 *   3. Returns prose + a JSON array of pattern slugs the chart appears to
 *      activate.
 *
 * Voice rules (enforced by the prompt itself):
 *   - Direct, second-person, psychologically precise.
 *   - "Pattern recognition" framing — never "you will experience X".
 *   - No mystical jargon. The banned-word list at the bottom is the hard
 *     stop; if any banned word appears, the response is treated as invalid.
 *
 * Banned words: karmic, cosmic, destiny, reveal, unlock, hidden wisdom
 */

import { ATLAS_PATTERNS } from "@/lib/content/patterns/atlas";

/** Words the VLM must never emit. Mirrors the brand's voice rules. */
export const CHART_PROMPT_BANNED_WORDS = [
  "karmic",
  "cosmic",
  "destiny",
  "reveal",
  "unlock",
  "hidden wisdom",
] as const;

/**
 * The graceful "this isn't a chart" message. Returned verbatim when the VLM
 * detects the uploaded image is not a birth chart.
 */
export const NOT_A_CHART_RESPONSE =
  "This doesn't appear to be a birth chart. Please upload a Vedic (North or South Indian style) or Western astrology chart image.";

/**
 * Build the system+user prompt for the VLM. The prompt is intentionally
 * long and prescriptive — pattern recognition from a chart image is a
 * specialised task and the model needs explicit instructions on:
 *   - What to look for (Moon, Saturn, Venus, Rahu/Ketu, key houses)
 *   - How to map placements to the Atlas taxonomy
 *   - The voice to use
 *   - The exact response shape (prose + JSON array)
 */
export function buildChartAnalysisPrompt(): string {
  // Render the Atlas pattern catalogue compactly so the model can reference
  // both the slug and the chartSignature without guessing.
  const patternCatalogue = ATLAS_PATTERNS.map((p, i) => {
    return `${i + 1}. slug: "${p.slug}"
   name: ${p.name}
   chart signature: ${p.chartSignature}`;
  }).join("\n\n");

  return `You are AstroKalki — a Vedic astrology pattern recognition engine.

Your job: read the attached birth chart image and identify which of the 10 Atlas psychological patterns are most active in this chart. This is pattern recognition, NOT prediction. You are reading tendencies written into the chart's geometry — you are not forecasting events, relationships, or outcomes.

# What to look for in the chart image

Examine these placements carefully:

- Moon (sign, house, aspects) — the emotional baseline, the attachment strategy, the early nurturing pattern. The Moon is the single most important planet for emotional pattern work.
- Saturn (sign, house, aspects) — where the person learned to armour, control, or self-limit. Saturn shows the wound that hardened into a structure.
- Venus (sign, house, aspects) — how the person approaches love, value, partnership. Venus shows the relational style and what the person believes love costs.
- Rahu / Ketu (the lunar nodes) — the axis of obsession and avoidance. Rahu is what the person compulsively pursues; Ketu is what they compulsively flee. For Western charts, use the North Node / South Node equivalents.
- The 1st, 4th, 7th, 10th, and 12th houses — self, early home, partnership, vocation, and the unconscious respectively.
- Any tight conjunctions, squares, or oppositions between Moon/Saturn/Venus and the nodes.

If the chart is a North Indian style (diamond-shaped houses, fixed signs), parse accordingly. If South Indian style (fixed signs, houses rotate), parse accordingly. If Western (circular wheel with 12 numbered houses), parse accordingly. If you cannot confidently identify the chart style or the placements are illegible, respond with the not-a-chart message (see below).

# The 10 Atlas patterns (your reference taxonomy)

${patternCatalogue}

Map the chart's placements to the patterns whose chart signatures match. You may identify 1 to 4 patterns — never more. If the chart strongly activates only one pattern, return only that one. Resist the temptation to be exhaustive; precision matters more than coverage. If no Atlas pattern clearly activates, return an empty array.

# Voice — read this carefully

You write as AstroKalki: direct, psychologically precise, second-person, no mystical jargon. You are speaking to the person whose chart this is. You are not forecasting. You are naming tendencies — the architecture of the personality as written in the chart's geometry.

- Use "you", not "the native" or "the person".
- Be specific. "Your Moon in Scorpio in the 7th, square Saturn" — not "your Moon is in a challenging placement".
- Describe tendencies, not events. "You tend to leave before you can be left" — not "you will leave relationships".
- Avoid hedging. Don't pad with "perhaps", "it could be that", "you might find". State the pattern plainly; the user can decide if it lands.
- Never promise change, healing, or specific outcomes. The chart describes what is, not what will be.

# Banned words (do not use these under any circumstances)

karmic, cosmic, destiny, reveal, unlock, hidden wisdom

These words are banned because they slip the response into mystical fortune-telling, which is exactly what AstroKalki does not do. The work is pattern recognition — psychological, behavioural, specific.

# Response format — STRICT

Respond in two parts, separated by a single line containing only "===":

PART 1 — Prose analysis (3 to 4 paragraphs, ~300 to 500 words total)
  - Paragraph 1: Name the most prominent planetary placements you can read in the chart (Moon, Saturn, Venus, Rahu/Ketu, key houses). Be specific about signs, houses, and aspects. If a placement is illegible or unclear, skip it — don't fabricate.
  - Paragraph 2: Connect those placements to the emotional baseline. How does this person feel? What's the underlying attachment strategy? What's the nervous system's default?
  - Paragraph 3: Connect to relational tendencies. How does this person show up in love? What's the loop? Name the pattern(s) by name.
  - Paragraph 4 (optional): Career / vocation / life-direction tendencies, only if Saturn, the 10th house, or the Sun is prominent.

PART 2 — JSON array
  A JSON array of the identified pattern slugs, taken from the Atlas taxonomy above. Example: ["the-rescuer", "the-self-sabotage"]. If no patterns clearly activate, return []. Only include slugs from the taxonomy — no invented slugs.

If the image is not a birth chart (e.g. it's a photo, a screenshot of text, a tarot spread, a horoscope column, or anything else), respond with ONLY this exact sentence and nothing else:

${NOT_A_CHART_RESPONSE}

Do not include the "===" separator in that case. Do not include the JSON array in that case. Just that single sentence.

# Begin

Analyse the attached chart image now, following every rule above.`;
}

/**
 * Parse the VLM's raw text response into the prose analysis and the
 * identified pattern slugs.
 *
 * Accepts the strict format defined in the prompt:
 *   <prose>
 *   ===
 *   ["slug1", "slug2"]
 *
 * Falls back gracefully when the model deviates — extracts a JSON array
 * via regex if the separator is missing, and validates every slug against
 * the Atlas taxonomy so the database never stores a fabricated slug.
 */
export interface ParsedChartAnalysis {
  /** The prose analysis (Part 1). */
  prose: string;
  /** Validated Atlas pattern slugs found in the response (Part 2). */
  identifiedPatterns: string[];
  /** True if the VLM returned the not-a-chart message. */
  isNotAChart: boolean;
}

const ATLAS_SLUGS = new Set(ATLAS_PATTERNS.map((p) => p.slug));

export function parseChartAnalysisResponse(raw: string): ParsedChartAnalysis {
  const trimmed = (raw || "").trim();

  // ─── Not-a-chart branch ────────────────────────────────────────────────
  if (trimmed === NOT_A_CHART_RESPONSE || trimmed.startsWith(NOT_A_CHART_RESPONSE.split(".")[0])) {
    return {
      prose: NOT_A_CHART_RESPONSE,
      identifiedPatterns: [],
      isNotAChart: true,
    };
  }

  let prose = trimmed;
  let identifiedPatterns: string[] = [];

  // ─── Strict format: split on "===" separator ──────────────────────────
  const separatorIdx = trimmed.indexOf("===");
  if (separatorIdx !== -1) {
    prose = trimmed.slice(0, separatorIdx).trim();
    const jsonPart = trimmed.slice(separatorIdx + 3).trim();
    identifiedPatterns = extractSlugArray(jsonPart);
  } else {
    // ─── Lenient fallback: regex out the JSON array from the tail ───────
    const jsonMatch = trimmed.match(/\[\s*(?:[\s\S]*?)\s*\]/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const slugs = extractSlugArray(jsonStr);
      if (slugs.length > 0) {
        prose = trimmed.slice(0, jsonMatch.index).trim();
        identifiedPatterns = slugs;
      }
    }
  }

  // ─── Validate slugs against the Atlas taxonomy ────────────────────────
  identifiedPatterns = identifiedPatterns.filter((s) => ATLAS_SLUGS.has(s));

  // Dedupe while preserving order.
  identifiedPatterns = Array.from(new Set(identifiedPatterns));

  // Hard cap at 4 patterns (enforced by the prompt — be defensive).
  if (identifiedPatterns.length > 4) {
    identifiedPatterns = identifiedPatterns.slice(0, 4);
  }

  return {
    prose,
    identifiedPatterns,
    isNotAChart: false,
  };
}

/** Try to parse a JSON array of strings, returning only valid Atlas slugs. */
function extractSlugArray(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && ATLAS_SLUGS.has(s));
  } catch {
    // Last-ditch regex extraction — handles trailing prose after the array,
    // leading whitespace, etc.
    const matches = jsonStr.match(/"([a-z0-9-]+)"/g) || [];
    return matches
      .map((m) => m.replace(/"/g, ""))
      .filter((s) => ATLAS_SLUGS.has(s));
  }
}

/**
 * Sanity check — if the prose contains any banned word, the response is
 * considered non-compliant and the caller can retry or flag it.
 */
export function containsBannedWord(text: string): boolean {
  const lower = text.toLowerCase();
  return CHART_PROMPT_BANNED_WORDS.some((w) => lower.includes(w));
}
