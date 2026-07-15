import Link from "next/link";
import { ArrowLeft, RefreshCw, Plus, FileText, Eye, EyeOff } from "lucide-react";
import { db } from "@/lib/db";
import { ATLAS_PATTERNS, getAtlasPattern } from "@/lib/content/patterns/atlas";
import CaseStudyEditor, { type CaseStudyInitial } from "./CaseStudyEditor";

/**
 * /admin/case-studies — CRUD interface for long-form case studies.
 *
 * Server component. Reads `?edit=ID` or `?new=1` query param to decide
 * whether to render the list view or the inline editor.
 *
 * Visual language matches /admin/testimonials and /admin/leads:
 *   - dark cards on #050505 bg
 *   - gold #c9a96e accent
 *   - monospace IDs
 *   - text-link-style buttons
 *   - Cinzel for section labels
 */

const PATTERN_LABELS: Record<string, string> = Object.fromEntries(
  ATLAS_PATTERNS.map((p) => [p.slug, p.name])
);

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

interface AdminCaseStudiesPageProps {
  searchParams: Promise<{ edit?: string; new?: string }>;
}

export default async function AdminCaseStudiesPage({
  searchParams,
}: AdminCaseStudiesPageProps) {
  const sp = await searchParams;
  const editId = sp.edit;
  const isNew = sp.new === "1";

  // ─── Editor mode ───────────────────────────────────────────────────
  if (isNew) {
    return (
      <AdminShell>
        <CaseStudyEditor mode="new" />
      </AdminShell>
    );
  }

  if (editId) {
    let initial: CaseStudyInitial | null = null;
    try {
      const cs = await db.caseStudy.findUnique({ where: { id: editId } });
      if (cs) {
        initial = {
          id: cs.id,
          slug: cs.slug,
          title: cs.title,
          pattern: cs.pattern,
          clientInitials: cs.clientInitials,
          clientAge: cs.clientAge,
          consentGiven: cs.consentGiven,
          problem: cs.problem,
          patternSection: cs.patternSection,
          session: cs.session,
          shift: cs.shift,
          published: cs.published,
        };
      }
    } catch (err) {
      console.error("Admin case-studies edit fetch failed:", err);
    }

    if (!initial) {
      return (
        <AdminShell>
          <div className="border border-white/[0.04] bg-[#0a0a0a]/40 py-20 text-center">
            <p className="text-[#5a5a5a] text-sm font-light mb-4">
              Case study not found.
            </p>
            <Link
              href="/admin/case-studies"
              className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] hover:text-[#f0eee9] transition-colors"
            >
              ← Back to list
            </Link>
          </div>
        </AdminShell>
      );
    }

    return (
      <AdminShell>
        <CaseStudyEditor mode="edit" initial={initial} />
      </AdminShell>
    );
  }

  // ─── List mode ─────────────────────────────────────────────────────
  let caseStudies: Array<{
    id: string;
    slug: string;
    title: string;
    pattern: string;
    clientInitials: string;
    clientAge: number | null;
    consentGiven: boolean;
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
    problem: string;
  }> = [];
  let totalPublished = 0;
  let totalDrafts = 0;

  try {
    const [rows, pub, drafts] = await Promise.all([
      db.caseStudy.findMany({
        orderBy: [{ published: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          pattern: true,
          clientInitials: true,
          clientAge: true,
          consentGiven: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          problem: true,
        },
      }),
      db.caseStudy.count({ where: { published: true } }),
      db.caseStudy.count({ where: { published: false } }),
    ]);
    caseStudies = rows;
    totalPublished = pub;
    totalDrafts = drafts;
  } catch (err) {
    console.error("Admin case-studies list query failed:", err);
  }

  return (
    <AdminShell
      headerRight={
        <Link
          href="/admin/case-studies?new=1"
          className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5"
          title="Create a new anonymised client journey"
        >
          <Plus className="size-3" />
          <span className="hidden sm:inline">New case study</span>
        </Link>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCell label="Total" value={caseStudies.length} />
        <SummaryCell label="Published" value={totalPublished} accent />
        <SummaryCell label="Drafts" value={totalDrafts} />
        <SummaryCell
          label="Patterns covered"
          value={new Set(caseStudies.map((c) => c.pattern)).size}
        />
      </div>

      {/* List */}
      {caseStudies.length === 0 ? (
        <div className="border border-white/[0.04] bg-[#0a0a0a]/40 py-20 text-center">
          <FileText className="size-8 text-[#333] mx-auto mb-3" />
          <p className="text-[#5a5a5a] text-sm font-light max-w-md mx-auto leading-relaxed mb-6">
            No case studies yet. Visit <code className="text-[#c9a96e]">/case-studies</code> to
            trigger the initial seed (3 anonymised journeys), or create one from
            scratch.
          </p>
          <Link
            href="/admin/case-studies?new=1"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-4 py-2 hover:bg-[#c9a96e]/10 transition-colors"
          >
            <Plus className="size-3.5" />
            New case study
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {caseStudies.map((cs) => {
            const patternName = PATTERN_LABELS[cs.pattern] || cs.pattern;
            const patternMeta = getAtlasPattern(cs.pattern);
            const excerpt = cs.problem.slice(0, 200).trim();
            return (
              <article
                key={cs.id}
                className="border border-white/[0.04] bg-[#0a0a0a]/40 hover:border-white/[0.08] transition-colors duration-500 p-6 sm:p-8"
              >
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] tracking-[0.2em] uppercase font-light">
                  {cs.published ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400/80">
                      <Eye className="size-3" />
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-yellow-400/80">
                      <EyeOff className="size-3" />
                      Draft
                    </span>
                  )}
                  <span className="text-[#c9a96e]">{patternName}</span>
                  <span className="text-[#5a5a5a]">·</span>
                  <span className="text-[#9a9a9a]">
                    {cs.clientInitials}
                    {cs.clientAge !== null ? `, ${cs.clientAge}` : ""}
                  </span>
                  {cs.consentGiven && (
                    <>
                      <span className="text-[#5a5a5a]">·</span>
                      <span className="text-[#7a7a7a]">Consent ✓</span>
                    </>
                  )}
                  <span className="text-[#5a5a5a] font-mono normal-case tracking-normal ml-auto">
                    {cs.id}
                  </span>
                </div>

                {/* Title + excerpt */}
                <h2 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-2">
                  {cs.title}
                </h2>
                {patternMeta && (
                  <p className="text-xs text-[#c9a96e]/70 italic font-serif mb-3">
                    {patternMeta.tagline}
                  </p>
                )}
                <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] line-clamp-2 mb-4">
                  {excerpt}…
                </p>

                {/* Footer row: timestamps + actions */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-white/[0.04]">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                    Updated {formatDate(cs.updatedAt)}
                  </span>
                  <div className="ml-auto flex items-center gap-4">
                    <Link
                      href={`/admin/case-studies?edit=${cs.id}`}
                      className="text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] hover:text-[#f0eee9] border-b border-transparent hover:border-current pb-0.5 transition-colors"
                    >
                      Edit →
                    </Link>
                    {cs.published && (
                      <Link
                        href={`/case-studies/${cs.slug}`}
                        target="_blank"
                        className="text-[10px] tracking-[0.25em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] border-b border-transparent hover:border-current pb-0.5 transition-colors"
                      >
                        View live
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer help */}
      <div className="mt-12 pt-8 border-t border-white/[0.04]">
        <p className="text-[11px] text-[#5a5a5a] leading-relaxed max-w-2xl">
          <span className="text-[#c9a96e]">Tip:</span> Case studies are deep
          trust signals — they demonstrate the method in practice through
          specificity, not vague praise. Always anonymise: first-initial + age
          only, identifying details changed, and only publish with the
          client&apos;s explicit consent. Unpublished drafts are still visible
          here and at <code className="text-[#c9a96e]">/api/admin/case-studies</code> but never
          on the public site.
        </p>
      </div>
    </AdminShell>
  );
}

// ─── Layout shell (matches /admin/testimonials header structure) ────────

function AdminShell({
  children,
  headerRight,
}: {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f0eee9] flex flex-col">
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
            <div className="flex items-center gap-3">
              {headerRight}
              <Link
                href="/admin/case-studies"
                className="btn-outline-gold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5"
                title="Refresh list"
              >
                <RefreshCw className="size-3" />
                <span className="hidden sm:inline">Refresh</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        <div className="mb-10 sm:mb-14">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p
            className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light"
            style={{ fontFamily: "Cinzel, Georgia, serif" }}
          >
            Admin · Case Studies
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Long-form client journeys
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Anonymised journeys structured as Problem → Pattern → Session →
            Shift. The specificity is the evidence. Only{" "}
            <span className="text-[#c9a96e]">published</span> case studies
            appear on the public <code className="text-[#cfcabf]">/case-studies</code> hub.
          </p>
        </div>
        {children}
      </main>

      <footer className="mt-auto border-t border-white/[0.04] bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-body-cinematic text-[11px] text-[#5a5a5a] tracking-[0.15em] uppercase"
            style={{ fontFamily: "Cinzel, Georgia, serif" }}
          >
            AstroKalki · Case Studies
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

function SummaryCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="border border-white/[0.04] bg-[#0a0a0a]/40 px-5 py-4">
      <p
        className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-2 font-light"
        style={{ fontFamily: "Cinzel, Georgia, serif" }}
      >
        {label}
      </p>
      <p
        className={`text-3xl font-serif font-light ${
          accent ? "text-[#c9a96e]" : "text-[#f0eee9]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
