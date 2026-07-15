/**
 * /portal — Client portal page
 *
 * Server component that fetches portal data and composes all portal modules.
 * Page composition per spec: AccessGate → Shell → Overview → BundleCard → BookingsList → Timeline → Notes → NoteEditor → BillingCard
 *
 * Uses email-based access via query parameter (production would use signed tokens).
 */

import { Suspense } from "react";
import PortalShell from "@/components/astrokalki/portal/portal-shell";
import PortalOverview from "@/components/astrokalki/portal/portal-overview";
import PortalBookingsList from "@/components/astrokalki/portal/portal-bookings-list";
import PortalBundleCard from "@/components/astrokalki/portal/portal-bundle-card";
import PortalNoteThread from "@/components/astrokalki/portal/portal-note-thread";
import PortalNoteEditor from "@/components/astrokalki/portal/portal-note-editor";
import PortalBillingCard from "@/components/astrokalki/portal/portal-billing-card";
import PortalSessionTimeline from "@/components/astrokalki/portal/portal-session-timeline";
import PortalEmptyState from "@/components/astrokalki/portal/portal-empty-state";
import { PortalAccessGate, PortalLoading } from "@/components/astrokalki/portal/portal-shell";

interface PortalPageProps {
  searchParams: Promise<{ email?: string; tab?: string; token?: string }>;
}

async function PortalContent({ email }: { email: string }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let portalData: {
    summary: { totalBookings: number; completedBookings: number; activeBundles: number };
    bookings: Array<{
      id: string;
      name: string;
      duration: number;
      price: string;
      status: string;
      scheduledAt: string | null;
      roomUrl: string | null;
      createdAt: string;
    }>;
    bundles: Array<{
      id: string;
      totalSessions: number;
      remainingSessions: number;
      expiresAt: string | null;
      status: string;
      bundleProduct: { slug: string; title: string; description: string | null };
    }>;
    stripeCustomerId: string | null;
  } | null = null;

  try {
    const res = await fetch(
      `${siteUrl}/api/portal/me?email=${encodeURIComponent(email)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      portalData = await res.json();
    }
  } catch (err) {
    console.error("[Portal] Failed to fetch portal data:", err);
  }

  if (!portalData) {
    return (
      <div className="text-center py-12">
        <p className="text-body-cinematic text-sm text-[#9a9a9a]">
          Unable to load portal data. Please try again later.
        </p>
      </div>
    );
  }

  // Get the most recent confirmed/completed booking for the timeline
  const timelineBooking = portalData.bookings.find(
    (b) => b.status === "confirmed" || b.status === "completed"
  ) || portalData.bookings[0];

  return (
    <PortalShell email={email}>
      {(activeTab) => {
        switch (activeTab) {
          case "overview":
            return (
              <div className="space-y-8">
                <PortalOverview
                  email={email}
                  summary={portalData.summary}
                  recentBookings={portalData.bookings.slice(0, 3)}
                  activeBundles={portalData.bundles}
                />
                {timelineBooking && (
                  <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6">
                    <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
                      Latest Session Timeline
                    </h3>
                    <PortalSessionTimeline booking={timelineBooking} />
                  </div>
                )}
              </div>
            );
          case "sessions":
            return (
              <div className="space-y-8">
                <PortalBookingsList
                  email={email}
                  bookings={portalData.bookings}
                />
                {timelineBooking && (
                  <div className="bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-6">
                    <h3 className="text-editorial text-xs text-[#9a9a9a] uppercase tracking-[0.15em] mb-4">
                      Session Timeline
                    </h3>
                    <PortalSessionTimeline booking={timelineBooking} />
                  </div>
                )}
              </div>
            );
          case "notes":
            return (
              <div className="space-y-8">
                <PortalNoteEditor
                  bookingId={portalData.bookings[0]?.id}
                  email={email}
                />
                <PortalNoteThread email={email} bookings={portalData.bookings} />
              </div>
            );
          case "billing":
            return (
              <div className="space-y-8">
                <PortalBundleCard
                  bundles={portalData.bundles}
                  stripeCustomerId={portalData.stripeCustomerId}
                />
                <PortalBillingCard
                  stripeCustomerId={portalData.stripeCustomerId}
                />
              </div>
            );
          default:
            return null;
        }
      }}
    </PortalShell>
  );
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const { email, token } = await searchParams;

  // In production, verify the signed token here
  // For now, email-based access for demo
  if (!email) {
    return (
      <PortalAccessGate hasAccess={false}>
        <div />
      </PortalAccessGate>
    );
  }

  return (
    <PortalAccessGate hasAccess={true}>
      <Suspense fallback={<PortalLoading />}>
        <PortalContent email={email} />
      </Suspense>
    </PortalAccessGate>
  );
}
