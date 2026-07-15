/**
 * M8-b: Programmatic SEO prompt builder.
 *
 * Builds the LLM prompt used to generate a city×pattern landing page.
 * The output is an 800-1200 word markdown article, structured for AI
 * Overview citation + local search intent, in the AstroKalki voice.
 *
 * Voice rules (enforced by the prompt):
 *   - Direct second-person ("you"), no clinical jargon
 *   - Banned words: karmic, cosmic, destiny, reveal, unlock
 *   - Specific city context woven through (without clichés)
 *   - One clear CTA to book a session
 */

import type { AtlasPattern } from "@/lib/content/patterns/atlas";
import { CITIES, type City } from "@/lib/seo/cities";

const BANNED_WORDS = ["karmic", "cosmic", "destiny", "reveal", "unlock"];

/** Search query this page is meant to rank for. */
export function buildSearchQuery(pattern: AtlasPattern, city: City): string {
  // e.g. "rescuer pattern in relationships Mumbai"
  const shortName = pattern.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "").toLowerCase();
  return `${shortName} in relationships ${city.name}`;
}

/** Build the system-side instruction string (the assistant role message). */
export function buildProgrammaticSystemPrompt(): string {
  return [
    "You are the AstroKalki editorial system. You write long-form articles",
    "that decode psychological patterns through the birth chart, in the",
    "AstroKalki voice: direct, second-person ('you'), no jargon, no fluff,",
    "no clinical distance. You write like a sharp, kind friend who has done",
    "the work — not like a therapist, not like a guru.",
    "",
    "VOICE RULES (non-negotiable):",
    "- Direct second-person. Use 'you', never 'one', never 'we'.",
    "- No jargon: don't say 'attachment style', 'dysregulation', 'somatic',",
    "  'introject', 'schema'. Use plain English.",
    "- No spiritual bypass: the pattern is psychological, installed in",
    "  childhood. Do not frame it as a punishment, lesson, or gift.",
    "- Specific over abstract. Use one concrete image over five vague ones.",
    "- The city is a setting, not a stereotype. Mention it once or twice,",
    "  naturally. Do NOT make jokes about traffic, weather, or food.",
    "- No buzzwords. No 'unlock', 'reveal', 'journey', 'space' (as in",
    "  'hold space'), 'container', 'trauma-informed', 'embodiment'.",
    "",
    `BANNED WORDS (never use, in any form): ${BANNED_WORDS.join(", ")}.`,
    "",
    "STRUCTURE: H1, intro paragraph, three H2 sections, CTA paragraph.",
    "Length: 800-1200 words. Output as markdown only — no commentary, no",
    "metadata, no preamble. The first line must be the H1.",
  ].join("\n");
}

/**
 * Build the user-side prompt — the per-page brief.
 *
 * @param patternName e.g. "The Rescuer Pattern"
 * @param patternDescription A 1-2 sentence description of the pattern (use
 *   AtlasPattern.conciseAnswer or tagline).
 * @param city City name e.g. "Mumbai"
 * @param state Indian state e.g. "Maharashtra"
 */
export function buildProgrammaticPrompt(
  patternName: string,
  patternDescription: string,
  city: string,
  state: string
): string {
  return [
    `Write an article about "${patternName}" — a psychological pattern that AstroKalki decodes through the birth chart.`,
    "",
    `Pattern (for context, do not quote verbatim): ${patternDescription}`,
    "",
    `Target reader: someone living in ${city}, ${state}, India, who has started to notice this pattern running their relationships or emotional life. They are educated, skeptical, and tired of vague advice. They have probably read about attachment theory and found it cold. They want truth, not comfort.`,
    "",
    `Target search query this page should answer: "${patternName.replace(/^The\s+/i, "").toLowerCase()} in relationships ${city}". Write so that an AI search system could cite the page verbatim.`,
    "",
    "REQUIRED STRUCTURE (use these exact H1/H2 labels, in this order):",
    "",
    `# ${patternName} in ${city}`,
    "",
    "An opening paragraph (4-6 sentences) that names the pattern, names what it feels like inside, and mentions the city naturally — as the place the reader is living this, not as a punchline. End the paragraph on a sentence that says what the article will do.",
    "",
    `## The ${patternName.replace(/^The\s+/i, "")} in ${city}`,
    "",
    "A 200-300 word section on how the pattern actually shows up in the reader's daily life. Be concrete: name the situations (the relationship arc, the workplace loop, the friend dynamic). Mention the city once more, only if it fits naturally — e.g. 'the long commute home becomes the place you rehearse the conversation', 'the apartment in Bandra/Bandra West/Koramangala/etc that feels empty even when someone is in it'. Do not list neighbourhoods for the sake of listing them.",
    "",
    "## Signs you're in this pattern",
    "",
    "A 200-300 word section. Open with one sentence of framing, then a 5-7 item bulleted list (use markdown `- `). Each bullet is one specific, observable sign — not a vague feeling. After the list, one short closing paragraph (2-3 sentences) that names what's hard about seeing these signs in yourself.",
    "",
    "## What helps",
    "",
    "A 200-300 word section. Three things that genuinely help — not platitudes. Each as a short paragraph (3-4 sentences), not a bullet. Be honest about the limits of self-help: name that the pattern was installed before words, and that's why working with someone matters. Mention the birth chart once, briefly, as one of the tools AstroKalki uses to see the pattern's origin — not as magic, as architecture.",
    "",
    "## Book a session",
    "",
    "A short closing paragraph (3-4 sentences) that invites the reader to book a session with AstroKalki. Direct, no hype. End with a single line in italics: *Book a session with AstroKalki — [the pattern] decoded, not diagnosed.* (Replace [the pattern] with the pattern short name, e.g. 'the rescuer pattern decoded, not diagnosed'.)",
    "",
    "HARD CONSTRAINTS:",
    "- 800-1200 words total.",
    "- Markdown only. No HTML.",
    `- Do not use any of these words: ${BANNED_WORDS.join(", ")}.`,
    "- Do not use em dashes (—) more than 4 times in the whole article.",
    "- Do not start three sentences in a row with 'You'.",
    "- The city name should appear 2-3 times total in the article, never in a cliché.",
    "- Output ONLY the markdown article. No preamble, no notes, no closing.",
  ].join("\n");
}

/** Convenience: get the City record for a given slug. */
export function getCityForSlug(slug: string): City | null {
  return CITIES.find((c) => c.slug === slug) ?? null;
}

/** Re-export for the route layer. */
export { BANNED_WORDS };
