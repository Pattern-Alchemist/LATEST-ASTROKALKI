import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import { getForecastForUser } from "@/lib/astrology/forecast";
import CalendarApp from "./CalendarApp";

/**
 * /pattern-calendar — the Pattern Activation Calendar (M10-d).
 *
 * Auth-gated: if there is no NextAuth session, redirect to /account
 * (the member-portal sign-in page). Once signed in, the page server-
 * fetches the user's 30-day pattern-activation forecast (via the
 * shared `getForecastForUser()` helper, which has its own 1-hour
 * in-memory cache) and passes it to the CalendarApp client component.
 *
 * The calendar shows the next 30 days as a 7-column grid colored by
 * the dominant (peak) Atlas pattern each day. Clicking a day opens a
 * detail panel showing which patterns are activated, why (the transit
 * reason), the intensity, and a preparation prompt.
 *
 * Design system: bg #050505, gold #c9a96e, text #f0eee9/#9a9a9a/#7a7a7a,
 * no blue/indigo. Cinzel for pattern names + weekday headers, mono for
 * date numbers, Playfair italic for prompts and reasons.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pattern Calendar — AstroKalki",
  description:
    "A 30-day forecast of when your patterns are likely to surface — based on upcoming transits against your birth chart. A planning tool, not a prediction.",
  alternates: { canonical: "https://astrokalki.com/pattern-calendar" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Pattern Calendar — AstroKalki",
    description:
      "A 30-day forecast of when your patterns are likely to surface. Members only.",
    type: "website",
    url: "https://astrokalki.com/pattern-calendar",
    siteName: "AstroKalki",
  },
};

export default async function PatternCalendarPage() {
  // ─── Auth gate ─────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    redirect("/account");
  }
  const email = session.user.email;
  const name = session.user.name || email.split("@")[0];

  // ─── Fetch the 30-day forecast (cached 1 hour server-side) ────────────
  // The helper loads the user's latest BirthChart and computes the
  // forecast. If the cache is warm (within 1 hour), it returns the
  // cached result; otherwise it recomputes (~1.5s).
  const forecast = await getForecastForUser(email).catch((err) => {
    console.error("[pattern-calendar] forecast failed:", err);
    return null;
  });

  // Graceful fallback: if the forecast couldn't be computed, render an
  // empty state instead of crashing the page. The CalendarApp handles
  // the empty-forecast case with a friendly message.
  if (!forecast) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
        <header className="border-b border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
            <div className="mb-8">
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "Account", href: "/account" },
                  { label: "Pattern Calendar" },
                ]}
              />
            </div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
              Pattern Calendar
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
              The 30-day forecast,{" "}
              <span className="text-[#c9a96e] italic">{name}</span>.
            </h1>
            <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
              The pattern calendar couldn&apos;t be computed right now.
              Please refresh in a moment — the ephemeris is sometimes
              briefly unavailable.
            </p>
          </div>
        </header>
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Account", href: "/account" },
                { label: "Pattern Calendar" },
              ]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Pattern Calendar
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            The 30-day forecast,{" "}
            <span className="text-[#c9a96e] italic">{name}</span>.
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            A planning tool. Upcoming transits against your birth chart
            show which patterns are likely to surface, when, and why — so
            you can prepare rather than be ambushed. Not prediction.
            Pattern weather.
          </p>
        </div>
      </header>

      <CalendarApp
        initialForecast={forecast.forecast}
        initialHasNatalChart={forecast.hasNatalChart}
        initialGeneratedAt={forecast.generatedAt}
        name={name}
      />
    </>
  );
}
