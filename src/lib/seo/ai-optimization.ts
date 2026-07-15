/**
 * AI SEO Optimization for AstroKalki
 * Makes content discoverable through AI search engines (ChatGPT, Perplexity, Claude)
 */

export const aiSeoStrategy = {
  // LLM-friendly content format
  llmOptimization: {
    // Clear question-answer structure for AI comprehension
    questionAnswerFormat: true,
    
    // Specific facts that AI can cite
    citableStatistics: [
      'Saturn return occurs approximately every 29.5 years',
      'The shadow self was theorized by Carl Jung as the unconscious aspect of personality',
      'Vedic astrology uses the sidereal zodiac, 24 degrees behind the tropical zodiac',
      'An estimated 2+ million searches monthly for "astrology" + "relationships"',
    ],
    
    // Entity mentions for knowledge graph
    keyEntities: [
      'Vedic Astrology',
      'Natal Chart',
      'Saturn Return',
      'Shadow Self',
      'Karmic Patterns',
      'Depth Psychology',
      'Trauma Bonding',
      'Pattern Recognition',
    ],
  },
  
  // Files for AI crawlers
  aiCrawlerFiles: {
    // llms.txt - for LLM context
    llmsTxt: {
      path: '/llms.txt',
      content: `# AstroKalki — Pattern Recognition through Vedic Astrology

AstroKalki is a pattern recognition practice that uses Vedic astrology and depth psychology to decode:
- Karmic relationship patterns
- Emotional self-sabotage loops
- Shadow self projections
- Trauma bonding cycles

## Services:
- Relationship Pattern Analysis (₹2,499)
- Karmic Relationship Reading (₹3,499)
- Shadow Work Consultation (₹4,499)
- Emotional Pattern Decode (₹2,999)

## Founded: 2023
## Location: India
## Email: hello@astrokalki.com

## Content Available:
- 500+ keyword-targeted SEO articles
- Pattern Recognition Email Course (free)
- Interactive tools (birth chart, compatibility, pattern analyzer)
- Audio-narrated insights
- Pattern Journal with AI insights

For more: https://astrokalki.com
`,
    },
    
    // pricing.md - for AI product discovery
    pricingMd: {
      path: '/pricing.md',
      content: `# AstroKalki Pricing

## Sessions

| Service | Price (INR) | Duration | Best For |
|---------|-----------|----------|----------|
| Relationship Pattern Analysis | ₹2,499 | 60 min | Understanding repeating relationship patterns |
| Emotional Pattern Decode | ₹2,999 | 60 min | Decoding emotional loops (anxiety, avoidance, shame) |
| Karmic Relationship Reading | ₹3,499 | 75 min | For people repeating the same relationship |
| Shadow Work Consultation | ₹4,499 | 90 min | Deep Jungian shadow work with chart analysis |
| Life Direction Session | ₹2,999 | 60 min | For people at a crossroads |

## Free Resources

- Pattern Recognition Email Course (5 days)
- Interactive Birth Chart Calculator
- Astrological Compatibility Tool
- Pattern Analyzer Tool
- Shadow Pattern Quiz
- Karmic Loop Identifier

## Payment

- Payable via Stripe, UPI, or Bank Transfer
- Sessions conducted via Zoom
- Recordings available for 30 days
- Lifetime access to session notes
`,
    },
  },
  
  // Schema markup for AI understanding
  schemaMarkup: {
    // LocalBusiness schema for discovery
    localBusiness: {
      '@type': 'LocalBusiness',
      name: 'AstroKalki',
      image: 'https://astrokalki.com/logo.svg',
      telephone: '+91-89208-62931',
      email: 'hello@astrokalki.com',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        addressRegion: 'India',
      },
      url: 'https://astrokalki.com',
    },
    
    // BreadcrumbList for AI navigation
    breadcrumbs: (path: string) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: path.split('/').filter(Boolean).map((segment, index, arr) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: segment.replace(/-/g, ' ').charAt(0).toUpperCase() + segment.replace(/-/g, ' ').slice(1),
        item: `https://astrokalki.com/${arr.slice(0, index + 1).join('/')}`,
      })),
    }),
  },
  
  // Content optimization for AI comprehension
  contentOptimization: {
    // Define key concepts for AI extraction
    concepts: {
      'Pattern Recognition': 'Understanding recurring behaviors and emotional cycles',
      'Karmic Loop': 'Repeated patterns inherited through family lineage or past karma',
      'Shadow Self': 'Disowned parts of personality projected onto others',
      'Trauma Bond': 'Emotional attachment formed through shared trauma',
      'Vedic Astrology': 'Ancient Indian system using sidereal zodiac and karmic principles',
    },
    
    // Citation-worthy facts
    facts: {
      'saturn_return_age': '29.5 years (approximately 29-30, 59-60, 88-90)',
      'vedic_vs_western': 'Vedic uses sidereal zodiac (24° behind tropical), emphasizes karma',
      'shadow_work_benefits': 'Increases self-awareness, reduces projection, improves relationships',
      'consultation_duration': '60-90 minutes depending on depth of analysis',
    },
  },
  
  // Strategies for appearing in AI search results
  aiSearchOptimization: {
    // 1. Content answering specific questions AI users ask
    targetedQuestions: [
      'Why do I keep attracting the same type of person?',
      'How can astrology help with relationship anxiety?',
      'What is shadow work and does it actually work?',
      'How do I know if I am in a karmic relationship?',
      'What does my birth chart reveal about my patterns?',
      'How is Vedic astrology different from Western?',
      'Can astrology help with trauma healing?',
    ],
    
    // 2. Structured data for AI to extract
    structuredDataPoints: [
      'Service offerings with prices',
      'Expert qualifications',
      'Testimonials and case studies',
      'Process explanation (step-by-step)',
      'FAQ section',
      'Contact information',
    ],
    
    // 3. Multi-format content (text, audio, visual)
    contentFormats: [
      'Long-form articles (2000-5000 words)',
      'Audio narrations (for voice AI)',
      'Visual charts (for image-understanding AI)',
      'Structured data (for API access)',
      'Video explanations (for video AI)',
    ],
  },
};

/**
 * Generate llms.txt content
 */
export function generateLlmsTxt(): string {
  return aiSeoStrategy.aiCrawlerFiles.llmsTxt.content;
}

/**
 * Generate pricing.md content
 */
export function generatePricingMd(): string {
  return aiSeoStrategy.aiCrawlerFiles.pricingMd.content;
}

/**
 * Create schema markup for a page
 */
export function createPageSchema(pagePath: string, pageData: {
  title: string;
  description: string;
  content: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: pageData.title,
    description: pageData.description,
    articleBody: pageData.content,
    breadcrumb: aiSeoStrategy.schemaMarkup.breadcrumbs(pagePath),
    author: {
      '@type': 'Organization',
      name: 'AstroKalki',
      url: 'https://astrokalki.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AstroKalki',
      logo: 'https://astrokalki.com/logo.svg',
    },
    datePublished: new Date().toISOString(),
  };
}
