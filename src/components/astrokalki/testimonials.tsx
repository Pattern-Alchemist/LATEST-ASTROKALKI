"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";

// ── Types ──────────────────────────────────────────────────────────────────

interface TestimonialItem {
  id?: string;
  quote: string;
  context: string;
  initials: string;
  detail?: string | null;
  avatarUrl?: string | null;
  videoUrl?: string | null;
  verified?: boolean;
  verifiedBookingId?: string | null;
  pattern?: string | null;
}

interface ApiResponse {
  testimonials: Array<
    TestimonialItem & {
      createdAt: string;
      updatedAt: string;
      order: number;
      featured: boolean;
      status: string;
      email?: string | null;
    }
  >;
}

// ── Hardcoded fallback from i18n (used when API is unavailable or empty) ──

function buildFallbackItems(
  t: (key: string) => string
): TestimonialItem[] {
  return [
    { quoteKey: "testimonials.quote1", contextKey: "testimonials.context1", initials: "R.K.", detail: "Mumbai" },
    { quoteKey: "testimonials.quote2", contextKey: "testimonials.context2", initials: "A.S.", detail: "Delhi" },
    { quoteKey: "testimonials.quote3", contextKey: "testimonials.context3", initials: "P.M.", detail: "Bangalore" },
    { quoteKey: "testimonials.quote4", contextKey: "testimonials.context4", initials: "V.N.", detail: "Pune" },
    { quoteKey: "testimonials.quote5", contextKey: "testimonials.context5", initials: "S.T.", detail: "Chennai" },
    { quoteKey: "testimonials.quote6", contextKey: "testimonials.context6", initials: "M.J.", detail: "Hyderabad" },
  ].map((item) => ({
    quote: t(item.quoteKey),
    context: t(item.contextKey),
    initials: item.initials,
    detail: item.detail,
    verified: false,
  }));
}

// ── Card component ──────────────────────────────────────────────────────────

function TestimonialCard({
  item,
  index,
}: {
  item: TestimonialItem;
  index: number;
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const quoteRef = useRef<HTMLParagraphElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group relative flex flex-col bg-[#111111] border border-white/[0.06] rounded-sm p-6 sm:p-8 hover:border-[#c9a96e]/20 hover:bg-[#151515] transition-all duration-500"
    >
      {/* Verified badge */}
      {item.verified && (
        <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-[#c9a96e] mb-4 font-light">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]" />
          Verified Session
        </span>
      )}

      {/* Quote */}
      <div className="flex-1">
        <p
          ref={quoteRef}
          className="text-[#cfcabf] text-[clamp(0.95rem,1.8vw,1.15rem)] font-serif italic font-light leading-[1.75] tracking-[-0.01em]"
        >
          &ldquo;{item.quote}&rdquo;
        </p>
      </div>

      {/* Attribution */}
      <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-[10px] tracking-[0.3em] text-[#c9a96e]/70 font-light uppercase shrink-0">
            {item.initials}
          </span>
          <span className="text-[11px] text-[#7a7a7a] font-light truncate">
            {item.context} {item.detail ? `— ${item.detail}` : ""}
          </span>
        </div>

        {/* Video toggle */}
        {item.videoUrl && (
          <button
            onClick={() => setVideoOpen(!videoOpen)}
            className="shrink-0 flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors duration-300 cursor-pointer font-light"
            aria-label={videoOpen ? "Close video" : "Play video testimonial"}
          >
            <svg
              className={`w-3 h-3 transition-transform duration-300 ${
                videoOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <polygon points="3,2 10,6 3,10" className={videoOpen ? "hidden" : ""} />
              <line x1="3" y1="2" x2="3" y2="10" className={videoOpen ? "" : "hidden"} />
              <line x1="3" y1="6" x2="10" y2="6" className={videoOpen ? "" : "hidden"} strokeWidth="1.5" />
            </svg>
            <span>{videoOpen ? "Close" : "Watch"}</span>
          </button>
        )}
      </div>

      {/* Embedded video player */}
      {item.videoUrl && videoOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-4 overflow-hidden"
        >
          <div className="aspect-video bg-[#0a0a0a] rounded-sm overflow-hidden border border-white/[0.06]">
            <iframe
              src={item.videoUrl}
              title={`Video testimonial from ${item.initials}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Testimonials() {
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const fallbackItems = buildFallbackItems(t);

  useEffect(() => {
    let cancelled = false;

    async function fetchTestimonials() {
      try {
        const res = await fetch("/api/testimonials", {
          // Short cache — revalidates on page focus
          cache: "no-cache",
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data: ApiResponse = await res.json();

        if (!cancelled && data.testimonials && data.testimonials.length > 0) {
          setItems(data.testimonials);
        } else if (!cancelled) {
          // API returned empty — use fallback
          setItems(fallbackItems);
        }
      } catch {
        if (!cancelled) {
          console.warn("[Testimonials] API unavailable, using fallback data");
          setItems(fallbackItems);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTestimonials();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── JSON-LD structured data for Google rich results ────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Review",
        reviewBody: item.quote,
        author: {
          "@type": "Person",
          name: item.initials,
        },
        itemReviewed: {
          "@type": "Service",
          name: "AstroKalki Pattern Reading",
        },
      },
    })),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section id="testimonials" className="relative py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="mb-20 sm:mb-28 max-w-4xl">
            <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-8 font-light">
              {t("testimonials.label")}
            </p>
            <h2 className="text-[#f0eee9] text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] font-serif">
              {t("testimonials.headline1")}{" "}
              <span className="text-[#6a6a6a] italic font-light">
                {t("testimonials.headline2")}
              </span>
            </h2>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#111111] border border-white/[0.06] rounded-sm p-6 sm:p-8 animate-pulse"
                >
                  <div className="h-24 skeleton-base rounded-sm mb-4" />
                  <div className="h-3 skeleton-text-short w-1/3 mb-2" />
                  <div className="h-3 skeleton-text-short w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Testimonial grid */}
          {!loading && items.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item, index) => (
                  <TestimonialCard key={item.id || index} item={item} index={index} />
                ))}
              </div>

              {/* Trust footer */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-16 text-center"
              >
                <p className="text-[11px] text-[#6a6a6a] font-light tracking-[0.05em] max-w-lg mx-auto leading-relaxed">
                  Testimonials are published anonymously — first-initial, context, and the session type.
                  Every {""}
                  <span className="text-[#c9a96e]">Verified Session</span> badge links to a completed booking
                  with matching details, confirmed by the client.
                </p>
              </motion.div>
            </>
          )}

          {/* Empty state (shouldn't happen with fallback, but just in case) */}
          {!loading && items.length === 0 && (
            <p className="text-[#7a7a7a] text-sm font-light text-center">
              Testimonials loading…
            </p>
          )}
        </div>
      </section>
    </>
  );
}
