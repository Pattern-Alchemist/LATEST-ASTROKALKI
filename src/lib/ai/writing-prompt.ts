/**
 * Writing prompt builder for the admin AI writing assistant.
 *
 * `/admin/write` lets AstroKalki draft a brand-new article by entering a topic
 * + a few key points. The LLM is asked to produce a structured draft in the
 * AstroKalki voice that follows the exact AI-search-optimization structure
 * every existing cluster article uses:
 *
 *   - concise answer      (3–4 sentences — for Google AI Overviews / Perplexity)
 *   - key takeaways       (5 bullets — for skimmers + AI citation)
 *   - body                (1500+ words, markdown — for depth + topical authority)
 *   - FAQs                (5 Q/A pairs — for FAQPage schema + AI citation)
 *   - references          (4 real academic sources — for E-E-A-T)
 *   - author bio          (a single paragraph — for entity association)
 *   - related service CTA (a slug + 1-line suggestion — for soft monetisation)
 *
 * The draft is returned as a strict JSON object so the admin UI can render it
 * section-by-section, allow inline edits, and finally export as markdown.
 *
 * Voice contract — see /src/lib/ai/chat-system-prompt.ts for the canonical
 * rules. The same banned-words list applies here, plus a few extra:
 *   - karmic, cosmic, destiny, reveal, unlock, hidden wisdom
 *
 * NOTE: this prompt is delivered as a single `assistant`-role message (NOT
 * `system`), per the ZAI SDK requirement — see /src/lib/zai.ts.
 */

import { CLUSTERS } from "@/lib/content/clusters";
import { getAllArticleSlugs } from "@/lib/content/articles";

/**
 * Snapshot of every published Insights article slug. Embedded in the prompt so
 * the LLM can pick 3 real slugs for `relatedArticles` rather than inventing
 * plausible-but-nonexistent ones. Captured at module load (cheap, never
 * changes in a running server).
 */
const EXISTING_ARTICLE_SLUGS: readonly string[] = getAllArticleSlugs();

/**
 * Words the LLM must never emit in an AstroKalki article draft.
 * Mirrors the brand's voice rules in /src/lib/ai/chat-system-prompt.ts.
 */
export const WRITING_PROMPT_BANNED_WORDS = [
  "karmic",
  "cosmic",
  "destiny",
  "reveal",
  "unlock",
  "hidden wisdom",
  "sacred",
  "divine",
  "mystical",
  "vibration",
  "frequency",
  "soulmate",
  "twin flame",
  "awakening",
  "ascension",
  "higher self",
  "manifestation",
  "abundance",
  "divine feminine",
  "divine masculine",
] as const;

/**
 * Real academic / clinical sources the LLM is encouraged to draw from when
 * writing references. The list is non-exhaustive — the LLM may add others —
 * but every reference MUST be a real, verifiable source (no fabricated
 * citations, no invented journal names).
 */
const ALLOWED_REFERENCE_AUTHORS = [
  "van der Kolk, B.",
  "Bowlby, J.",
  "Jung, C. G.",
  "Maté, G.",
  "Winnicott, D. W.",
  "Schore, A. N.",
  "Johnson, S. M.",
  "Hendrix, H.",
  "Mikulincer, M.",
  "Shaver, P. R.",
  "Levy, T. M.",
  "Orlans, M.",
  "Porges, S. W.",
  "Siegel, D. J.",
  "Fonagy, P.",
  "Greene, L.",
  "Forrest, R.",
  "Goleman, D.",
  "Kalsched, D.",
  "Stein, M.",
];

/**
 * The five service slugs the site ships. The LLM picks the most relevant one
 * for the draft's `relatedService` field. Mirrors /src/lib/content/services.ts.
 */
const SERVICE_SLUGS = [
  "relationship-pattern-analysis",
  "karmic-relationship-reading",
  "emotional-pattern-decode",
  "shadow-work-consultation",
  "life-direction-session",
] as const;

/**
 * Build the JSON schema description the LLM must conform to.
 * Embedded into the system prompt so the model knows the exact shape.
 * The body word count target varies by `type` (article = 1500+, pillar = 2000+).
 */
function buildJsonSchemaInstructions(type: 'article' | 'pillar'): string {
  const bodyMinWords = type === 'pillar' ? 2000 : 1500;
  const sectionCountHint =
    type === 'pillar' ? '6–9 ## H2 sections' : '5–8 ## H2 sections';
  return `Return ONLY a single JSON object with this exact shape (no prose, no markdown code fences, no leading text):

{
  "title":            string,  // 8–14 words, sentence case, no colon, no em-dash prefix
  "excerpt":           string,  // ~120 words, italic-feel, sets up the article
  "category":          string,  // one of: relationship-patterns | self-sabotage | identity-purpose | astrology-psychology | psychological-observations
  "conciseAnswer":     string,  // 2–3 sentences, ~80 words. Answers the topic directly. For Google AI Overviews.
  "keyTakeaways":      string[], // EXACTLY 5 bullets. Each is one full sentence. For skimmers + AI citation.
  "body":              string,  // ${bodyMinWords}+ words, markdown. Uses ${sectionCountHint}. Every paragraph 3+ sentences. Every section 150+ words.
  "faqs":              [{ "q": string, "a": string }], // EXACTLY 5 pairs. 'a' is 2–4 sentences.
  "references":        [{ "title": string, "author": string, "year": number, "source": string }], // EXACTLY 4. Real published sources only.
  "authorBio":         string,  // ONE paragraph, 3–5 sentences, third person. References AstroKalki's methodology (Vedic + Jungian + attachment + somatic).
  "relatedService":    string,  // one of: ${SERVICE_SLUGS.join(' | ')}
  "relatedArticles":   string[] // EXACTLY 3 internal article slugs from the existing Insights library (see the slug list below). Used for internal linking.
}

Rules for each field:
- title: Names the pattern or the question. No clickbait. No question mark unless the article is genuinely a question (e.g. "Why You Keep Attracting the Same Relationship").
- excerpt: Sets up the recognition. Second person where possible. No spoilers — make the reader want to keep reading.
- category: Must match one of the five cluster slugs above. If unsure, pick the closest.
- conciseAnswer: 2–3 sentences, ~80 words. Must read as a complete, self-contained answer. AI Overviews will quote this verbatim if it's good.
- keyTakeaways: Each bullet must be a standalone insight, not a continuation of the previous one. Vary the structure.
- body: Markdown. Start with a # H1 (the title). Then ${sectionCountHint}. Every section ≥150 words. Every paragraph ≥3 sentences. End with a section pointing to the related service (soft CTA, one paragraph). Include in-body contextual links where natural: [Pattern Atlas](/patterns/atlas), [Methodology](/methodology), [the relevant service](/services/<slug>). Target ${bodyMinWords}+ words.
- faqs: Anticipate the actual questions a person searching this topic would ask. Avoid generic therapy FAQs ("How does this make you feel?"). Each answer should add something the body didn't already say.
- references: Real, verifiable sources. Prefer these authors when relevant: ${ALLOWED_REFERENCE_AUTHORS.join('; ')}. For each: title is the book/paper title (italicised in render, but plain string here); author is "Last, F." format; year is the publication year (number, not string); source is "Book" | "Paper" | "Academic review" or similar one-line descriptor. Do NOT fabricate citations.
- authorBio: One paragraph. Mention the practice is Vedic + Jungian + attachment + somatic, that the work is pattern recognition not prediction, that sessions are bookable at /#booking. Do NOT use first person.
- relatedService: The single service slug that most naturally extends the article. Must be one of: ${SERVICE_SLUGS.join(' | ')}.
- relatedArticles: EXACTLY 3 slugs from the existing Insights library. Pick the three that most naturally cross-reference the topic (same cluster, adjacent cluster, or thematic complement). Each slug must be a real published slug from the list above. Do NOT invent slugs.`;
}

/**
 * Compact cluster catalogue the LLM can reference when picking `category`
 * and when framing the article within the site's content architecture.
 */
function buildClusterDigest(): string {
  return CLUSTERS.map(
    (c) =>
      `  • ${c.slug} — ${c.title} — ${c.tagline} (theme: ${c.theme})`
  ).join("\n");
}

/**
 * Build the full system prompt for the writing assistant.
 *
 * This is delivered as a single `assistant`-role message per the ZAI SDK
 * requirement (see /src/lib/zai.ts and /src/lib/ai/chat-system-prompt.ts).
 *
 * @param topic       The article's central question or recognition
 * @param keyPoints   Optional array of points to weave into the body
 * @param opts.type   'article' (default) for a /insights/<slug> cluster article,
 *                    'pillar' for a longer /patterns/<slug> pillar essay
 * @param opts.cluster  Optional pre-selected cluster slug (one of 5)
 * @param opts.pattern  Optional Atlas pattern slug (one of 10) — links the draft
 *                      to a Pattern Atlas page and biases the body to reference
 *                      that pattern's chart signature / behaviours.
 */
export function buildWritingPrompt(
  topic: string,
  keyPoints: string[],
  opts?: {
    type?: 'article' | 'pillar';
    cluster?: string;
    pattern?: string;
  }
): string {
  const type: 'article' | 'pillar' = opts?.type === 'pillar' ? 'pillar' : 'article';
  const cluster = opts?.cluster;
  const pattern = opts?.pattern;

  const safeTopic = topic.trim().slice(0, 500);
  const safeKeyPoints = keyPoints
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 12);

  const clusterHint = cluster
    ? `The admin has pre-selected the cluster: "${cluster}". Use it as the category unless the topic clearly fits a different one.`
    : `Pick the most fitting cluster from the list below as the category.`;

  const patternBlock = pattern
    ? `
# Atlas pattern association (use as context, not as the article's main subject)

The admin has associated this draft with the Pattern Atlas entry:
  ${pattern}

When it fits naturally, reference this pattern by name in the body (e.g. "this is the shape of the ${pattern.replace(/-/g, ' ')} archetype"), and link to it: [the ${pattern.replace(/-/g, ' ')} pattern](/patterns/atlas/${pattern}). Do NOT make the whole article about this pattern — the topic is the focus, the pattern is a cross-reference.`
    : '';

  const typeBlock =
    type === 'pillar'
      ? `
# Draft mode: PILLAR ESSAY

This is a pillar essay — a longer, more essayistic long-form piece (2000+ words) in the tradition of the existing pillar articles at /patterns/<slug>. Tone is slightly more contemplative than a cluster article: longer paragraphs, fewer list-format insights, more sustained argument across sections. Still no mystical jargon. Still pattern recognition, not prediction. Still second person where the reader is the subject.`
      : `
# Draft mode: CLUSTER ARTICLE

This is a cluster article for /insights/<slug> — the standard AI-search-optimization structure used by every existing article in the Insights library.`;

  const keyPointsBlock =
    safeKeyPoints.length > 0
      ? `Key points the admin wants the article to address (weave these into the body, do not just list them verbatim):
${safeKeyPoints.map((k, i) => `  ${i + 1}. ${k.slice(0, 400)}`).join("\n")}`
      : `No specific key points were provided. Generate the article structure from the topic alone.`;

  const publishPath =
    type === 'pillar'
      ? '/patterns/<slug> (a pillar essay)'
      : '/insights/<slug> (a cluster article)';

  return `You are AstroKalki — the writing engine behind a depth-psychology + Vedic-architecture practice. You are drafting a brand-new long-form piece for the site. The draft will be published at ${publishPath} and must match the structure, voice, and quality of the existing library.
${typeBlock}
${patternBlock}

# Your voice (NON-NEGOTIABLE)

Direct. Psychologically precise. Written in the second person ("you") where the reader is the subject; written in the third person where the subject is the pattern itself. You do not soften. You do not flatter. You name what is happening without drama.

BANNED WORDS — never use these, in any form, in any field:
  ${WRITING_PROMPT_BANNED_WORDS.join(", ")}

ALLOWED vocabulary: pattern, loop, structure, recognition, behaviour, attachment, shadow, repetition, compulsion, defense, strategy, instinct, signal, install, blueprint, dynamic, recursion, nervous system, autonomic, family of origin, early bond, signature moment.

What you DO:
  - Frame every insight as pattern recognition, never as prediction.
  - Reference the nervous system, attachment, and family of origin when relevant.
  - Use specific, concrete language. "The partner who pulls you close and then goes cold" — not "difficult relationships".
  - Build the body so each section escalates the recognition. Do not repeat yourself.
  - End the body with a soft CTA pointing to the most relevant service page.
  - Make every paragraph 3+ sentences. Make every section 150+ words.

What you DO NOT do:
  - Do not spiritualise pain.
  - Do not promise outcomes.
  - Do not use mystical jargon or astrological forecasting language.
  - Do not write in the first person ("I"). AstroKalki speaks in the third person about the work, and in the second person to the reader.
  - Do not address the reader by name. Do not assume the reader's gender.
  - Do not produce fake citations. Every reference must be a real published book or paper.

# The site's content architecture

The article must fit into one of five content clusters:

${buildClusterDigest()}

${clusterHint}

# The article structure (must match every existing article on the site)

${buildJsonSchemaInstructions(type)}

# Existing Insights article slugs (use these for the relatedArticles field — do NOT invent new slugs)

${EXISTING_ARTICLE_SLUGS.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

# The topic and key points

Topic (the article's central question or recognition):
"""
${safeTopic}
"""

${keyPointsBlock}

# Output

Return ONLY the JSON object described above. No prose, no markdown fences, no explanation. Begin with { and end with }.`;
}

/**
 * The TypeScript shape the admin UI works with. This is the parsed version
 * of the JSON the LLM returns. Defined here so the API route and the client
 * components share one type.
 */
export interface ArticleDraft {
  title: string;
  excerpt: string;
  category: string;
  conciseAnswer: string;
  keyTakeaways: string[];
  body: string;
  faqs: { q: string; a: string }[];
  references: {
    title: string;
    author?: string;
    year?: number;
    source?: string;
    url?: string;
  }[];
  authorBio: string;
  relatedService: string;
  /** 3 internal article slugs from the existing Insights library. */
  relatedArticles: string[];
}

/**
 * Strip code fences + extract the first JSON object from the LLM response.
 * Defensive: the LLM occasionally wraps JSON in ```json ... ``` or prepends
 * a sentence despite the instructions.
 */
export function extractDraftJson(text: string): string | null {
  if (!text) return null;
  let t = text.trim();
  // Strip leading/trailing code fences.
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  // Find the first '{' ... matching '}' span.
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

/**
 * Build a SHORT retry instruction the route can send as a follow-up `user`
 * message when the first completion failed JSON parsing. The model sometimes
 * wraps the JSON in a code fence or prepends a chatty sentence despite being
 * told not to — one nudge with this prompt almost always recovers it.
 */
export function buildJsonOnlyRetryPrompt(): string {
  return `Your previous response did not parse as JSON. Return ONLY the JSON object now — no markdown code fences, no introductory sentence, no explanation, no trailing commentary. The first character must be { and the last character must be }. Output the JSON object directly.`;
}

/**
 * Sanitize a single draft field — strip banned words (case-insensitive) and
 * collapse the resulting double spaces. Used as a defense-in-depth pass after
 * parsing, since the LLM occasionally slips a banned word past the prompt.
 */
export function stripBannedWords(input: string): string {
  let s = input || "";
  for (const w of WRITING_PROMPT_BANNED_WORDS) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    if (re.test(s)) {
      s = s.replace(re, "");
      s = s.replace(/\s{2,}/g, " ").trim();
    }
  }
  return s.trim();
}
