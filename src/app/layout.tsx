import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n-context";
import { PatternThemeProvider } from "@/lib/pattern-theme-context";
import { GA4Tracker } from "@/components/analytics/ga4-tracker";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/* ── Single primary font: Inter.
 *   Weights 300–700 give us the full typographic hierarchy (light body,
 *   semibold headings, etc.) from ONE family. This replaces the previous
 *   8-font payload (Geist Sans/Mono, Cinzel, Inter, Playfair Display,
 *   Cormorant SC, Montserrat, Space Grotesk) — saving ~300 KB of
 *   render-blocking font resources.
 *
 *   All old CSS variable references (--font-cinzel, --font-playfair,
 *   --font-montserrat, --font-cormorant, --font-space-grotesk,
 *   --font-geist-sans) are aliased in globals.css @theme to this single
 *   Inter variable, so every existing component resolves correctly
 *   without any code changes. ── */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // Light 300 for body, 400/500 for text, 600/700 for headings.
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://astrokalki.com"),
  title: "AstroKalki — The Pattern Beneath",
  description:
    "The same pain. Different face. Same pattern. AstroKalki decodes the karmic loops, emotional self-sabotage, and repeating relationship patterns running your life — through Vedic astrology and depth psychology. Not prediction. Pattern recognition.",
  keywords: [
    "trauma bond help",
    "karmic relationship reading",
    "astrology for emotional healing",
    "shadow work astrology",
    "emotional pattern decoding",
    "relationship clarity",
    "spiritual psychology",
    "karmic pattern analysis",
    "shadow self decoding",
    "emotional blueprint reading",
    "Vedic astrology consultation",
    "depth psychology astrology",
    "relationship pattern reading",
    "trauma loop decoding",
    "destiny clarity session",
    "karmic loop breaker",
    "emotional self-sabotage help",
    "pattern recognition astrology",
  ],
  authors: [{ name: "AstroKalki" }],
  creator: "AstroKalki",
  publisher: "AstroKalki",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "AstroKalki — The Same Pain. Different Face. Same Pattern.",
    description:
      "Relationships. Self-sabotage. Emotional confusion. Sometimes the problem isn't your choices — it's the pattern beneath them. Not prediction. Pattern recognition.",
    type: "website",
    locale: "en_IN",
    siteName: "AstroKalki",
    url: "https://astrokalki.com",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "AstroKalki — The Same Pain. Different Face. Same Pattern.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki — The Same Pain. Different Face. Same Pattern.",
    description:
      "Not prediction. Pattern recognition. Decode the emotional patterns running your relationships and choices.",
    creator: "@astrokalki",
    images: ["/api/og"],
  },
  alternates: {
    canonical: "https://astrokalki.com",
  },
  category: "astrology",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is this like a regular astrology reading?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Most astrology readings tell you what will happen. AstroKalki shows you why the same things keep happening. This is pattern recognition, not prediction. We decode the karmic architecture beneath your repeating experiences — the loops you cannot see because you are inside them.",
      },
    },
    {
      "@type": "Question",
      name: "How is this different from therapy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Therapy works with the conscious mind over time. AstroKalki works with the unconscious architecture immediately. Your birth chart reveals patterns that took therapy years to uncover — if they ever did. This is not instead of therapy. It is what makes therapy finally work.",
      },
    },
    {
      "@type": "Question",
      name: "What do I need to provide for a session?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your date of birth, time of birth, and place of birth. The more accurate the time, the deeper the reading. If you do not know your exact birth time, we can still work with a window — but some patterns may be less precise.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to believe in astrology for this to work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You do not need to believe in gravity for it to affect you. The patterns in your chart exist whether you acknowledge them or not. Skeptics often have the most powerful breakthroughs because their resistance dissolves when confronted with specificity.",
      },
    },
    {
      "@type": "Question",
      name: "How long until I see results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Immediately. Most clients report that the recognition happens during the session itself — the moment a pattern is named, it loses its invisible power over you. The integration continues for weeks and months after, but the shift begins the moment you see what was hidden.",
      },
    },
    {
      "@type": "Question",
      name: "Are sessions confidential?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Everything shared in a session remains completely confidential. Your birth chart, your patterns, your revelations — they stay between us. Privacy is not just policy. It is sacred.",
      },
    },
    {
      "@type": "Question",
      name: "What if I want to go deeper after the first session?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "That is common. The first session reveals the architecture. Subsequent sessions go deeper into specific patterns, karmic loops, and shadow work. Many clients return because each layer reveals new depth. The work deepens as you do.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Organization schema — for entity building */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AstroKalki",
              alternateName: "Astro Kalki",
              description:
                "Vedic astrology and depth psychology pattern recognition. Decode karmic loops, emotional self-sabotage, trauma bonds, and shadow patterns.",
              url: "https://astrokalki.com",
              logo: "https://astrokalki.com/logo.svg",
              telephone: "+91-89208-62931",
              email: "hello@astrokalki.com",
              priceRange: "₹2,499 - ₹4,499",
              foundingDate: "2023",
              address: {
                "@type": "PostalAddress",
                addressCountry: "IN",
                addressRegion: "India",
              },
              sameAs: [
                "https://astrokalki.com",
                "https://instagram.com/astrokalki",
                "https://youtube.com/@astrokalki",
                "https://x.com/astrokalki",
              ],
              founder: {
                "@type": "Person",
                name: "AstroKalki",
                url: "https://astrokalki.com/author/astrokalki",
                jobTitle: "Pattern Recognition Practitioner",
                knowsAbout: [
                  "Relationship Patterns",
                  "Trauma Bonds",
                  "Self-Sabotage",
                  "Shadow Work",
                  "Vedic Astrology",
                  "Depth Psychology",
                ],
              },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "AstroKalki Sessions",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Relationship Pattern Analysis",
                      description: "Name the relational pattern running your love life — not the partner, the pattern beneath every partner.",
                      url: "https://astrokalki.com/services/relationship-pattern-analysis",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Karmic Relationship Reading",
                      description: "For the person who keeps meeting the same partner under different names.",
                      url: "https://astrokalki.com/services/karmic-relationship-reading",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Emotional Pattern Decode",
                      description: "Decode the emotional pattern beneath recurring feelings — exhaustion, confusion, numbness, overwhelm.",
                      url: "https://astrokalki.com/services/emotional-pattern-decode",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Shadow Work Consultation",
                      description: "Map the Jungian shadow in your birth chart — the disowned parts of yourself you keep meeting in other people.",
                      url: "https://astrokalki.com/services/shadow-work-consultation",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Life Direction Session",
                      description: "For the person standing at a threshold, unable to see which direction is actually theirs.",
                      url: "https://astrokalki.com/services/life-direction-session",
                    },
                  },
                ],
              },
            }),
          }}
        />
        {/* WebSite schema — for Google sitelinks search + AI Overviews */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "AstroKalki",
              alternateName: "AstroKalki — Pattern Recognition Practice",
              url: "https://astrokalki.com",
              description:
                "A psychological pattern decoder who uses Vedic astrology as a diagnostic tool — not a prediction engine.",
              inLanguage: "en",
              publisher: {
                "@type": "Organization",
                name: "AstroKalki",
                url: "https://astrokalki.com",
              },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://astrokalki.com/insights?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* FAQ Schema — sits on homepage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#c9a96e] focus:text-[#050505] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:tracking-wide"
        >
          Skip to content
        </a>
        <GA4Tracker />
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <PatternThemeProvider>
              {children}
              <Toaster />
            </PatternThemeProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
