/**
 * Social share card prompts — AstroKalki visual identity for content share
 * images.
 *
 * Three distinct entrypoints (one per content surface) so each kind of page
 * can carry its own visual register while still feeling like one series:
 *
 *   - getArticleCardPrompt(title, excerpt, category)
 *       For /insights/[slug] articles. Picks a motif from the article's
 *       cluster palette (relationship-patterns, self-sabotage,
 *       identity-purpose, astrology-psychology, psychological-observations)
 *       and seeds the prompt's emotional register from the excerpt.
 *
 *   - getAtlasCardPrompt(patternName, patternDescription)
 *       For /patterns/atlas/[slug] pattern pages. Uses the Atlas's
 *       archetypal lexicon (Rescuer, Performer, Invisible Child, etc.) and
 *       a more "diagnostic" / textbook-from-another-century motif set —
 *       obsidian specimens on a dark velvet field, hairline gold
 *       diagrams, anatomical-feeling still lifes.
 *
 *   - getGuideCardPrompt(title)
 *       For /guides/[slug] pillar guides. Uses the most canonical,
 *       "vast hall"-style motifs — long corridors, dark mirrors, immense
 *       spaces with a single shaft of light. The guides are the longest
 *       pieces on the site; the visual register is correspondingly
 *       spacious and weighty.
 *
 * Aesthetic (pinned at the end of every prompt, identical for all three):
 *   - deep black background (#050505)
 *   - warm antique-gold accents (#c9a96e)
 *   - drifting smoke, fractured mirror shards, obsidian surfaces
 *   - A24 film aesthetic, 35mm grain, chiaroscuro lighting
 *   - 16:9 widescreen, 1344x768
 *   - NO people, NO faces, NO text, NO lettering, NO symbols
 *
 * Each function is deterministic for the same inputs — running it twice on
 * the same content yields the same prompt. This keeps the persisted `prompt`
 * column on SocialImage stable across regenerations, which matters for
 * prompt auditing and reproduction.
 *
 * Used by:
 *   - POST /api/ai/social-image              → single-card generate
 *   - POST /api/ai/social-image/generate-all → bulk generate
 */

/* -------------------------------------------------------------------------- */
/*  Shared aesthetic closing clause                                           */
/* -------------------------------------------------------------------------- */

/**
 * Pinned verbatim at the end of every prompt. This is what makes a grid of
 * 35+ cards look like one coherent series instead of 35 unrelated stock
 * images.
 */
const AESTHETIC_CLOSING =
  "Cinematic chiaroscuro lighting, deep black background (#050505) with warm antique-gold accents (#c9a96e), drifting smoke, fractured mirror shards on the ground reflecting nothing, obsidian surfaces. A24 film aesthetic, 35mm grain, psychological mood, 16:9 widescreen composition, no people, no faces, no text, no lettering, no symbols, no charts, no diagrams.";

/* -------------------------------------------------------------------------- */
/*  Stable string hash (djb2) — for deterministic motif selection              */
/* -------------------------------------------------------------------------- */

/**
 * Deterministic 32-bit positive integer hash. Used so two articles in the
 * same cluster pick different motifs from the cluster palette instead of
 * sharing one.
 */
function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/* -------------------------------------------------------------------------- */
/*  Article prompts                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Per-cluster motif palettes for articles. Tuned to the emotional register
 * of each cluster so e.g. a relationship-patterns article leans on
 * doorways + threads, while a self-sabotage article leans on fractured
 * bridges + half-burned structures.
 */
const ARTICLE_CLUSTER_MOTIFS: Record<string, string[]> = {
  "relationship-patterns": [
    "a half-open obsidian doorway with golden light bleeding through the crack, dust suspended in the air",
    "a single golden thread stretched taut across a dark corridor, fraying at the far end",
    "two empty obsidian chairs facing each other across a narrow table, smoke drifting between them",
    "a fragile gold line joining two cracked obsidian vessels, the line itself beginning to fray",
    "a dark hallway with two doors at opposite ends, both slightly ajar, golden light spilling from both",
  ],
  "self-sabotage": [
    "a fragile golden bridge arcing across a black void, its centre crumbling into ash and falling smoke",
    "an obsidian structure halfway through collapsing in on itself, gold light bleeding from the fractures",
    "a single lit match suspended above a dark obsidian surface, the flame reflected infinitely in fractured mirror shards",
    "a golden door held ajar by a thread, smoke curling through the gap from inside",
    "a dark staircase with the bottom three steps missing, gold light spilling from a doorway far above",
  ],
  "identity-purpose": [
    "a dark obsidian mask half-dissolved into smoke, the other half still solid and reflective",
    "a single spiral staircase ascending into black smoke, the lower steps gold-edged and solid, the upper steps dissolving",
    "an empty gold-framed mirror leaning against an obsidian wall, reflecting only darkness",
    "a column of fractured obsidian shards suspended in mid-air, each shard catching a different angle of warm amber light",
    "a single dark doorway at the centre of an immense empty hall, gold light leaking around its edges",
  ],
  "astrology-psychology": [
    "a vast dark obsidian sphere suspended in black space, thin gold orbital rings tilted at impossible angles around it",
    "a circular obsidian chart etched with hairline gold lines, half-buried in ash and smoke",
    "concentric gold rings suspended in black smoke, each ring broken at a different point",
    "a single dark sphere hanging in empty space, a thin gold line tracing an ellipse around it",
    "a dark celestial orrery of obsidian spheres, gold wire connecting them, half the wires snapped",
  ],
  "psychological-observations": [
    "a small dark object resting on an obsidian surface, illuminated by a single shaft of golden light from above",
    "a fractured obsidian mirror lying on dark ground, the fractures glowing faintly with amber light",
    "a single dark doorway seen from very far away, golden light leaking around its edges",
    "a thin gold thread crossing an otherwise empty black frame, the thread barely visible against the dark",
    "a single dark stone on a vast obsidian floor, a shaft of warm light falling on it from above",
  ],
};

/**
 * Words we treat as emotionally resonant for the article-prompt seed.
 * If the excerpt contains any of these, we lead the prompt with the
 * strongest 1-3 matches — gives the image model a different emotional
 * register per article even on the same motif.
 */
const EMOTIONAL_LEXICON = [
  "abandonment", "love", "loss", "grief", "shame", "fear", "anger",
  "longing", "betrayal", "control", "numbness", "freeze", "silence",
  "void", "edge", "threshold", "crack", "fracture", "mirror", "thread",
  "smoke", "ash", "ruin", "collapse", "return", "leaving", "staying",
  "performance", "stage", "mask", "shadow", "child", "parent", "mother",
  "father", "partner", "stranger", "familiar", "unfamiliar", "intimacy",
  "distance", "chase", "avoid", "hide", "seen", "unseen", "invisible",
  "worthy", "unworthy", "deserve", "sabotage", "repeat", "cycle", "loop",
  "pattern", "recognition", "name", "unnamed", "old", "new", "dying",
  "born", "liminal", "between", "abyss", "falling", "holding", "gripped",
  "released", "rescue", "fix", "broken", "whole", "empty", "full",
];

/**
 * Pull the most evocative 1-3 phrases from the excerpt to seed the
 * prompt's emotional register. Cheap (no LLM) — just lexicon matching.
 */
function extractEmotionalSeed(excerpt: string): string {
  const cleaned = excerpt
    .replace(/["'.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return "";

  const words = cleaned.split(" ");
  const matched = words.filter((w) => EMOTIONAL_LEXICON.includes(w));

  if (matched.length > 0) {
    const unique = Array.from(new Set(matched)).slice(0, 3);
    return unique.join(", ");
  }
  return words.slice(0, 8).join(" ");
}

/**
 * Build the image-generation prompt for an ARTICLE share card.
 *
 * @param title    — article title
 * @param excerpt  — ~150 word excerpt shown on the blog hub
 * @param category — cluster slug (e.g. "relationship-patterns")
 */
export function getArticleCardPrompt(
  title: string,
  excerpt: string,
  category: string
): string {
  const motifs = ARTICLE_CLUSTER_MOTIFS[category] ?? ARTICLE_CLUSTER_MOTIFS["psychological-observations"];
  const motif = motifs[stableHash(title) % motifs.length];

  const seed = extractEmotionalSeed(excerpt);

  const parts: string[] = [motif];

  if (seed) {
    parts.push(
      `The image carries the emotional register of: ${seed}. Mood is introspective and heavy, the feeling of recognising something you have always known but never named.`
    );
  } else {
    parts.push(
      `The mood is introspective and heavy — the feeling of recognising something you have always known but never named.`
    );
  }

  parts.push(AESTHETIC_CLOSING);
  return parts.join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Atlas pattern prompts                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Atlas motifs — for /patterns/atlas/[slug] pages. These pages are the
 * "diagnostic library" of 11 named archetypes (The Rescuer, The Performer,
 * The Invisible Child, etc.). The visual register is more "specimen" /
 * "cabinet of curiosities" than the article cards — obsidian objects
 * arranged on velvet, hairline gold diagrams, anatomical-feeling still
 * lifes. Still the same dark/gold/smoke aesthetic, but a quieter, more
 * cataloguing mood.
 */
const ATLAS_MOTIFS: string[] = [
  "a single dark obsidian specimen resting on a black velvet surface under a narrow shaft of golden light, dust motes suspended above it",
  "a hairline gold diagram etched into a dark obsidian slab, the lines barely visible, half-obscured by drifting smoke",
  "an empty obsidian chair facing a tall gold-framed mirror in a dark room, the mirror reflecting only darkness",
  "a dark anatomical still life — obsidian tools arranged on black velvet, gold wire binding them together, a single shaft of warm light",
  "a dark vitrine in an unlit museum hall, a single obsidian object on the top shelf lit by a narrow gold beam",
  "a dark spiral staircase descending into obsidian floor, a thin gold line tracing the inner rail down into shadow",
  "two dark obsidian vessels of different heights on a black surface, gold light catching only their rims",
  "a single dark doorway framed in hairline gold, set into an immense black wall, no light escaping from inside",
  "a dark cairn of obsidian stones stacked impossibly high on a black plain, a single gold thread wrapped around its base",
  "an empty dark auditorium seen from the stage, a single gold spotlight illuminating a vacant obsidian chair",
  "a dark obsidian hand-mirror lying face-down on black velvet, its gold handle catching the only light in the room",
];

/**
 * Build the image-generation prompt for an ATLAS PATTERN share card.
 *
 * @param patternName        — e.g. "The Rescuer Pattern"
 * @param patternDescription — conciseAnswer from the Atlas pattern (~100-150 words)
 */
export function getAtlasCardPrompt(
  patternName: string,
  patternDescription: string
): string {
  const motif = ATLAS_MOTIFS[stableHash(patternName) % ATLAS_MOTIFS.length];
  const seed = extractEmotionalSeed(patternDescription);

  const parts: string[] = [motif];

  parts.push(
    `The image evokes a named psychological archetype — "${patternName}" — without depicting it. It should feel like a specimen plate from a diagnostic text that does not exist: precise, heavy, quiet, diagnostic.`
  );

  if (seed) {
    parts.push(
      `The image carries the emotional register of: ${seed}. The mood is clinical and sombre, not dramatic — the stillness of recognition, not the shock of discovery.`
    );
  } else {
    parts.push(
      `The mood is clinical and sombre, not dramatic — the stillness of recognition, not the shock of discovery.`
    );
  }

  parts.push(AESTHETIC_CLOSING);
  return parts.join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Guide prompts                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Guide motifs — for /guides/[slug] pages. The guides are the longest
 * pieces on the site (3000-5000 words). The visual register is
 * correspondingly spacious and weighty — immense halls, long corridors,
 * vast mirrors. The most "canonical" motifs in the series.
 */
const GUIDE_MOTIFS: string[] = [
  "a vast dark obsidian hall with a single shaft of golden light falling from an unseen window onto an empty floor",
  "an immense dark mirror, cracked in a single clean line, gold light bleeding through the fracture",
  "a long dark corridor of obsidian arches receding into smoke, a single thread of gold light running along the floor",
  "a dark still body of water reflecting nothing, a single golden ring expanding outward across its surface",
  "an immense dark cathedral interior, no people, gold light falling in a single column from a high unseen window",
  "a dark library with empty shelves, a single shaft of golden light falling on an empty obsidian reading table",
];

/**
 * Pull a small thematic-seed phrase from the guide title so two guides
 * that happen to hash to the same motif still produce different prompts
 * (and therefore different images).
 *
 * Strips filler words and returns the longest 2-3 "content" words from
 * the title, lowercased. e.g. "The Complete Guide to Relationship
 * Patterns" → "relationship, patterns".
 */
function extractTitleThematicSeed(title: string): string {
  const FILLER = new Set([
    "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with",
    "complete", "guide", "why", "how", "what", "when", "where", "is", "are",
    "you", "your", "people", "same", "do", "does", "can",
  ]);
  const cleaned = title
    .replace(/["'.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return "";

  const words = cleaned.split(" ").filter((w) => w.length > 2 && !FILLER.has(w));
  return words.slice(0, 3).join(", ");
}

/**
 * Build the image-generation prompt for a GUIDE share card.
 *
 * @param title — guide title (e.g. "The Complete Guide to Relationship Patterns")
 */
export function getGuideCardPrompt(title: string): string {
  const motif = GUIDE_MOTIFS[stableHash(title) % GUIDE_MOTIFS.length];
  const seed = extractTitleThematicSeed(title);

  const parts: string[] = [
    motif,
    `The image evokes the weight and scope of a long-form guide — the sense of entering a vast, silent, interior space that holds more than can be read in one sitting. The mood is patient, weighty, and contemplative.`,
  ];

  if (seed) {
    parts.push(
      `The image should feel resonant with the thematic field of: ${seed} — without depicting anything literal from those words.`
    );
  }

  parts.push(AESTHETIC_CLOSING);

  return parts.join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns the list of all category keys the article-prompt builder knows
 * about. Useful for the admin UI when grouping cards by cluster.
 */
export function getKnownArticleCategories(): string[] {
  return Object.keys(ARTICLE_CLUSTER_MOTIFS);
}
