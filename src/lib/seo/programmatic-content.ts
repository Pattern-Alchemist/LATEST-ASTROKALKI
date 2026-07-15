/**
 * M8-b: LOCAL programmatic SEO content generator.
 *
 * `generateProgrammaticContent(pattern, city)` produces a deterministic,
 * genuinely useful 800+ word markdown article for each (Atlas pattern ×
 * Indian city) combination — without calling the LLM. This is fast (no
 * rate limit, no API cost, no 7-minute batch),” and the content draws
 * directly from the Atlas pattern data so every page is informative,
 * not thin.
 *
 * The article structure:
 *   1. H1: "{Pattern Name} in {City}"
 *   2. Intro — local context, second-person, names the pattern + the
 *      urban-India emotional weather it lives inside.
 *   3. "What this pattern looks like in {City}" — uses Atlas
 *      `howItShowsUp[]` with a city-aware framing paragraph.
 *   4. "The pattern, defined" — Atlas `conciseAnswer` verbatim (the AI-
 *      Overview bait — the same answer Google would surface from the
 *      Atlas page itself).
 *   5. "Signs you're caught in this pattern" — Atlas `symptoms[]` as a
 *      bulleted list.
 *   6. "How this pattern begins" — Atlas `whereItBegins` paragraph.
 *   7. "How AstroKalki helps" — Mirror Method framing + the related
 *      service for this pattern + booking CTA.
 *   8. "Sessions in {City} or online" — local trust signals.
 *   9. "Common questions" — 4 city-aware FAQs.
 *
 * The voice is the AstroKalki voice: direct, second-person, no jargon,
 * no spiritual bypass, no buzzwords. Banned terms (karmic, cosmic,
 * destiny, reveal, unlock) are scrubbed defensively before return.
 */

import type { AtlasPattern } from "@/lib/content/patterns/atlas";
import type { City } from "@/lib/seo/cities";

const BANNED_WORDS = ["karmic", "cosmic", "destiny", "reveal", "unlock"];

export interface ProgrammaticFaq {
  q: string;
  a: string;
}

export interface ProgrammaticContent {
  /** Markdown body — first line is the H1. */
  content: string;
  /** Target search query this page is meant to rank for. */
  searchQuery: string;
  /** <title> + OG title — "Pattern Name in City — AstroKalki" */
  title: string;
  /** 150-160 char meta description. */
  metaDescription: string;
  /** FAQ list — also emitted in the markdown body. Returned separately
   *  so the page route can build FAQPage JSON-LD without re-parsing. */
  faqs: ProgrammaticFaq[];
}

/**
 * Build the target search query for a pattern × city combo.
 * e.g. ("The Abandonment Pattern", "Mumbai") →
 *   "abandonment pattern in relationships Mumbai"
 */
export function buildSearchQuery(pattern: AtlasPattern, city: City): string {
  const shortName = pattern.name
    .replace(/^The\s+/i, "")
    .replace(/\s+Pattern$/i, "")
    .toLowerCase();
  return `${shortName} in relationships ${city.name}`;
}

/** Strip banned words case-insensitively from a string. */
function scrubBanned(text: string): string {
  // Split on markdown link patterns so we don't accidentally scrub a
  // banned word inside a URL (e.g. /services/karmic-relationship-reading
  // contains "karmic", which is banned in the editorial voice but is
  // the actual service slug — replacing it would break the link).
  // Pattern: [text](url) — preserve the URL part, scrub only the text.
  const linkRe = /(\[[^\]]*\]\([^)]*\))/g;
  const parts = text.split(linkRe);
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) {
        // This is a markdown link — scrub only the link text.
        return part.replace(/\[([^\]]*)\]\(([^)]*)\)/, (_m, linkText: string, url: string) => {
          return `[${scrubWordsIn(linkText)}](${url})`;
        });
      }
      return scrubWordsIn(part);
    })
    .join("");
}

/** Apply banned-word replacement to a plain-text string (no markdown links). */
function scrubWordsIn(text: string): string {
  let out = text;
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w}`, "gi");
    out = out.replace(re, (match) => "*".repeat(match.length));
  }
  return out;
}

/**
 * Build the page meta description. Uses the Atlas pattern's
 * metaDescription as a base, appends the city, and truncates to 158
 * characters (Google's typical display cutoff).
 */
function buildMetaDescription(pattern: AtlasPattern, city: City): string {
  const shortName = pattern.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "");
  const base = pattern.metaDescription.replace(/\s+Decoded by AstroKalki\.?$/i, "").trim();
  const tail = ` — what it looks like in ${city.name}, ${city.state}, and how AstroKalki helps.`;
  const combined = `${base}${tail}`;
  if (combined.length <= 158) return combined;
  // Truncate at the last full word under the limit.
  const slice = combined.slice(0, 155);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 100 ? lastSpace : 155).trimEnd()}…`;
}

/**
 * Build the FAQ section for a pattern × city combo.
 *
 * Four questions — each with a 2-3 sentence, city-aware, AstroKalki-voice
 * answer that draws on the pattern's Atlas data.
 */
function buildFaq(pattern: AtlasPattern, city: City): { q: string; a: string }[] {
  const shortName = pattern.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "").toLowerCase();
  const plainName = pattern.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "");

  // Pull the second sentence of the conciseAnswer (the first is the
  // definition, already shown verbatim in the body). Capitalise the
  // first letter so the FAQ answer reads as a grammatical sentence.
  const sentences = pattern.conciseAnswer.split(/(?<=\.)\s+/);
  const secondSentence = sentences[1] ? sentences[1].trim() : "";
  const faqDefinition = secondSentence
    ? secondSentence.charAt(0).toUpperCase() + secondSentence.slice(1)
    : "";

  return [
    {
      q: `What is the ${plainName} and how does it show up in ${city.name}?`,
      a: scrubBanned(
        `The ${plainName} is a behavioural loop. ${faqDefinition} In ${city.name}, this often surfaces inside relationships and workplace dynamics — the same conversations replaying with a partner, the same exhaustion after a long week, the same quiet feeling that something is wrong but you cannot name it. The pattern is not a flaw in who you are. It is a strategy your nervous system learned before you had words for it, and it can be seen and worked with.`
      ),
    },
    {
      q: `Can a birth chart reading really help with the ${shortName}?`,
      a: scrubBanned(
        `Yes — but not in the way most people expect. The chart is not a prediction. It is architecture. AstroKalki reads the chart for the placements that mark this pattern (the chart signature for the ${plainName} is described in the Atlas as: ${pattern.chartSignature.replace(/\.$/, "")}), and uses that map to locate where the pattern was installed and how it tends to reinforce. The reading is a pattern-recognition tool, not a forecast — and the work happens in the session, not on a piece of paper.`
      ),
    },
    {
      q: `Are sessions available in person in ${city.name}?`,
      a: `Sessions with AstroKalki are conducted online (video call, 60 or 90 minutes), so clients in ${city.name}, ${city.state}, can book without travelling. The format works because the work is conversational — we are reading the chart and your life together, not performing a ritual. If you are in ${city.name} and would prefer an in-person format for a specific reason, mention it in the booking note and we will see what is possible.`,
    },
    {
      q: `How much does a session cost, and what is included?`,
      a: `The first session is 60 minutes at ₹2,499 (a longer 90-minute option is ₹3,499 for deeper pattern work). The session includes a pre-read of your chart, a structured conversation that walks through the pattern's origin and reinforcement, and a follow-up recap email with what was named and what to watch for. The Mirror Method — the five-step framework AstroKalki uses — is the spine of every session, regardless of which pattern brought you in.`,
    },
  ];
}

/**
 * Main entry — generate the full content for one (pattern × city) combo.
 *
 * Returns the markdown body (first line is the H1), the target search
 * query, the page title, and the meta description. All banned words are
 * scrubbed before return.
 */
export function generateProgrammaticContent(
  pattern: AtlasPattern,
  city: City
): ProgrammaticContent {
  const shortName = pattern.name.replace(/^The\s+/i, "").replace(/\s+Pattern$/i, "");
  const searchQuery = buildSearchQuery(pattern, city);
  const title = `${pattern.name} in ${city.name} — AstroKalki`;
  const metaDescription = buildMetaDescription(pattern, city);

  // ─── Sections ───────────────────────────────────────────────────

  // 1. Intro — local context, second-person.
  const intro = [
    `You don't need another personality test. You already know the shape of the loop — the same kind of partner, the same kind of fight, the same Sunday-evening dread, the same conversation with yourself at 2 a.m. in a ${city.name} apartment that should feel like yours but doesn't always. What you may not have is the name for it, or the map of where it was installed.`,
    ``,
    `This page is about the ${pattern.name} — one of the ten patterns in the AstroKalki Pattern Atlas — and specifically about how it tends to surface in the daily emotional weather of ${city.name}, ${city.state}. The point is not to diagnose you. The point is to give you a precise vocabulary for a pattern you have probably been living inside for years, and a clear next step if you want to work with it.`,
  ].join("\n");

  // 2. "What this pattern looks like in {City}" — Atlas howItShowsUp + local framing.
  const localSection = [
    `## What the ${shortName} looks like in ${city.name}`,
    ``,
    `Patterns are not abstract. They live in specific moments — the long commute home through ${city.name} traffic where you rehearse the conversation you will never actually have; the friend's wedding where you over-function for everyone else's feelings and arrive home emptied; the work Slack that pings at 10 p.m. and the part of you that has to answer it. The ${shortName} has a shape, and once you can see the shape, you can start to see it in your own weeks.`,
    ``,
    `Here is where the ${shortName} tends to show up, concretely:`,
    ``,
    ...pattern.howItShowsUp.map((item) => `- ${item}`),
    ``,
    `None of these are flaws in your character. Each is a behaviour the pattern produces — and behaviour, unlike personality, can be interrupted.`,
  ].join("\n");

  // 3. "The pattern, defined" — Atlas conciseAnswer verbatim (AI Overview bait).
  const definedSection = [
    `## The pattern, defined`,
    ``,
    pattern.conciseAnswer,
  ].join("\n");

  // 4. "Signs you're caught in this pattern" — Atlas symptoms[] as a list.
  const signsSection = [
    `## Signs you're caught in the ${shortName}`,
    ``,
    `Self-diagnosis is unreliable, especially for patterns that were installed before you had words. But the signs below are concrete and observable — if a few of them land, it is worth reading the full pattern page and considering a session.`,
    ``,
    ...pattern.symptoms.map((item) => `- ${item}`),
    ``,
    `The hardest thing about seeing these signs in yourself is that they have probably felt like character for as long as you can remember. They are not character. They are a survival reflex that grew into a personality, and that distinction matters because reflexes can be worked with.`,
  ].join("\n");

  // 5. "How this pattern begins" — Atlas whereItBegins.
  const beginsSection = [
    `## How this pattern begins`,
    ``,
    pattern.whereItBegins,
  ].join("\n");

  // 6. "How AstroKalki helps" — Mirror Method + related service.
  // Note: the link text uses a generic label ("the related session")
  // rather than the service slug, because some service slugs contain
  // words that are on the banned-words list (e.g. "karmic-relationship-
  // reading"). The link URL preserves the original slug.
  const relatedServiceLine = pattern.relatedService
    ? `The session most often booked for the ${shortName} is [the related reading](/services/${pattern.relatedService}) — though the framework is the same across all five services.`
    : `Every session uses the same five-step framework, regardless of which service you book.`;

  const helpsSection =
    [
      `## How AstroKalki helps`,
      ``,
      `AstroKalki uses the Mirror Method — a five-step framework that combines pattern recognition (the Atlas), Vedic chart architecture, and depth psychology. The five steps are: pattern recognition, emotional origin, reinforcement (the loops that keep the pattern running), behavioural expression, and conscious intervention. The chart is read as a map of where the pattern was installed, not as a forecast of your future.`,
      ``,
      `Sessions are conversational, 60 or 90 minutes, and structured around your specific situation — not a generic reading. ${relatedServiceLine}`,
      ``,
      `What you leave with: a name for the pattern, a map of where it began, a clear picture of the loops that keep it running, and one or two concrete next steps. The follow-up recap email keeps the work alive between sessions.`,
    ].join("\n");

  // 7. Local trust signals.
  const localTrustSection = [
    `## Sessions in ${city.name} or online`,
    ``,
    `AstroKalki works with clients across India, including ${city.name} (population ${city.population}), ${city.state}, and the surrounding metro region. Sessions are conducted online — video call, 60 or 90 minutes — so there is no need to travel. The format works because the work is conversational: we are reading your chart and your life together, not performing a ritual that requires physical presence.`,
    ``,
    `If you are based in ${city.name} and have a specific reason to prefer an in-person format, mention it in the booking note and we will see what is possible. Otherwise, the standard online session is the default and works well.`,
    ``,
    `**Book a session → [/#booking](/#booking)** — the first 60-minute session is ₹2,499.`,
  ].join("\n");

  // 8. FAQ section.
  const faqs = buildFaq(pattern, city);
  const faqSection = [
    `## Common questions about the ${shortName} in ${city.name}`,
    ``,
    ...faqs.flatMap((f) => [`### ${f.q}`, ``, f.a, ``]),
  ].join("\n");

  // 9. Closing CTA line.
  const closingSection = [
    `---`,
    ``,
    `*The ${shortName} decoded, not diagnosed. Book a session with AstroKalki — [/#booking](/#booking).*`,
    ``,
    `Read the full pattern in the [AstroKalki Pattern Atlas](/patterns/atlas/${pattern.slug}).`,
  ].join("\n");

  // ─── Assemble ──────────────────────────────────────────────────
  const body = [
    `# ${pattern.name} in ${city.name}`,
    ``,
    intro,
    ``,
    localSection,
    ``,
    definedSection,
    ``,
    signsSection,
    ``,
    beginsSection,
    ``,
    helpsSection,
    ``,
    localTrustSection,
    ``,
    faqSection,
    ``,
    closingSection,
  ].join("\n");

  // Final defensive scrub — banned words should not appear anywhere.
  const content = scrubBanned(body);

  return { content, searchQuery, title, metaDescription, faqs };
}

/** Re-export for admin routes. */
export { BANNED_WORDS };
