import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import AvailabilityControls from "./AvailabilityControls";

/**
 * /admin/availability — Real-time availability controls.
 *
 * Server component (admin-gated by middleware). Renders the page shell
 * matching /admin/leads + /admin/testimonials design language, then
 * delegates all interaction to AvailabilityControls (client component),
 * which fetches the current state from /api/admin/availability and POSTs
 * updates back through the same REST proxy. The proxy forwards to the
 * socket.io mini-service on port 3003, which broadcasts the change to
 * every connected site visitor in real time.
 *
 * Design system: #050505 bg, gold #c9a96e accent, Cinzel/editorial
 * labels, NO blue/indigo. Matches /admin/leads and /admin/testimonials.
 */

export default function AdminAvailabilityPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#050505]/85 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link
              href="/admin"
              className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="size-3.5" />
              Back to /admin
            </Link>
            <Link
              href="/admin/availability"
              className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] flex items-center gap-1.5"
              title="Reload page"
            >
              <Activity className="size-3" />
              Live
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Title block */}
        <div className="mb-10 sm:mb-14">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light">
            Admin · Availability
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Live availability
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Toggle AstroKalki&apos;s real-time status. Every connected visitor
            sees the update within seconds — the homepage hero indicator and
            the booking section line both reflect this state live. Use it to
            signal urgency (&ldquo;in session&rdquo;) or scarcity
            (&ldquo;away, next opening Tuesday&rdquo;).
          </p>
        </div>

        <AvailabilityControls />
      </main>
    </div>
  );
}
