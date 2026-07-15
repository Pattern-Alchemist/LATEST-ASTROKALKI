"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n-context";

const insightKeys = [
  {
    slug: "the-difference-between-love-and-trauma-bonding",
    categoryKey: "insights.article1.category",
    titleKey: "insights.article1.title",
    excerptKey: "insights.article1.excerpt",
    readTime: "7 min",
    image: "/images/hero-fractured-mirror.png",
    imageAlt: "A dark silhouette facing a fractured mirror — shattered reflections of the same self",
  },
  {
    slug: "the-shadow-self",
    categoryKey: "insights.article2.category",
    titleKey: "insights.article2.title",
    excerptKey: "insights.article2.excerpt",
    readTime: "6 min",
    image: "/images/transformation-journey.png",
    imageAlt: "A meditative figure silhouetted against a cosmic backdrop — the journey inward",
  },
  {
    slug: "the-trauma-loop",
    categoryKey: "insights.article3.category",
    titleKey: "insights.article3.title",
    excerptKey: "insights.article3.excerpt",
    readTime: "8 min",
    image: "/images/accent-mandala.png",
    imageAlt: "An intricate mandala pattern — the geometry of repeating cycles",
  },
  {
    slug: "fear-of-being-seen",
    categoryKey: "insights.article4.category",
    titleKey: "insights.article4.title",
    excerptKey: "insights.article4.excerpt",
    readTime: "5 min",
    image: "/images/meditation-cosmic.png",
    imageAlt: "A cosmic meditation scene — the boundary between the seen and unseen self",
  },
  {
    slug: "the-lie-you-tell-yourself",
    categoryKey: "insights.article5.category",
    titleKey: "insights.article5.title",
    excerptKey: "insights.article5.excerpt",
    readTime: "6 min",
    image: "/images/accent-pattern-flow.png",
    imageAlt: "Abstract flowing patterns — the unconscious shape of a repeating lie",
  },
];

export default function Insights() {
  const { t } = useI18n();

  return (
    <section id="insights" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
      {/* Article structured data injected at section level */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: insightKeys.map((insight, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://astrokalki.com/insights/${insight.slug}`,
              item: {
                "@type": "Article",
                headline: t(insight.titleKey),
                description: t(insight.excerptKey),
                author: { "@type": "Organization", name: "AstroKalki" },
                publisher: { "@type": "Organization", name: "AstroKalki" },
                image: `https://astrokalki.com${insight.image}`,
                timeRequired: insight.readTime,
                inLanguage: "en",
              },
            })),
          }),
        }}
      />

      <div className="max-w-5xl mx-auto">
        <div className="mb-20 sm:mb-28">
          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
            {t("insights.label")}
          </p>
          <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif max-w-3xl">
            {t("insights.headline1")}{" "}
            <span className="text-[#6a6a6a] italic font-light">{t("insights.headline2")}</span>
          </h2>
        </div>

        <div className="border-t border-white/[0.06]">
          {insightKeys.map((insight) => (
            <article key={insight.slug}>
              <Link
                href={`/insights/${insight.slug}`}
                className="group block border-b border-white/[0.06] py-10 sm:py-12 grid grid-cols-12 gap-6 hover:bg-white/[0.015] transition-colors duration-500"
              >
                {/* Article image — responsive, lazy loaded, hidden on smallest screens */}
                <div className="hidden sm:block col-span-12 md:col-span-2">
                  <div className="relative w-full aspect-[4/3] overflow-hidden rounded-sm bg-[#0a0a0a]">
                    <Image
                      src={insight.image}
                      alt={insight.imageAlt}
                      fill
                      className="object-cover object-center transition-all duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 0px, 160px"
                      loading="lazy"
                    />
                    {/* Subtle overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>

                <div className="col-span-12 md:col-span-7">
                  <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/50 font-light">
                    {t(insight.categoryKey)}
                  </span>
                  <h3 className="text-[#f0eee9] text-xl sm:text-2xl md:text-3xl font-serif font-light leading-tight group-hover:text-[#c9a96e] transition-colors duration-500 mb-3 mt-2">
                    {t(insight.titleKey)}
                  </h3>
                  <p className="text-[#7a7a7a] text-sm leading-[1.7] max-w-md font-light">
                    {t(insight.excerptKey)}
                  </p>
                </div>

                <div className="col-span-12 md:col-span-3 flex md:flex-col md:items-end justify-between md:justify-start gap-2">
                  <span className="text-[10px] tracking-[0.2em] text-[#5a5a5a] font-light">
                    {insight.readTime}
                  </span>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] group-hover:text-[#c9a96e] transition-colors duration-500 font-light">
                    Read →
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <InsightTracker />
      </div>
    </section>
  );
}

function InsightTracker() {
  const [tracked, setTracked] = useState(false);
  useEffect(() => {
    if (tracked) return;
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "section_view", data: { section: "insights" }, page: "/" }),
    }).catch(() => {});
    setTracked(true);
  }, [tracked]);
  return null;
}
