import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { SERVICES, SERVICE_BY_SLUG } from "@/lib/content/services";
import { AUTHOR } from "@/lib/content/author";
import { CLUSTER_BY_SLUG } from "@/lib/content/clusters";
import { ARTICLE_BY_SLUG } from "@/lib/content/articles";
import { renderMarkdown } from "@/lib/content/markdown";
import { db } from "@/lib/db";

/**
 * Service page — SEO landing page for each of the 5 core services.
 *
 * Structure:
 *   - Hero with the search intent this service addresses
 *   - Who it's for (second-person, emotionally specific)
 *   - What we do (the actual session flow)
 *   - What you leave with (concrete, not vague)
 *   - Session structure (the 5-step flow)
 *   - Pricing (transparent)
 *   - FAQs (with FAQPage JSON-LD schema)
 *   - Related articles (for interlinking + topical authority)
 *   - Service + BreadcrumbList + FAQPage JSON-LD schema
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICE_BY_SLUG[slug];
  if (!service) return { title: "Service not found — AstroKalki" };

  return {
    title: `${service.title} — AstroKalki`,
    description: service.metaDescription,
    alternates: { canonical: `https://astrokalki.com/services/${slug}` },
    openGraph: {
      title: service.title,
      description: service.metaDescription,
      type: "website",
      url: `https://astrokalki.com/services/${slug}`,
      siteName: "AstroKalki",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(service.title)}&subtitle=${encodeURIComponent("AstroKalki Session")}`,
          width: 1200,
          height: 630,
          alt: service.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: service.title,
      description: service.metaDescription,
      images: [`/api/og?title=${encodeURIComponent(service.title)}&subtitle=${encodeURIComponent("AstroKalki Session")}`],
    },
    keywords: [service.targetKeyword, ...service.secondaryKeywords],
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = SERVICE_BY_SLUG[slug];
  if (!service) notFound();

  // ─── Approved testimonials tagged with this service's pattern ───
  // The Testimonial.pattern field can be tagged with a pattern key (e.g.
  // "abandonment", "people-pleasing", "control", "emotional-numbness",
  // "self-doubt") that matches Service.relatedPattern. We query the DB for
  // approved testimonials whose pattern matches, and if there are 3+, we
  // emit AggregateRating + Review schema. We NEVER fake reviews.
  let approvedTestimonials: {
    quote: string;
    initials: string;
    context: string;
  }[] = [];
  try {
    if (service.relatedPattern) {
      approvedTestimonials = await db.testimonial.findMany({
        where: {
          status: "approved",
          pattern: service.relatedPattern,
        },
        select: {
          quote: true,
          initials: true,
          context: true,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 5,
      });
    }
  } catch {
    // If the DB is unavailable (e.g. during static prerender), fail soft —
    // no reviews, no aggregateRating. Never fake.
    approvedTestimonials = [];
  }
  const hasEnoughReviews = approvedTestimonials.length >= 3;

  // Service schema — for Google's service offering rich results.
  // When ≥3 approved testimonials exist for this service's pattern,
  // augment with aggregateRating + review[] (Review schema).
  const serviceSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.metaDescription,
    provider: {
      "@type": "Organization",
      name: "AstroKalki",
      url: "https://astrokalki.com",
      sameAs: AUTHOR.sameAs,
    },
    serviceType: "Pattern Recognition Consultation",
    areaServed: "Worldwide",
    offers: service.pricing.map((p) => ({
      "@type": "Offer",
      price: p.price.replace(/[^0-9]/g, ""),
      priceCurrency: "INR",
      description: `${p.duration} — ${p.best}`,
    })),
    url: `https://astrokalki.com/services/${service.slug}`,
  };

  if (hasEnoughReviews) {
    serviceSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      reviewCount: approvedTestimonials.length,
      bestRating: "5",
      worstRating: "1",
    };
    serviceSchema.review = approvedTestimonials.map((t) => ({
      "@type": "Review",
      reviewBody: t.quote,
      author: { "@type": "Person", name: t.initials },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      ...(t.context ? { name: t.context } : {}),
    }));
  }

  // FAQ schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  const relatedArticleObjects = service.relatedArticles
    .map((s) => ARTICLE_BY_SLUG[s])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-10">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Services", href: "/#services" },
                { label: service.title },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            AstroKalki Session
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            {service.title}
          </h1>
          <p className="text-xl sm:text-2xl text-[#cfcabf] font-serif italic font-light leading-[1.5] max-w-3xl">
            {service.headline}
          </p>

          {/* Quick facts */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 border-t border-white/[0.04]">
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2">Duration</p>
              <p className="text-sm text-[#cfcabf] font-light">{service.pricing[0]?.duration}</p>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2">Starting at</p>
              <p className="text-sm text-[#cfcabf] font-light">{service.pricing[0]?.price}</p>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2">Format</p>
              <p className="text-sm text-[#cfcabf] font-light">1-on-1, recorded</p>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2">Where</p>
              <p className="text-sm text-[#cfcabf] font-light">Online / WhatsApp</p>
            </div>
          </div>
        </div>
      </header>

      {/* Who it's for */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Who this is for
          </p>
          <p className="text-lg sm:text-xl text-[#dcdad4] font-light leading-[1.8]">
            {service.whoItsFor}
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            What we do in the session
          </p>
          <ul className="list-none space-y-5">
            {service.whatWeDo.map((item, idx) => (
              <li
                key={idx}
                className="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light flex gap-4"
              >
                <span className="text-[#c9a96e] font-mono text-sm pt-1 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What you leave with */}
      <section className="border-b border-white/[0.04] bg-white/[0.015]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            What you leave with
          </p>
          <ul className="list-none space-y-4">
            {service.whatYouLeaveWith.map((item, idx) => (
              <li
                key={idx}
                className="text-[#cfcabf] text-base sm:text-lg leading-[1.7] font-light flex gap-3"
              >
                <span className="text-[#c9a96e] shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Session structure */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            How the session flows
          </p>
          <div className="space-y-10">
            {service.sessionStructure.map((step, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-8">
                <div className="flex sm:block items-center gap-3">
                  <span className="text-[#c9a96e]/40 font-mono text-xs">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] font-light sm:mt-2">
                    {step.label}
                  </p>
                </div>
                <p className="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            Pricing
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {service.pricing.map((tier, idx) => (
              <div
                key={idx}
                className="p-8 border border-white/[0.06] hover:border-[#c9a96e]/30 transition-colors"
              >
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/70 mb-4 font-light">
                  {tier.best}
                </p>
                <p className="text-3xl font-serif text-[#f0eee9] font-light mb-2">{tier.price}</p>
                <p className="text-sm text-[#9a9a9a] font-light">{tier.duration}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/#booking"
              className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
            >
              Book this session
              <span className="text-[#c9a96e]">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-10 font-light">
            Frequently asked questions
          </p>
          <div className="space-y-8">
            {service.faqs.map((faq, idx) => (
              <div key={idx}>
                <h3 className="text-lg sm:text-xl font-serif text-[#f0eee9] font-light mb-3 tracking-[-0.01em]">
                  {faq.q}
                </h3>
                <p className="text-[#cfcabf] text-base leading-[1.8] font-light">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related articles */}
      {relatedArticleObjects.length > 0 && (
        <section className="border-b border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-8 font-light">
              Related reading
            </p>
            <div className="space-y-6">
              {relatedArticleObjects.map((article) => {
                if (!article) return null;
                const cluster = CLUSTER_BY_SLUG[article.cluster];
                return (
                  <Link
                    key={article.slug}
                    href={`/insights/${article.slug}`}
                    className="block group"
                  >
                    <p className="text-[#c9a96e] text-xs font-serif italic mb-1">
                      {cluster?.title}
                    </p>
                    <p className="text-[#f0eee9] text-lg font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
                      {article.title} →
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section>
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-20 text-center">
          <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.8] mb-8 max-w-xl mx-auto">
            If this is the door you came in through, the work begins here.
          </p>
          <Link
            href="/#booking"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Book a session
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
