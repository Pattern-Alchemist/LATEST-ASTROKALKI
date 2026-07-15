import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/security/unsubscribe-token";
import PreferencesForm from "./PreferencesForm";
import RequestLinkForm from "./RequestLinkForm";

export const metadata: Metadata = {
  title: "Email Preferences — AstroKalki",
  description:
    "Manage your email preferences. Choose which emails you receive from AstroKalki, or unsubscribe from everything.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface SearchParams {
  email?: string;
  token?: string;
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const email = params.email?.trim();
  const token = params.token?.trim();

  // Branch 1: valid token → render the preference center.
  if (email && token && (await verifyUnsubscribeToken(email, token))) {
    const normalizedEmail = email.toLowerCase();

    // Load current preferences from DB (if the subscriber exists).
    // If the record doesn't exist (e.g. they were already deleted), default
    // to opted-out=false with all prefs on so the form still renders.
    const record = await db.newsletter.findUnique({
      where: { email: normalizedEmail },
      select: {
        prefSessions: true,
        prefBlog: true,
        prefDrip: true,
        optedOut: true,
      },
    });

    const initial = {
      prefSessions: record?.prefSessions ?? true,
      prefBlog: record?.prefBlog ?? true,
      prefDrip: record?.prefDrip ?? true,
      optedOut: record?.optedOut ?? false,
    };

    return (
      <main id="main-content" className="min-h-screen flex flex-col bg-[#050505] text-[#f0eee9]">
        <SkipLink />
        <div className="flex-1 flex items-start sm:items-center justify-center px-6 sm:px-10 py-20 sm:py-32">
          <div className="w-full max-w-2xl">
            <Link
              href="/"
              className="text-[11px] tracking-[0.4em] uppercase text-[#c9a96e]/70 hover:text-[#c9a96e] transition-colors duration-500 font-light"
            >
              AstroKalki
            </Link>

            <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mt-12 mb-6 font-light">
              Email preferences
            </p>
            <h1 className="text-[#f0eee9] text-3xl sm:text-4xl font-serif font-light leading-[1.1] tracking-[-0.02em] mb-4">
              Email preferences for
              <br />
              <span className="text-[#c9a96e] italic">{normalizedEmail}</span>
            </h1>
            <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.8] max-w-md font-light mb-12">
              Choose which emails reach you. Session-related messages (booking
              confirmations, reminders) will always respect your choices below.
            </p>

            <PreferencesForm
              email={normalizedEmail}
              token={token}
              initial={initial}
            />

            <div className="mt-16 pt-8 border-t border-white/[0.06]">
              <p className="text-[11px] text-[#5a5a5a] font-light leading-relaxed">
                These preferences apply only to AstroKalki emails. You can
                return to this page any time using the link in any email we
                send. The link expires after 30 days — request a fresh one
                below.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Branch 2: missing or invalid token → expired-link view with email form.
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#050505] text-[#f0eee9]">
      <SkipLink />
      <div className="flex-1 flex items-start sm:items-center justify-center px-6 sm:px-10 py-20 sm:py-32">
        <div className="w-full max-w-2xl">
          <Link
            href="/"
            className="text-[11px] tracking-[0.4em] uppercase text-[#c9a96e]/70 hover:text-[#c9a96e] transition-colors duration-500 font-light"
          >
            AstroKalki
          </Link>

          <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mt-12 mb-6 font-light">
            Email preferences
          </p>
          <h1 className="text-[#f0eee9] text-3xl sm:text-4xl font-serif font-light leading-[1.1] tracking-[-0.02em] mb-4">
            This link has expired.
          </h1>
          <p className="text-[#9a9a9a] text-sm sm:text-base leading-[1.8] max-w-md font-light mb-12">
            For your security, preference links expire after 30 days. Enter
            your email below and we will send a fresh link to manage your
            preferences.
          </p>

          <RequestLinkForm initialEmail={email} />

          <div className="mt-16 pt-8 border-t border-white/[0.06]">
            <p className="text-[11px] text-[#5a5a5a] font-light leading-relaxed">
              If you no longer have access to your email but want to be
              removed from our list, reply to any email from us with
              &ldquo;unsubscribe&rdquo; in the subject.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Visually-hidden link that becomes visible on keyboard focus. Lets keyboard
 * and screen-reader users skip straight to the form content. Identical to the
 * SkipLink used on the homepage (see src/app/layout.tsx), inlined here so
 * this standalone page (which doesn't use the global layout's children
 * wrapper) remains accessible.
 */
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#050505] focus:text-[#c9a96e] focus:px-4 focus:py-2 focus:border focus:border-[#c9a96e] focus:text-sm"
    >
      Skip to content
    </a>
  );
}
