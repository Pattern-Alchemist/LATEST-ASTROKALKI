/**
 * Content cluster metadata — drives the blog hub at /insights
 * and the article schema on individual article pages.
 *
 * Each cluster maps to one of the four SEO themes the site is
 * positioned around. Articles within a cluster interlink heavily
 * to build topical authority.
 */

export interface Cluster {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  /** The primary SEO theme this cluster owns */
  theme: string;
  /** Search-intent queries this cluster targets */
  targetQueries: string[];
  /** Accent color used in cluster cards */
  accent: string;
}

export const CLUSTERS: Cluster[] = [
  {
    slug: "relationship-patterns",
    title: "Relationship Patterns",
    tagline: "Why the same love keeps finding you, wearing a different face.",
    description:
      "The partners change. The pattern doesn't. These essays trace the architecture of repeating relationships — trauma bonds, attachment loops, the familiar ache of leaving or being left. Written for people who already sense they are stuck, but haven't yet seen the pattern from above.",
    theme: "Relationship Patterns & Trauma Bonds",
    targetQueries: [
      "Why do I keep attracting the same relationship",
      "Why do toxic relationships feel familiar",
      "What is a trauma bond",
      "Attachment style vs karmic pattern",
      "Repeating relationship cycles explained",
    ],
    accent: "#c9a96e",
  },
  {
    slug: "self-sabotage",
    title: "Self-Sabotage",
    tagline: "The moment before you ruin it, again, on purpose.",
    description:
      "Self-sabotage doesn't feel like self-destruction — it feels like clarity, caution, or self-respect. That's what makes it so hard to see. These essays map the hidden forms sabotage takes: the late cancellation, the unreturned text, the sudden certainty that you don't deserve this. Each article ends with the pattern beneath the pattern.",
    theme: "Self-Sabotage & Emotional Repetition",
    targetQueries: [
      "Why do I ruin good opportunities",
      "Hidden forms of self sabotage",
      "Why does success feel unsafe",
      "Fear of being seen",
      "Emotional patterns behind procrastination",
    ],
    accent: "#a58a54",
  },
  {
    slug: "identity-purpose",
    title: "Identity & Purpose",
    tagline: "When the person you became to survive no longer fits.",
    description:
      "Most identity crises are not existential — they are developmental. The self that got you through childhood, through the marriage, through the years of performing a role, has reached the edge of what it can carry. These essays are for people who feel lost in the specific way that means: something old is dying and something new has not yet been named.",
    theme: "Purpose & Identity Crisis",
    targetQueries: [
      "Why do I feel lost in life",
      "Identity crisis explained",
      "When your old self no longer fits",
      "Purpose confusion patterns",
      "The psychology of reinvention",
    ],
    accent: "#8a7a4a",
  },
  {
    slug: "astrology-psychology",
    title: "Astrology + Psychology",
    tagline: "Astrology as a diagnostic tool, not a prediction engine.",
    description:
      "These essays explain why AstroKalki uses Vedic astrology as a pattern-recognition instrument rather than a forecasting one. The birth chart is read here the way a therapist reads a genogram — as a map of inherited emotional architecture. For readers who want to understand the methodology before booking, this is the cluster to start with.",
    theme: "Astrology Psychology & Pattern Recognition",
    targetQueries: [
      "Astrology as a pattern recognition tool",
      "Why birth charts reflect emotional tendencies",
      "Shadow work through astrology",
      "Karmic lessons explained",
      "Astrology and emotional intelligence",
    ],
    accent: "#b08b4f",
  },
  {
    slug: "psychological-observations",
    title: "Psychological Observations",
    tagline: "Short, sharp essays on the patterns hiding in plain sight.",
    description:
      "These are the observations that don't need a 3,000-word essay to land. They are short, specific, and built to be shared — the kind of piece that makes someone stop scrolling and send it to one specific person. Each one names a behavior most people do without realizing, traces the pattern beneath it, and points to the deeper work without pretending an article can do that work for you. This is the cluster where AstroKalki's voice is most recognizable: plain, precise, and unwilling to confuse observation with advice.",
    theme: "Behavioral Patterns & Emotional Observation",
    targetQueries: [
      "Why you explain yourself too much",
      "Why being understood feels uncomfortable",
      "Why you choose emotionally unavailable people",
      "Difference between intensity and connection",
      "Why success feels unsafe",
    ],
    accent: "#d4b878",
  },
];

export const CLUSTER_BY_SLUG: Record<string, Cluster> = Object.fromEntries(
  CLUSTERS.map((c) => [c.slug, c])
);
