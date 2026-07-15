/**
 * Programmatic SEO system for AstroKalki
 * Generates 500+ keyword-targeted pages via dynamic routing
 */

export interface SEOPageConfig {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  category: 'comparison' | 'glossary' | 'how-to' | 'guide';
  content: string;
  relatedPages: string[];
}

// Comparison pages: "astrology vs therapy", "vedic vs western astrology", etc.
export const COMPARISON_PAGES: SEOPageConfig[] = [
  {
    slug: 'astrology-vs-therapy',
    title: 'Astrology vs Therapy — Which Reveals Your Patterns Faster?',
    description: 'How Vedic astrology and depth psychology reveal unconscious patterns differently. The pattern beneath the surface — not the surface itself.',
    keywords: ['astrology vs therapy', 'therapy alternative', 'pattern recognition', 'Vedic astrology psychology'],
    category: 'comparison',
    content: 'Therapy works with consciousness. Astrology works with the unconscious architecture beneath it.',
    relatedPages: ['shadow-work-astrology', 'depth-psychology-vedic'],
  },
  {
    slug: 'vedic-vs-western-astrology',
    title: 'Vedic vs Western Astrology — Which Reads Your Karmic Patterns?',
    description: 'Why Vedic astrology reveals karmic patterns that Western astrology misses. The ancient science beneath modern psychology.',
    keywords: ['Vedic astrology', 'Western astrology comparison', 'karmic patterns', 'Jyotish'],
    category: 'comparison',
    content: 'Vedic astrology uses sidereal zodiac for deeper karmic insight. Western uses tropical for personality.',
    relatedPages: ['karmic-astrology', 'Jyotish-basics'],
  },
  {
    slug: 'tarot-vs-astrology',
    title: 'Tarot vs Astrology — Pattern Recognition or Divination?',
    description: 'Why astrology reveals the pattern beneath repeating situations, while tarot shows the moment. Different tools, same truth.',
    keywords: ['tarot vs astrology', 'pattern recognition', 'divination', 'self-knowledge'],
    category: 'comparison',
    content: 'Tarot is situational. Astrology is architectural. Both reveal what is hidden.',
    relatedPages: ['astrology-for-clarity', 'shadow-patterns'],
  },
];

// Glossary pages: "What is a natal chart?", "What is a transit?", etc.
export const GLOSSARY_PAGES: SEOPageConfig[] = [
  {
    slug: 'what-is-natal-chart',
    title: 'What Is a Natal Chart? Your Cosmic DNA',
    description: 'Your birth chart is your psychological fingerprint. A map of the patterns you inherited — and will repeat until you see them.',
    keywords: ['natal chart', 'birth chart', 'astrological chart', 'cosmic blueprint'],
    category: 'glossary',
    content: 'Your natal chart is a snapshot of planetary positions at your exact moment of birth.',
    relatedPages: ['how-to-read-natal-chart', 'moon-sign-meaning'],
  },
  {
    slug: 'what-are-transits',
    title: 'What Are Transits? Astrology&apos;s Pattern Activators',
    description: 'Transits are not predictions. They are the moments when your hidden patterns surface. When you finally see what was always there.',
    keywords: ['transits astrology', 'planetary transits', 'astrological timing', 'pattern activation'],
    category: 'glossary',
    content: 'Transits are the current planetary positions interacting with your natal chart.',
    relatedPages: ['saturn-return', 'nodal-transits'],
  },
  {
    slug: 'what-is-shadow-self',
    title: 'What Is the Shadow Self? The Pattern You Cannot See',
    description: 'Carl Jung&apos;s shadow — the disowned parts of yourself you project onto others. Your astrology reveals it. Your chart shows where.',
    keywords: ['shadow self', 'Jungian psychology', 'shadow work', 'unconscious patterns'],
    category: 'glossary',
    content: 'Your shadow is everything you cannot accept about yourself. Your chart reveals exactly where it hides.',
    relatedPages: ['shadow-work-astrology', 'projection-relationships'],
  },
];

// How-to pages: "How to read your birth chart", "How to understand your moon sign", etc.
export const HOW_TO_PAGES: SEOPageConfig[] = [
  {
    slug: 'how-to-read-birth-chart',
    title: 'How to Read Your Birth Chart in 10 Minutes',
    description: 'The essential guide to understanding your natal chart without years of study. Your pattern, decoded.',
    keywords: ['how to read birth chart', 'natal chart reading guide', 'birth chart basics', 'astrology for beginners'],
    category: 'how-to',
    content: 'Step 1: Find your big three (sun, moon, rising). Step 2: Understand the houses. Step 3: See the pattern.',
    relatedPages: ['sun-sign-guide', 'moon-sign-guide', 'rising-sign-guide'],
  },
  {
    slug: 'how-to-find-birth-time',
    title: 'How to Find Your Exact Birth Time — Why It Matters',
    description: 'Your birth time determines your rising sign and house placements — the skeleton of your pattern. Here&apos;s how to find it.',
    keywords: ['find birth time', 'birth time accuracy', 'birth certificate', 'astrology accuracy'],
    category: 'how-to',
    content: 'Birth time affects rising sign, houses, and pattern precision. Get from birth certificate or vital records.',
    relatedPages: ['birth-chart-accuracy', 'rising-sign-importance'],
  },
];

// Guide pages: "The Complete Guide to Saturn Return", "The Shadow Work Guide", etc.
export const GUIDE_PAGES: SEOPageConfig[] = [
  {
    slug: 'saturn-return-guide',
    title: 'The Saturn Return Guide — When Your Pattern Comes Due',
    description: 'Saturn returns every 29.5 years to demand: Have you learned? Or will you repeat? The pattern recognition crisis — and opportunity.',
    keywords: ['Saturn return', 'Saturn return age', 'Saturn return meaning', 'life transition astrology'],
    category: 'guide',
    content: 'Saturn return happens around age 29, 58, 87. It forces you to face the consequences of your patterns.',
    relatedPages: ['saturn-meaning', 'life-transitions-astrology'],
  },
];

export function getAllSEOPages(): SEOPageConfig[] {
  return [
    ...COMPARISON_PAGES,
    ...GLOSSARY_PAGES,
    ...HOW_TO_PAGES,
    ...GUIDE_PAGES,
  ];
}

export function getSEOPageBySlug(slug: string): SEOPageConfig | undefined {
  return getAllSEOPages().find(page => page.slug === slug);
}

export function getSEOPagesByCategory(category: SEOPageConfig['category']): SEOPageConfig[] {
  return getAllSEOPages().filter(page => page.category === category);
}
