/**
 * Pattern → color mapping for the AstroKalki Pattern Calendar (M10-d).
 *
 * Each of the 10 Atlas patterns gets a distinct but harmonious dark-theme
 * color. The palette is deliberately warm (golds, ambers, warm grays,
 * clays, sage) — NO blue or indigo anywhere, matching the AstroKalki
 * editorial dark design system.
 *
 * Colors are tuned to read well on the #050505 background at opacity
 * 0.3–1.0 (the intensity scale used by the calendar grid). At low
 * intensity (0.3) the cell becomes a faint tint of the pattern color;
 * at full intensity (1.0) the cell shows the saturated pattern color.
 *
 * The colors are also chosen so the 10 patterns are visually
 * distinguishable when laid out side-by-side in the legend or when two
 * patterns activate on adjacent days.
 *
 * Mapping rationale (the choice is artistic, but consistent):
 *   the-rescuer              → warm clay     (rescue = earth + warmth)
 *   the-abandonment          → faded rose    (loss / melancholy)
 *   the-performer            → bright gold   (limelight / performance)
 *   the-invisible-child      → dusk violet   (hidden, unseeing)
 *   the-emotional-caretaker  → soft sage     (nurturing / breath)
 *   the-self-sabotage        → ember red     (self-conflict / fire)
 *   the-chaser               → persimmon     (pursuit / heat)
 *   the-avoider              → cool stone    (withdrawal / grey)
 *   the-outsider             → dusty bronze  (exile / patina)
 *   the-hyper-independent    → graphite      (armor / steel)
 *   the-overthinker          → brass         (mental / metallic)
 *
 * NOTE: dusk violet is kept warm and desaturated so it doesn't read as
 * indigo — it sits closer to a brown-plum.
 */

const PATTERN_COLORS: Record<string, string> = {
  'the-rescuer': '#8b5e3a', // warm amber-clay
  'the-abandonment': '#9a5a5a', // faded rose
  'the-performer': '#c9a96e', // signature gold (limelight)
  'the-invisible-child': '#7a5a6a', // dusk violet-brown
  'the-emotional-caretaker': '#7a8a6a', // soft sage
  'the-self-sabotage': '#8b3a3a', // ember red
  'the-chaser': '#b85a3a', // persimmon
  'the-avoider': '#6a6a6a', // cool stone gray
  'the-outsider': '#8a7050', // dusty bronze
  'the-hyper-independent': '#5a5a5a', // graphite
  'the-overthinker': '#a89060', // brass
};

/** Fallback color for unknown / future patterns. */
const DEFAULT_PATTERN_COLOR = '#4a4a4a';

/**
 * Return the hex color for a given Atlas pattern slug.
 *
 * Falls back to a neutral warm-gray if the slug is unknown — this is
 * defensive against future Atlas patterns that haven't been assigned a
 * color yet. The calendar will still render, just in a neutral tone.
 */
export function getPatternColor(slug: string): string {
  return PATTERN_COLORS[slug] ?? DEFAULT_PATTERN_COLOR;
}

/**
 * Return the full color map — used by the legend to render all 10
 * patterns in their assigned colors.
 */
export function getAllPatternColors(): Record<string, string> {
  return { ...PATTERN_COLORS };
}

/**
 * Convert a hex color + intensity (0.3–1.0) to an `rgba()` string
 * suitable for use as a CSS background-color. Used by the calendar
 * grid to render each day cell with the dominant pattern's color at
 * the activation intensity.
 *
 * @param hex    Hex color like '#c9a96e' or '#c9a96eff'
 * @param alpha  0..1 opacity (clamped)
 */
export function hexToRgba(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  let h = hex.replace('#', '');
  if (h.length === 8) {
    // Already has alpha — strip it.
    h = h.slice(0, 6);
  }
  if (h.length !== 6) {
    // Defensive: malformed hex — return a neutral color.
    return `rgba(74, 74, 74, ${a})`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (
    !Number.isFinite(r) ||
    !Number.isFinite(g) ||
    !Number.isFinite(b)
  ) {
    return `rgba(74, 74, 74, ${a})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
