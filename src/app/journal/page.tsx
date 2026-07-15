import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import JournalApp from "./JournalApp";
import type { JournalEntryDTO, Mood } from "./types";
import type { CheckInResult } from "./JournalCheckIn";
import type { TransitData } from "@/lib/astrology/transits";
import type { PatternActivation } from "@/lib/astrology/pattern-activation";
import {
  extractJournalPrompt,
  stripPromptLine,
} from "@/lib/ai/transit-prompt";

/**
 * /journal — the Pattern Journal.
 *
 * Auth-gated: if there is no NextAuth session, redirect to /account (the
 * member-portal sign-in page). Once signed in, the page server-fetches the
 * user's last 30 days of journal entries and passes them to the JournalApp
 * client component, which owns the live state (selected entry, refresh
 * after save, etc).
 *
 * Also pre-fetches the user's most recent UserTransit check-in from
 * today (if any) so the daily check-in section renders populated on
 * first paint — no client-side fetch needed for the common case.
 *
 * The journal is a daily-use tool — the design is intentionally calm,
 * spacious, and editorial, matching the rest of the AstroKalki dark theme.
 *
 * Design system: bg #050505, gold #c9a96e + derivatives, text
 * #f0eee9/#9a9a9a/#7a7a7a, no blue/indigo anywhere.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pattern Journal — AstroKalki",
  description:
    "A daily emotional weather log. Five quiet minutes a day. Over time, the patterns you can't see in any single day surface on their own.",
  alternates: { canonical: "https://astrokalki.com/journal" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Pattern Journal — AstroKalki",
    description:
      "Daily emotional logging with weekly AI-surfaced pattern insights. Members only.",
    type: "website",
    url: "https://astrokalki.com/journal",
    siteName: "AstroKalki",
  },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function JournalPage() {
  // ─── Auth gate ─────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    redirect("/account");
  }
  const email = session.user.email;
  const name = session.user.name || null;

  // ─── Fetch last 30 days of entries (server-side, direct DB read) ───────
  // We bypass the /api/journal route to avoid a cookie-forwarded fetch
  // round-trip — this is the same pattern the /account page uses for its
  // membership/bookings data.
  const from = new Date(Date.now() - THIRTY_DAYS_MS);
  const [rows, latestCheckInRow] = await Promise.all([
    db.journalEntry
      .findMany({
        where: {
          email,
          date: { gte: from },
        },
        orderBy: { date: "desc" },
        take: 500,
      })
      .catch(() => []),
    // ─── Latest UserTransit check-in for today (if any) ────────────────
    // Pre-fetches the member's most recent check-in. If it's from today
    // (UTC), we pass it to JournalApp as `initialCheckIn` so the daily
    // check-in section renders populated on first paint. Older check-ins
    // are ignored — the rate limit only allows one per day, so the user
    // can re-run if their last one is from yesterday.
    db.userTransit
      .findFirst({
        where: { email },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null),
  ]);

  const entries: JournalEntryDTO[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    date: r.date.toISOString(),
    mood: r.mood as Mood,
    energy: r.energy,
    trigger: r.trigger,
    pattern: r.pattern,
    note: r.note,
    insight: r.insight,
    createdAt: r.createdAt.toISOString(),
  }));

  // ─── Resolve today's check-in (if from today UTC) ─────────────────────
  let initialCheckIn: CheckInResult | null = null;
  if (latestCheckInRow) {
    const checkInDate = new Date(latestCheckInRow.createdAt);
    const todayUtc = new Date();
    const sameUtcDay =
      checkInDate.getUTCFullYear() === todayUtc.getUTCFullYear() &&
      checkInDate.getUTCMonth() === todayUtc.getUTCMonth() &&
      checkInDate.getUTCDate() === todayUtc.getUTCDate();
    if (sameUtcDay) {
      try {
        const transits = JSON.parse(
          latestCheckInRow.transitData,
        ) as TransitData;
        const activations = JSON.parse(
          latestCheckInRow.patternActivation ?? "[]",
        ) as PatternActivation[];
        const rawInsight = latestCheckInRow.insight ?? "";
        const journalPrompt = extractJournalPrompt(rawInsight) ?? "";
        const insightBody = stripPromptLine(rawInsight);
        if (transits?.planets?.Sun?.signName) {
          initialCheckIn = {
            transits,
            patternActivations: activations,
            insight: insightBody,
            journalPrompt,
            // We can't know from the DB alone whether the user had a
            // birth chart at check-in time. Default to true; the UI
            // uses this only for a small caption.
            hasNatalChart: true,
          };
        }
      } catch {
        // Malformed JSON in DB — silently drop, the user can re-run.
        initialCheckIn = null;
      }
    }
  }

  return (
    <JournalApp
      initialEntries={entries}
      email={email}
      name={name}
      initialCheckIn={initialCheckIn}
    />
  );
}
