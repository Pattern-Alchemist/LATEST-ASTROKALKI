/**
 * AstroKalki author profile — used in Article schema, Person schema,
 * and the /author/astrokalki page.
 *
 * This is the entity-building profile the user directive asks for.
 * Connects the website to YouTube, Instagram, WhatsApp, and the
 * author's published body of work.
 */

export const AUTHOR = {
  name: "AstroKalki",
  alternateName: "Astro Kalki",
  slug: "astrokalki",
  role: "Pattern Recognition Practitioner",
  tagline:
    "A psychological pattern decoder who uses Vedic astrology as a diagnostic tool — not a prediction engine.",
  bio: `AstroKalki is a pattern recognition practice working at the intersection of Vedic astrology and depth psychology. The work does not predict what will happen to you. It shows you why the same things keep happening — the relationship loops, the self-sabotage cycles, the identity thresholds you keep arriving at wearing different faces.

The method reads the birth chart the way a therapist reads a genogram: as a map of inherited emotional architecture. Planetary placements are treated as diagnostic markers for psychological patterns, not as forecasts of events. A Moon-Saturn conjunction is not "a bad year ahead." It is the signature of an early environment where emotional needs were met with coldness or absence — and the adult life that follows from that nervous system.

Sessions are conducted one-to-one, in confidence, and in plain language. No jargon. No mystical deflection. The work is fast, specific, and often uncomfortable — because the patterns being named are the ones a person has spent years not seeing.

AstroKalki is not a brand. It is a method, and a refusal to call astrology what it has mostly become.`,
  bioShort:
    "A psychological pattern decoder who uses Vedic astrology as a diagnostic tool — not a prediction engine. Sessions name the emotional architecture beneath repeating relationships, self-sabotage cycles, and identity thresholds.",
  email: "hello@astrokalki.com",
  whatsapp: "+91 89208 62931",
  sameAs: [
    "https://astrokalki.com",
    "https://instagram.com/astrokalki",
    "https://youtube.com/@astrokalki",
    "https://x.com/astrokalki",
  ],
  knowsAbout: [
    "Relationship Patterns",
    "Trauma Bonds",
    "Emotional Repetition",
    "Self-Sabotage",
    "Shadow Work",
    "Karmic Relationships",
    "Emotional Confusion",
    "Purpose and Identity Crisis",
    "Attachment Styles",
    "Astrology Psychology",
    "Vedic Astrology",
    "Depth Psychology",
  ],
  foundedYear: 2023,
  location: {
    country: "IN",
    region: "India",
  },
  methodology: [
    "Vedic (sidereal) birth chart as diagnostic instrument",
    "Jungian shadow work as integration framework",
    "Attachment theory as relational lens",
    "Somatic awareness as nervous-system reference",
    "Plain-language delivery — no astrological jargon in session",
  ],
  notFor: [
    "People seeking event predictions",
    "People who want to be told what will happen",
    "People looking for daily horoscopes",
    "People who want their chart 'read' for entertainment",
  ],
} as const;
