import Link from "next/link";
import { ArrowLeft, RefreshCw, Star, Mail, Clock, BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import TestimonialActions from "./TestimonialActions";

/**
 * /admin/testimonials — moderation queue.
 *
 * Server component. Reads `?status=` query param (pending | approved |
 * rejected | all) and queries the DB directly. Tabs are Link components so
 * navigation between statuses is server-rendered (no client state, no flash).
 *
 * The action buttons (Approve / Reject / Feature / Delete) are a client
 * component (TestimonialActions). After a PATCH/DELETE the client calls
 * router.refresh() so this server component re-renders with the updated
 * data — newly-approved items leave the pending queue immediately.
 *
 * Visual language matches /admin/leads and /admin/patterns:
 *   - dark cards on #050505 bg
 *   - gold #c9a96e accent
 *   - monospace IDs
 *   - text-link-style buttons (no boxed buttons)
 */

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const TABS: { id: StatusFilter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const PATTERN_LABELS: Record<string, string> = {
  "abandonment-loop": "Abandonment Loop",
  "control-pattern": "Control Pattern",
  "people-pleasing": "People-Pleasing",
  "emotional-numbness": "Emotional Numbness",
  overthinking: "Overthinking",
  "self-doubt": "Self-Doubt",
  other: "Other",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-yellow-400/80",
  approved: "bg-emerald-400/80",
  rejected: "bg-red-400/60",
};

function prettyPattern(raw: string | null): string | null {
  if (!raw) return null;
  return PATTERN_LABELS[raw] || raw;
}

function formatDate(iso: Date | string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TestimonialRow {
  id: string;
  quote: string;
  context: string;
  initials: string;
  detail: string | null;
  email: string | null;
  pattern: string | null;
  featured: boolean;
  order: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  verified?: boolean;
  verifiedBookingId?: string | null;
  verifiedAt?: Date | null;
}

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusParam = (sp.status || "pending") as StatusFilter;
  const activeTab: StatusFilter = TABS.some((t) => t.id === statusParam)
    ? statusParam
    : "pending";

  // ─── Direct DB query (server component, no fetch roundtrip needed) ────
  const where = activeTab === "all" ? {} : { status: activeTab };

  let testimonials: TestimonialRow[] = [];
  let counts: Record<StatusFilter, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  };

  try {
    const [rows, pending, approved, rejected, total] = await Promise.all([
      db.testimonial.findMany({
        where,
        orderBy: [
          { order: "asc" },
          { createdAt: activeTab === "pending" ? "asc" : "desc" },
        ],
        take: 200,
      }),
      db.testimonial.count({ where: { status: "pending" } }),
      db.testimonial.count({ where: { status: "approved" } }),
      db.testimonial.count({ where: { status: "rejected" } }),
      db.testimonial.count(),
    ]);

    // ─── Fetch VerifiedReview rows for these testimonials ──────────
    // There's no Prisma @relation between Testimonial and VerifiedReview,
    // so we resolve the link here and attach a `verified` boolean (plus
    // the linked bookingId + verifiedAt for display in the admin UI).
    // Empty `in: []` would crash Prisma, so guard with .length.
    const ids = rows.map((t) => t.id);
    const verifiedReviews = ids.length
      ? await db.verifiedReview.findMany({
          where: { testimonialId: { in: ids } },
          select: { testimonialId: true, bookingId: true, verifiedAt: true },
        })
      : [];
    const verifiedByTestimonial = new Map(
      verifiedReviews.map((v) => [v.testimonialId, v])
    );

    testimonials = rows.map((t) => {
      const v = verifiedByTestimonial.get(t.id);
      return {
        ...(t as TestimonialRow),
        verified: Boolean(v),
        verifiedBookingId: v ? (v as any)?.bookingId ?? null : null,
        verifiedAt: v ? (v as any)?.verifiedAt ?? null : null,
      };
    });
    counts = {
      pending,
      approved,
      rejected,
      all: total,
    };
  } catch (err) {
    console.error("Admin testimonials page query error:", err);
  }

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
              href="/admin/testimonials"
              className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="size-3" />
              <span className="hidden sm:inline">Refresh</span>
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
            Admin · Testimonials
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Moderation queue
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Public submissions arrive as <span className="text-[#c9a96e]">pending</span>.
            Approve to publish, feature to surface on the homepage, reject to keep
            the audit trail without displaying. Email is the submitter&apos;s reply
            address — never shown publicly.
          </p>
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-8 border-b border-white/[0.06] overflow-x-auto">
          {TABS.map((t) => {
            const count = counts[t.id];
            const isActive = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={`/admin/testimonials?status=${t.id}`}
                className={`px-4 py-3 text-[11px] tracking-[0.25em] uppercase font-light transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "border-[#c9a96e] text-[#c9a96e]"
                    : "border-transparent text-[#7a7a7a] hover:text-[#f0eee9]"
                }`}
              >
                {t.label}
                <span
                  className={`ml-1 text-[10px] ${isActive ? "text-[#c9a96e]" : "text-[#5a5a5a]"}`}
                >
                  ({count})
                </span>
              </Link>
            );
          })}
        </div>

        {/* ─── Cards ────────────────────────────────────────────── */}
        {testimonials.length === 0 ? (
          <div className="border border-white/[0.04] bg-[#0a0a0a]/40 py-20 text-center">
            <Star className="size-8 text-[#333] mx-auto mb-3" />
            <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed">
              {activeTab === "pending"
                ? "No pending testimonials. New public submissions will appear here for review."
                : activeTab === "approved"
                  ? "No approved testimonials yet. Approve a pending submission to see it here."
                  : activeTab === "rejected"
                    ? "No rejected testimonials. Rejected items are kept here for audit before permanent deletion."
                    : "No testimonials in the database yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((t) => (
              <article
                key={t.id}
                className="border border-white/[0.04] bg-[#0a0a0a]/40 hover:border-white/[0.08] transition-colors duration-500 p-6 sm:p-8"
              >
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] tracking-[0.2em] uppercase font-light">
                  <span
                    className={`inline-flex items-center gap-1.5 ${t.status === "pending" ? "text-yellow-400/80" : t.status === "approved" ? "text-emerald-400/80" : "text-red-400/60"}`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${STATUS_DOT[t.status] || "bg-white/30"}`}
                    />
                    {t.status}
                  </span>
                  {t.featured && (
                    <span className="inline-flex items-center gap-1 text-[#c9a96e]">
                      <Star className="size-3 fill-[#c9a96e]" />
                      Featured
                    </span>
                  )}
                  {t.verified && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[#c9a96e] border border-[#c9a96e]/40 px-2 py-0.5 rounded"
                      title={`This testimonial is linked to a verified completed session (booking ${t.verifiedBookingId ?? "—"}, verified ${t.verifiedAt ? formatDate(t.verifiedAt) : "—"})`}
                    >
                      <BadgeCheck
                        className="size-3"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span
                        className="text-[9px] tracking-[0.2em] uppercase"
                        style={{ fontFamily: "Cinzel, Georgia, serif" }}
                      >
                        Verified Session
                      </span>
                    </span>
                  )}
                  <span className="text-[#5a5a5a] font-mono normal-case tracking-normal">
                    {t.id}
                  </span>
                  <span className="text-[#5a5a5a] inline-flex items-center gap-1 normal-case tracking-wider">
                    <Clock className="size-3" />
                    {formatDate(t.createdAt)}
                  </span>
                </div>

                {/* Quote */}
                <blockquote className="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light italic font-serif mb-5 pl-4 border-l border-[#c9a96e]/30">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Submitter info row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-light mb-5 pb-5 border-b border-white/[0.04]">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1">
                      Initials
                    </p>
                    <p className="text-[#f0eee9]">{t.initials}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1">
                      Context
                    </p>
                    <p className="text-[#9a9a9a]">{t.context}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1">
                      Pattern
                    </p>
                    <p className="text-[#9a9a9a]">
                      {prettyPattern(t.pattern) || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a] mb-1">
                      Email
                    </p>
                    {t.email ? (
                      <a
                        href={`mailto:${t.email}?subject=Re: Your AstroKalki testimonial`}
                        className="text-[#c9a96e] hover:text-[#f0eee9] inline-flex items-center gap-1 transition-colors"
                      >
                        <Mail className="size-3" />
                        Reply
                      </a>
                    ) : (
                      <span className="text-[#5a5a5a]">—</span>
                    )}
                  </div>
                </div>

                {/* Action row */}
                <TestimonialActions
                  id={t.id}
                  currentStatus={
                    t.status as "pending" | "approved" | "rejected"
                  }
                  featured={t.featured}
                />
              </article>
            ))}
          </div>
        )}

        {/* Footer help */}
        <div className="mt-12 pt-8 border-t border-white/[0.04]">
          <p className="text-[11px] text-[#5a5a5a] leading-relaxed max-w-2xl">
            <span className="text-[#c9a96e]">Tip:</span> Public submissions appear
            with status <span className="text-[#cfcabf]">pending</span>. Approving
            moves them to <span className="text-[#cfcabf]">approved</span> but does
            not surface them on /testimonials unless you also mark them{" "}
            <span className="text-[#cfcabf]">featured</span>. Rejecting keeps the
            audit trail — use Delete only for spam or duplicates.
          </p>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-body-cinematic text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase">
            AstroKalki · Testimonials Moderation
          </p>
          <Link
            href="/admin"
            className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3" />
            Back to admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
