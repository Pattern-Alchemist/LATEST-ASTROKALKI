import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import AiChat from "@/components/astrokalki/ai-chat";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * /ask-astrokalki — the full-page "Ask AstroKalki" member-only AI chat.
 *
 * Auth-gated via getServerSession. If the visitor is not signed in, redirect
 * to /account (which renders the magic-link sign-in form). This is the
 * premium chat experience — full-screen, with a conversation sidebar,
 * markdown rendering, and the same AstroKalki dark editorial design system.
 *
 * The embedded variant lives on /account; this is the dedicated page for
 * members who want a focused, full-viewport chat.
 *
 * URL params:
 *   ?c=<conversationId>  → load a specific conversation on mount (deep link).
 *
 * The page is server-rendered only to do the auth check + render the shell.
 * The actual chat UX is the <AiChat variant="full" /> client component.
 */

export const metadata: Metadata = {
  title: "Ask AstroKalki — AI Pattern Recognition",
  description:
    "An AI assistant trained on the 10 Atlas patterns and 25 essays — available 24/7 for members. Ask about your patterns, relationships, and emotional loops in the AstroKalki voice.",
  alternates: { canonical: "https://astrokalki.com/ask-astrokalki" },
  // Auth-gated page — do not index. The sign-in wall means there's nothing
  // useful for crawlers here anyway.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Ask AstroKalki — AI Pattern Recognition",
    description:
      "An AI assistant trained on the AstroKalki Pattern Atlas. Members-only.",
    type: "website",
    url: "https://astrokalki.com/ask-astrokalki",
    siteName: "AstroKalki",
  },
};

export default async function AskAstroKalkiPage() {
  const session = await getServerSession(authOptions).catch(() => null);

  // ─── Auth gate ────────────────────────────────────────────────────────
  // Redirect to /account (which renders the sign-in form) if not signed in.
  // NextAuth's signIn page config is also /account, so the redirect is
  // consistent — the visitor lands on the form, signs in, and NextAuth
  // bounces them back to /ask-astrokalki via the callbackUrl.
  if (!session?.user?.email) {
    redirect("/account?next=/ask-astrokalki");
  }

  const email = session.user.email;

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 sm:py-12">
          <div className="mb-6">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Account", href: "/account" },
                { label: "Ask AstroKalki" },
              ]}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-3 font-light">
                AI Assistant · Member exclusive
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.1] mb-3">
                Ask AstroKalki.
              </h1>
              <p className="text-base text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
                An AI trained on the 10 Atlas patterns and 25 essays. Ask about
                the loops you can&apos;t break — the voice is direct, second-person,
                no mystical jargon. Not prediction. Pattern recognition.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-5">
              <Link
                href="/account"
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
              >
                <span aria-hidden="true">←</span>
                Account
              </Link>
              <a
                href="/patterns/atlas"
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
              >
                Pattern Atlas
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Chat ────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-8 sm:py-10 flex flex-col">
        {/* Suspense boundary required because AiChat uses useSearchParams
            (Next.js 16 static-render guard for ?c=<id> deep links). */}
        <Suspense
          fallback={
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-lg h-[calc(100vh-9rem)] min-h-[600px] flex items-center justify-center">
              <div className="text-center">
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-3 font-light">
                  Loading chat
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]/60 animate-pulse"
                      style={{
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <AiChat
            isAuthenticated
            email={email}
            variant="full"
          />
        </Suspense>
      </div>

      {/* ─── Footer note ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] mt-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] text-[#5a5a5a] font-light leading-relaxed max-w-xl">
            Ask AstroKalki is a pattern-recognition assistant, not a therapist,
            not a prediction engine. If you are in crisis, please reach out to a
            professional — iCall (9152987821) or AASRA (9820466726) in India.
          </p>
          <p className="text-[10px] text-[#3a3a3a] font-mono shrink-0">
            20 messages / hour · {email}
          </p>
        </div>
      </footer>
    </main>
  );
}
