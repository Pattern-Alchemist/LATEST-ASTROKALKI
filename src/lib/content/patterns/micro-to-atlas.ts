/**
 * Micro-reading → Atlas pattern mapping.
 *
 * The micro-reading quiz (src/components/astrokalki/micro-reading.tsx) produces
 * a result based on three inputs: birth month, emotional pattern, relationship
 * frustration. The emotional pattern is the strongest signal — it maps to the
 * long-form pillar essays (relatedEssay on each Atlas pattern) which in turn
 * reference back to one or more Atlas patterns. When multiple Atlas patterns
 * share the same pillar essay (e.g. "abandonment-loop" is shared by both
 * the-abandonment and the-chaser), the relationship frustration is used as
 * a tiebreaker to pick the most relevant Atlas page.
 *
 * This file also exports cluster + intensity metadata for the Atlas patterns
 * (the Atlas data structure itself is intentionally kept clean of taxonomy —
 * we add the classification here so the source of truth in atlas.ts is not
 * touched by upstream agents). Cluster + intensity drive the AtlasExplorer
 * filter bar and the compare-page side-by-side view.
 *
 * Design system: see globals.css — gold #c9a96e, dark #050505. No code here
 * emits JSX; this is pure data + pure functions so it can run on the server
 * (compare page) and the client (AtlasExplorer) without hydration mismatch.
 */

import { ATLAS_PATTERNS, type AtlasPattern } from "./atlas";

// ─────────────────────────────────────────────────────────────────────────
// Taxonomy — cluster + intensity metadata for each Atlas pattern.
// ─────────────────────────────────────────────────────────────────────────

export type AtlasCluster = "Relationship" | "Emotional" | "Identity" | "Shadow";
export type AtlasIntensity = "Low" | "Medium" | "High";

export const ATLAS_CLUSTERS: AtlasCluster[] = [
  "Relationship",
  "Emotional",
  "Identity",
  "Shadow",
];

export const ATLAS_INTENSITIES: AtlasIntensity[] = ["Low", "Medium", "High"];

/**
 * Cluster + intensity for each Atlas pattern.
 *
 * Clusters are derived from the dominant way the pattern manifests:
 *  - Relationship: the pattern primarily expresses through the partner dynamic
 *  - Emotional:    the pattern primarily expresses through inner affect
 *  - Identity:     the pattern primarily expresses through self-concept/role
 *  - Shadow:       the pattern primarily expresses through hidden self-destruction
 *
 * Intensity reflects how overtly destructive the pattern is to the person's
 * outer life (relationships, career) — High patterns tend to actively disrupt,
 * Medium patterns quietly erode, Low patterns mostly stay underground.
 */
export const ATLAS_META: Record<
  string,
  { cluster: AtlasCluster; intensity: AtlasIntensity }
> = {
  "the-rescuer": { cluster: "Relationship", intensity: "High" },
  "the-abandonment": { cluster: "Relationship", intensity: "High" },
  "the-performer": { cluster: "Identity", intensity: "High" },
  "the-invisible-child": { cluster: "Identity", intensity: "Medium" },
  "the-emotional-caretaker": { cluster: "Emotional", intensity: "Medium" },
  "the-self-sabotage": { cluster: "Shadow", intensity: "High" },
  "the-chaser": { cluster: "Relationship", intensity: "High" },
  "the-avoider": { cluster: "Relationship", intensity: "Medium" },
  "the-outsider": { cluster: "Identity", intensity: "Medium" },
  "the-hyper-independent": { cluster: "Identity", intensity: "Medium" },
  "the-overthinker": { cluster: "Emotional", intensity: "Medium" },
};

/** Safe accessor — returns "Uncategorised" for any unknown slug. */
export function getAtlasMeta(slug: string): {
  cluster: AtlasCluster | "Uncategorised";
  intensity: AtlasIntensity | "Unknown";
} {
  const meta = ATLAS_META[slug];
  if (meta) return meta;
  return { cluster: "Uncategorised", intensity: "Unknown" };
}

// ─────────────────────────────────────────────────────────────────────────
// Micro-reading → Atlas pattern mapping
// ─────────────────────────────────────────────────────────────────────────

/**
 * The micro-reading emotional pattern IDs (see micro-reading.tsx):
 *   abandonment, control, people-pleasing, emotional-numbness,
 *   overthinking, self-doubt
 *
 * Each maps to one or more Atlas patterns via the pattern's relatedEssay
 * field. When ambiguous, the relationship frustration IDs:
 *   same-fight, attracting-wrong, cant-leave, losing-myself,
 *   communication, trust
 * are used as a tiebreaker.
 *
 * Returns an Atlas slug, or null if no mapping could be derived — in which
 * case the caller should link to /patterns/atlas (the hub) instead.
 */
export function microReadingToAtlasPattern(
  emotionalPattern: string,
  relationshipFrustration: string
): string | null {
  // Build a quick lookup of essay → atlas slugs (so the mapping stays in
  // sync with whatever relatedEssay values are declared in atlas.ts).
  const essayToAtlasSlugs = new Map<string, string[]>();
  for (const p of ATLAS_PATTERNS) {
    if (!p.relatedEssay) continue;
    const list = essayToAtlasSlugs.get(p.relatedEssay) ?? [];
    list.push(p.slug);
    essayToAtlasSlugs.set(p.relatedEssay, list);
  }

  // Map micro-reading emotional pattern → pillar essay slug.
  const emotionalToEssay: Record<string, string> = {
    abandonment: "abandonment-loop",
    control: "control-loop",
    "people-pleasing": "people-pleasing",
    "emotional-numbness": "emotional-numbness",
    overthinking: "overthinking",
    "self-doubt": "self-doubt",
  };

  const essay = emotionalToEssay[emotionalPattern];
  if (!essay) return null;

  const candidates = essayToAtlasSlugs.get(essay);
  if (!candidates || candidates.length === 0) return null;

  // Single candidate — done.
  if (candidates.length === 1) return candidates[0];

  // Multiple candidates — pick by relationship frustration tiebreaker.
  // The tiebreaker tables below were derived by reading each candidate
  // pattern's clinical description and matching the frustration that would
  // most uniquely surface that variant.
  const tiebreakers: Record<
    string,
    Record<string, string> // emotionalPattern → frustration → slug
  > = {
    abandonment: {
      "cant-leave": "the-abandonment", // clinging variant
      "same-fight": "the-chaser", // pursuit dynamic
      "losing-myself": "the-abandonment",
      "attracting-wrong": "the-chaser",
      communication: "the-abandonment",
      trust: "the-chaser",
    },
    control: {
      "losing-myself": "the-performer", // performative identity control
      "attracting-wrong": "the-hyper-independent", // walls-up control
      "same-fight": "the-performer",
      "cant-leave": "the-hyper-independent",
      communication: "the-performer",
      trust: "the-hyper-independent",
    },
    "people-pleasing": {
      "same-fight": "the-rescuer", // active fixing loop
      communication: "the-emotional-caretaker", // emotional absorber
      "losing-myself": "the-emotional-caretaker",
      "attracting-wrong": "the-rescuer",
      "cant-leave": "the-emotional-caretaker",
      trust: "the-rescuer",
    },
    "emotional-numbness": {
      "losing-myself": "the-invisible-child", // disappearing self
      "cant-leave": "the-avoider", // withdrawal pattern
      trust: "the-outsider", // never-belonging variant
      "same-fight": "the-avoider",
      "attracting-wrong": "the-outsider",
      communication: "the-invisible-child",
    },
  };

  const table = tiebreakers[emotionalPattern];
  if (table && table[relationshipFrustration]) {
    return table[relationshipFrustration];
  }

  // Fallback: pick the first candidate (deterministic — atlas.ts order).
  return candidates[0];
}

/**
 * Convenience: returns the resolved AtlasPattern object for a micro-reading
 * result, or null. Useful for the micro-reading CTA so it can show the
 * pattern name + tagline alongside the link.
 */
export function microReadingToAtlasPatternObject(
  emotionalPattern: string,
  relationshipFrustration: string
): AtlasPattern | null {
  const slug = microReadingToAtlasPattern(
    emotionalPattern,
    relationshipFrustration
  );
  if (!slug) return null;
  return ATLAS_PATTERNS.find((p) => p.slug === slug) ?? null;
}
