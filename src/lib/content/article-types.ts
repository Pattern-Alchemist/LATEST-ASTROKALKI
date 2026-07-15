/**
 * Article type definition used by all 20 cluster articles.
 *
 * Every article follows the AI-search-optimization structure the
 * user directive specifies:
 *   - concise answer section (for Google AI Overviews / Perplexity)
 *   - key takeaways (for skimmers and AI citation)
 *   - long-form body (for depth + topical authority)
 *   - FAQs (for FAQ schema + AI citation)
 *   - references (for E-E-A-T signals)
 *   - author information (for entity association)
 */

export interface ArticleReference {
  title: string;
  author?: string;
  year?: number;
  url?: string;
  source?: string;
}

export interface ArticleFAQ {
  q: string;
  a: string;
}

export interface Article {
  slug: string;
  title: string;
  /** Cluster slug — matches /src/lib/content/clusters.ts */
  cluster: string;
  /** Primary SEO target — the search query this article answers */
  targetKeyword: string;
  /** Used in meta description and OG */
  metaDescription: string;
  /** ~150 word excerpt shown on blog hub + cluster index */
  excerpt: string;
  /** ~120 word concise answer at top of article (for AI Overviews) */
  conciseAnswer: string;
  /** 5 bullet points — for skimmers and AI citation */
  keyTakeaways: string[];
  /** Long-form markdown body, 1500+ words */
  body: string;
  /** 4-6 FAQ pairs */
  faqs: ArticleFAQ[];
  /** References / further reading — for E-E-A-T */
  references: ArticleReference[];
  /** Reading time in minutes */
  readTime: number;
  /** ISO date strings */
  publishedAt: string;
  updatedAt: string;
  /** Slugs of related articles in the same or adjacent cluster */
  relatedArticles: string[];
  /** Optional: service page slug for soft CTA */
  relatedService?: string;
}
