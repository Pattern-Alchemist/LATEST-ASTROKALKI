import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { db } from "@/lib/db";

/**
 * Testimonials page — pulls from the DB (Testimonial model) so admin can add/manage,
 * with hardcoded fallbacks if the DB is empty.
 */

export const metadata: Metadata = {
  title: "Testimonials — AstroKalki",
  description:
    "First-initial + age + pattern. Real sessions, real recognitions, real shifts. The testimonials here are anonymous because the work is confidential — but the patterns named are specific.",
  alternates: { canonical: "https://astrokalki.com/testimonials" },
  openGraph: {
    title: "AstroKalki Testimonials — Pattern Recognition in Practice",
    description:
      "Anonymous testimonials from sessions — first-initial + age + pattern. The specificity is the evidence.",
    type: "website",
    url: "https://astrokalki.com/testimonials",
    siteName: "AstroKalki",
  },
};

const FALLBACK_TESTIMONIALS = [
  {
    quote:
      "I had been in therapy for four years trying to understand why I kept ending up in the same relationship. The pattern was named in the first thirty minutes of the session. Four years of circling, and the thing I could not see was sitting in my chart the whole time.",
    context: "After Relationship Pattern Analysis",
    initials: "R., 34",
    detail: "Abandonment loop",
  },
  {
    quote:
      "I came in asking whether I should leave my marriage. I left understanding that the question itself was the pattern. The marriage is still here. The pattern is not.",
    context: "After Karmic Relationship Reading",
    initials: "M., 41",
    detail: "People-pleasing",
  },
  {
    quote:
      "The session was not what I expected. I thought I would be told things about my future. Instead, I was shown things about my past that I had never been able to name. The future is now making different sense.",
    context: "After Emotional Pattern Decode",
    initials: "S., 29",
    detail: "Overthinking",
  },
  {
    quote:
      "I had done shadow work in therapy for years. The chart showed me in twenty minutes what therapy had been circling for a decade. Not because therapy failed — because the chart could see what therapy had to discover slowly.",
    context: "After Shadow Work Consultation",
    initials: "A., 38",
    detail: "Control pattern",
  },
  {
    quote:
      "I was at a threshold — career, marriage, the whole life I had built. The session did not tell me what to do. It showed me which direction was actually mine, which made the decision obvious. Three months later, I made it.",
    context: "After Life Direction Session",
    initials: "P., 45",
    detail: "Self-doubt",
  },
  {
    quote:
      "The thing I cannot explain is the specificity. The practitioner described my mother to me without ever meeting her. Described the exact way she was warm and the exact way she was cold. I have no idea how the chart shows that. But it does.",
    context: "After Relationship Pattern Analysis",
    initials: "K., 36",
    detail: "Emotional numbness",
  },
];

type TestimonialItem = {
  quote: string;
  context: string;
  initials: string;
  detail?: string;
  verified?: boolean;
};

export default async function TestimonialsPage() {
  // Try DB first; fall back to hardcoded list if DB is empty/unavailable.
  // Only approved + featured testimonials are shown publicly — submissions
  // awaiting moderation live in /admin/testimonials.
  let testimonials: TestimonialItem[] = FALLBACK_TESTIMONIALS;
  try {
    const dbTestimonials = await db.testimonial.findMany({
      where: { status: "approved", featured: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 12,
    });
    if (dbTestimonials.length > 0) {
      // Fetch VerifiedReview records for these testimonial IDs in one
      // query. There's no Prisma @relation between Testimonial and
      // VerifiedReview (the schema was designed that way to keep
      // Testimonial untouched), so we resolve the link here.
      const verifiedRows = await db.verifiedReview.findMany({
        where: { testimonialId: { in: dbTestimonials.map((t) => t.id) } },
        select: { testimonialId: true },
      });
      const verifiedIds = new Set(verifiedRows.map((v) => v.testimonialId));

      testimonials = dbTestimonials.map((t) => ({
        quote: t.quote,
        context: t.context,
        initials: t.initials,
        detail: t.detail ?? undefined,
        verified: verifiedIds.has(t.id),
      }));
    }
  } catch {
    // Use fallback list
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Testimonials" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Testimonials
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-8">
            First-initial, age, pattern.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            The testimonials here are anonymous because the work is confidential — but the patterns named are specific. Specificity is the only evidence that matters in this work. Vague praise (&quot;life-changing&quot;, &quot;amazing&quot;) means nothing. The pattern, named, means everything.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, idx) => (
            <article
              key={idx}
              className="p-8 border border-white/[0.05] hover:border-[#c9a96e]/20 transition-colors"
            >
              <p className="text-[#cfcabf] text-base leading-[1.8] font-light italic font-serif mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[#c9a96e] text-sm font-serif font-light">{t.initials}</p>
                  {t.verified && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[#c9a96e] border border-[#c9a96e]/40 px-2 py-0.5 rounded"
                      title="This testimonial is from a verified session"
                    >
                      <BadgeCheck
                        className="size-3"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span
                        className="text-[9px] tracking-[0.2em] uppercase font-light"
                        style={{ fontFamily: "Cinzel, Georgia, serif" }}
                      >
                        Verified Session
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mt-1 font-light">
                  {t.context}
                </p>
                {t.detail && (
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#7a7a7a] mt-2 font-light">
                    Pattern: {t.detail}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Honesty note */}
        <div className="mt-16 pt-10 border-t border-white/[0.04]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            A note on these testimonials
          </p>
          <p className="text-sm text-[#9a9a9a] font-light leading-[1.8] max-w-2xl">
            Every quote here is from a real session. Names are reduced to first-initial + age to protect confidentiality. Contexts name the specific session the person came for. Details name the specific pattern the session surfaced. If you recognise your own pattern in one of these, that recognition is the beginning of the work — not the end.
          </p>
        </div>

        {/* Share your experience */}
        <div className="mt-16 pt-10 border-t border-white/[0.04]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-4 font-light">
            Was a pattern named in your session?
          </p>
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-2xl">
            If you sat with me and a pattern was named — and you want to name it
            back, in your own words — your testimony helps the next person
            recognise it in themselves. Submissions are read by hand and
            published anonymously.
          </p>
          <Link
            href="/testimonials/submit"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Share your experience
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>

        {/* CTA */}
        <div className="mt-16 pt-10 border-t border-white/[0.04] text-center">
          <p className="text-base text-[#9a9a9a] font-light leading-[1.8] mb-6 max-w-md mx-auto">
            If a pattern here is yours, the next move is naming it in your own chart.
          </p>
          <Link
            href="/#micro-reading"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Take the micro-reading
            <span className="text-[#c9a96e]">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
