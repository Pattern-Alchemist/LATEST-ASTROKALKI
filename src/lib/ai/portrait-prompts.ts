/**
 * Pattern portrait prompts — AstroKalki visual identity for each Atlas pattern.
 *
 * Design philosophy:
 *   - Each prompt is a 2-3 sentence visual brief, NOT a clinical description.
 *   - The image is abstract / symbolic — never a literal human face or figure.
 *     Motifs: doorways, threads, mirrors, smoke, fractured glass, stone, gold,
 *     obsidian, water, ladders, staircases, light through cracks.
 *   - Aesthetic is consistent across all 10: dark cinematic (A24 / 35mm grain),
 *     chiaroscuro lighting, deep black background (#050505), gold accents
 *     (#c9a96e), obsidian surfaces, smoke. The single visual language is what
 *     makes the set feel like a coherent "Pattern Portrait" series.
 *   - The prompts are tuned for the Z.ai image-generation model: they describe
 *     the scene concretely (objects, lighting, mood, lens, grain) rather than
 *     asking for astrological symbols or literal chart imagery.
 *
 * Used by:
 *   - POST /api/ai/portrait → builds the prompt, calls zai.images.generations.create
 *   - The prompt itself is persisted on the PatternPortrait row for traceability
 *     (so we can later audit what was sent, or reproduce a portrait).
 */

import { getAllAtlasSlugs } from "@/lib/content/patterns/atlas";

/**
 * Per-pattern visual briefs. Each entry maps an Atlas slug to a complete image
 * prompt. The prompts share a closing aesthetic clause so the series is
 * visually coherent regardless of which pattern a user lands on.
 */
const PORTRAIT_PROMPTS: Record<string, string> = {
  "the-rescuer":
    "A pair of dark obsidian hands reaching out of black smoke toward a fragile golden thread suspended in mid-air, the thread fraying where it meets the fingers. The hands glow faintly with warm amber light but the thread is already slipping through them. Smoke curls around the wrists like a second skin. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards on the ground reflecting nothing. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-abandonment":
    "A dark obsidian doorway, half-open, with golden light bleeding through the crack. The door is slightly ajar but no one passes through. Smoke curls at the threshold where footprints in ash begin but never reach the other side. A single key lies on the floor, half-buried in dust. Cinematic chiaroscuro lighting, deep black background with warm amber accents, fractured mirror shards on the floor reflecting nothing. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-performer":
    "A spotlight cutting through black smoke onto an empty obsidian stage, the stage itself cracked with veins of molten gold running through the fractures. A single empty golden chair sits centre-stage under the light, but no one is in it. The light is harsh and theatrical, the surrounding darkness absolute. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards scattered at the foot of the stage reflecting the empty chair. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-invisible-child":
    "A small empty chair at the edge of a long dark obsidian table, half-dissolved into smoke so its outline barely holds. A faint golden light falls across the chair from a window we cannot see, but the chair itself casts no shadow — as if it isn't fully there. Dust hangs in the beam of light. Cinematic chiaroscuro lighting, deep black background, gold accents barely visible, fractured mirror behind the chair reflecting only the empty space. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-emotional-caretaker":
    "A large dark glass vessel, cracked and held together by hands of smoke, golden light leaking through every fracture. The vessel is full to the brim with dark water that reflects nothing, while smaller empty vessels stand around it in shadow, untouched. Thin gold threads wrap the cracks like sutures. Cinematic chiaroscuro lighting, deep black background with warm amber accents, fractured mirror shards on the floor. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-self-sabotage":
    "A fragile golden bridge of light arcing across a black void, the middle of the bridge already crumbling into ash and smoke, fragments falling away into nothing. The two ends are intact and beautiful but the centre is being deliberately pulled apart by an invisible hand. The structure is failing from the inside out. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards below reflecting the falling fragments. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-chaser":
    "A single golden thread stretched tight across a dark corridor, the thread pulled taut as if it is being run after, the far end disappearing into deeper shadow and smoke. A faint amber light marks where the thread ends but the end is always receding. The space between the walls is filled with hanging dust. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards on the floor reflecting the thread's tension. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-avoider":
    "A solid obsidian wall, perfectly smooth, with a single thin gold line running down its centre — a sealed door that has no handle. Behind the wall, golden light bleeds through hairline cracks, but the wall itself is unmoved. Smoke drifts parallel to the wall as if circling it but never crossing. Cinematic chiaroscuro lighting, deep black background with warm amber accents, fractured mirror shards on the floor reflecting only the wall. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-outsider":
    "A single dark obsidian figure-shaped silhouette — featureless, faceless — standing at the edge of a circle of golden light cast on black ground. The figure is half inside the circle, half outside, the gold light passing through its edges like fog. The circle is unbroken but the figure is not fully in it. Smoke drifts across the boundary. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards scattered outside the circle. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-hyper-independent":
    "A single obsidian pillar standing alone in a vast black space, the pillar wrapped in dozens of golden threads knotted tight around itself, each thread anchored to nothing. The pillar is strong but the threads have cut shallow grooves into the stone. No other pillar stands nearby. Smoke pools at the base. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards on the floor reflecting the solitary pillar. A24 film aesthetic, 35mm grain, psychological mood.",

  "the-overthinker":
    "An endless dark glass labyrinth seen from above, the walls made of obsidian reflecting faint golden light, the corridors branching and re-branching into smaller and smaller passages with no centre and no exit. A single point of amber light sits at one corner — the entrance — but no path leads back to it. Smoke fills the inner corridors. Cinematic chiaroscuro lighting, deep black background with warm gold accents, fractured mirror shards scattered through the labyrinth. A24 film aesthetic, 35mm grain, psychological mood.",
};

/**
 * Returns the full image-generation prompt for a given Atlas pattern slug.
 *
 * Throws if the slug is not one of the 10 Atlas patterns — callers in API
 * routes should validate the slug BEFORE calling this function (or wrap in
 * try/catch). The validation is defensive; the route layer also Zod-validates.
 */
export function getPortraitPrompt(patternSlug: string): string {
  const prompt = PORTRAIT_PROMPTS[patternSlug];
  if (!prompt) {
    throw new Error(
      `No portrait prompt defined for pattern slug: "${patternSlug}". ` +
        `Valid slugs: ${getAllAtlasSlugs().join(", ")}`
    );
  }
  return prompt;
}

/**
 * Returns true if the given slug has a portrait prompt defined. Used by the
 * route layer to validate input without re-throwing.
 */
export function hasPortraitPrompt(patternSlug: string): boolean {
  return Boolean(PORTRAIT_PROMPTS[patternSlug]);
}
