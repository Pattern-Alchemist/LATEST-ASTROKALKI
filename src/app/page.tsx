"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import Navigation from "@/components/astrokalki/navigation";
import { HeroLuxury } from "@/components/hero-luxury";
import MicroDiagnosis from "@/components/astrokalki/micro-diagnosis";

// Lazy-loaded below-fold sections for performance
const MicroReading = lazy(() => import("@/components/astrokalki/micro-reading"));
const WhoFindsMe = lazy(() => import("@/components/astrokalki/who-finds-me"));
const Problem = lazy(() => import("@/components/astrokalki/problem"));
const Mirror = lazy(() => import("@/components/astrokalki/mirror"));
const Services = lazy(() => import("@/components/astrokalki/services"));
const MembershipTiers = lazy(() => import("@/components/astrokalki/membership-tiers"));
const Testimonials = lazy(() => import("@/components/astrokalki/testimonials"));
const StatsCounter = lazy(() => import("@/components/astrokalki/stats-counter"));
const Insights = lazy(() => import("@/components/astrokalki/insights"));
const About = lazy(() => import("@/components/astrokalki/about"));
const FAQ = lazy(() => import("@/components/astrokalki/faq"));
const LeadMagnet = lazy(() => import("@/components/astrokalki/lead-magnet"));
const Booking = lazy(() => import("@/components/astrokalki/booking"));
const Newsletter = lazy(() => import("@/components/astrokalki/newsletter"));
const Footer = lazy(() => import("@/components/astrokalki/footer"));
const FloatingActions = lazy(() => import("@/components/astrokalki/floating-actions"));
const ConsentBanner = lazy(() => import("@/components/astrokalki/consent-banner"));

/* ── Rich skeleton loaders matching AstroKalki's calm dark/gold aesthetic.
 *    Each matches the approximate shape of the section it replaces, so the
 *    user sees themed placeholders instead of blank white or empty space.
 *    Uses the .skeleton-* classes defined in globals.css — subtle gold
 *    shimmer + pulse animations on a near-black base. ── */

function SectionSkeleton({ variant = "default" }: { variant?: string }) {
  switch (variant) {
    case "hero":
      return (
        <div className="skeleton-base relative h-screen min-h-[720px] w-full flex items-center px-6 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-2xl w-full space-y-6">
            {/* Overline */}
            <div className="skeleton-text-short mb-8" />
            {/* Heading lines */}
            <div className="skeleton-heading mb-2" />
            <div className="skeleton-heading w-[45%] mb-2" />
            <div className="skeleton-heading w-[35%]" />
            {/* Spacer */}
            <div className="h-12" />
            {/* Body text lines */}
            <div className="skeleton-text" />
            <div className="skeleton-text w-[70%]" />
            <div className="skeleton-text-short" />
            {/* CTA */}
            <div className="h-16" />
            <div className="skeleton-cta" />
          </div>
        </div>
      );

    case "cards":
      return (
        <div className="skeleton-base py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Section label */}
            <div className="skeleton-text-short mb-8" />
            {/* Heading */}
            <div className="skeleton-heading mb-2" />
            <div className="skeleton-heading w-[40%]" />
            {/* Card grid placeholder */}
            <div className="h-12" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="skeleton-card skeleton-base" />
              <div className="skeleton-card skeleton-base" />
              <div className="skeleton-card skeleton-base" />
            </div>
            {/* Card details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="skeleton-card skeleton-base h-8" />
              <div className="skeleton-card skeleton-base h-8" />
            </div>
          </div>
        </div>
      );

    case "longform":
      return (
        <div className="skeleton-base py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="skeleton-text-short" />
            <div className="skeleton-heading mb-2" />
            <div className="skeleton-heading w-[50%]" />
            <div className="h-8" />
            <div className="skeleton-text" />
            <div className="skeleton-text" />
            <div className="skeleton-text" />
            <div className="skeleton-text w-[60%]" />
            <div className="h-6" />
            <div className="skeleton-text" />
            <div className="skeleton-text w-[75%]" />
          </div>
        </div>
      );

    case "testimonial":
      return (
        <div className="skeleton-base py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="skeleton-text-short" />
            <div className="skeleton-heading mb-2" />
            <div className="skeleton-heading w-[35%]" />
            <div className="h-12" />
            <div className="skeleton-text w-[90%]" />
            <div className="skeleton-text w-[85%]" />
            <div className="skeleton-text w-[70%]" />
            <div className="skeleton-text w-[50%]" />
            <div className="h-8" />
            <div className="flex gap-4">
              <div className="skeleton-text-short" />
              <div className="skeleton-text-short w-[25%]" />
            </div>
          </div>
        </div>
      );

    case "booking":
      return (
        <div className="skeleton-base py-32 sm:py-48 px-6 sm:px-10 lg:px-16">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="skeleton-text-short" />
            <div className="skeleton-heading mb-2" />
            <div className="skeleton-heading w-[45%]" />
            <div className="h-8" />
            <div className="skeleton-text w-[80%]" />
            {/* Progress steps */}
            <div className="flex gap-4 mt-8">
              <div className="skeleton-base h-1 flex-1 rounded" />
              <div className="skeleton-base h-1 flex-1 rounded" />
              <div className="skeleton-base h-1 flex-1 rounded" />
              <div className="skeleton-base h-1 flex-1 rounded" />
              <div className="skeleton-base h-1 flex-1 rounded" />
            </div>
            <div className="h-8" />
            {/* Form field placeholders */}
            <div className="skeleton-text w-[30%]" />
            <div className="skeleton-text w-[60%]" />
            <div className="skeleton-text w-[30%]" />
            <div className="skeleton-text w-[60%]" />
          </div>
        </div>
      );

    case "newsletter":
      return (
        <div className="skeleton-base py-24 sm:py-32 px-6 sm:px-10 lg:px-16">
          <div className="max-w-xl mx-auto space-y-6 text-center">
            <div className="skeleton-heading mx-auto w-[70%]" />
            <div className="skeleton-text mx-auto w-[85%]" />
            <div className="skeleton-text mx-auto w-[50%]" />
            <div className="h-6" />
            <div className="skeleton-cta mx-auto" />
          </div>
        </div>
      );

    default:
      return (
        <div className="skeleton-base py-24 sm:py-32 px-6 sm:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="skeleton-text-short" />
            <div className="skeleton-heading mb-2" />
            <div className="skeleton-heading w-[40%]" />
            <div className="h-6" />
            <div className="skeleton-text" />
            <div className="skeleton-text" />
            <div className="skeleton-text w-[60%]" />
          </div>
        </div>
      );
  }
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <main id="main-content" className="min-h-screen flex flex-col bg-[#050505]" />
    );
  }

  return (
    <>
      <main id="main-content" className="min-h-screen flex flex-col bg-[#050505]">
        <Navigation />
        <HeroLuxury />
        <MicroDiagnosis />
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <MicroReading />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <WhoFindsMe />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <Problem />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <Mirror />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="cards" />}>
          <Services />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="cards" />}>
          <MembershipTiers />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="testimonial" />}>
          <Testimonials />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="default" />}>
          <StatsCounter />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <Insights />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="newsletter" />}>
          <LeadMagnet />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <About />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="longform" />}>
          <FAQ />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="booking" />}>
          <Booking />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="newsletter" />}>
          <Newsletter />
        </Suspense>
        <Suspense fallback={<SectionSkeleton variant="default" />}>
          <Footer />
        </Suspense>
      </main>

      {/* Minimal floating WhatsApp — only essential */}
      <Suspense fallback={null}>
        <FloatingActions />
      </Suspense>
      <Suspense fallback={null}>
        <ConsentBanner />
      </Suspense>
    </>
  );
}
