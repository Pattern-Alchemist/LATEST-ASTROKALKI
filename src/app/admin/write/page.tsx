import Link from "next/link";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
import ArticleWriter from "./ArticleWriter";

/**
 * /admin/write — AI writing assistant for drafting new articles.
 *
 * Server component (admin-gated by middleware). Renders the page shell
 * matching /admin/leads + /admin/availability design language, then
 * delegates all interaction to ArticleWriter (client component).
 *
 * The assistant lets AstroKalki enter a topic + key points + optional
 * cluster, then POSTs to /api/ai/draft which calls the LLM with a writing
 * prompt built by /src/lib/ai/writing-prompt.ts. The LLM returns a
 * structured JSON draft matching the site's AI-search-optimization
 * structure (concise answer, key takeaways, body, FAQ, references,
 * author bio, related-service CTA). The draft preview supports inline
 * editing of every section before download-as-markdown.
 *
 * Design system: #050505 bg, gold #c9a96e accent, Cinzel/editorial
 * labels, Playfair serif headlines, NO blue/indigo. Matches /admin/leads.
 */

export default function AdminWritePage() {
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
            <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
              <PenLine className="size-3" />
              <span className="hidden sm:inline">AI Writer</span>
              <span className="text-[#c9a96e]/60">·</span>
              <span className="text-[#c9a96e]/70">10 drafts / hour</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        {/* Title block */}
        <div className="mb-10 sm:mb-14">
          <div className="w-12 h-px bg-[#c9a96e]/40 mb-6" />
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4 font-light flex items-center gap-2">
            <Sparkles className="size-3" />
            Admin · AI Writer
          </p>
          <h1 className="text-editorial text-3xl sm:text-5xl text-[#f0eee9] tracking-[-0.02em] mb-4">
            Draft a new article
          </h1>
          <p className="text-body-cinematic text-sm sm:text-base text-[#9a9a9a] max-w-2xl leading-relaxed">
            Enter a topic and a few key points. The assistant drafts a
            structured long-form article in the AstroKalki voice — concise
            answer for AI Overviews, 5 key takeaways, 1500+ word body, 5
            FAQs, 4 academic references, author bio, and a related-service
            CTA. Every section is inline-editable before you download the
            draft as markdown.
          </p>
        </div>

        <ArticleWriter />

        {/* Footer note */}
        <footer className="mt-16 pt-8 border-t border-white/[0.04]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] font-light">
            Voice contract — direct, psychologically precise, second-person.
            Banned: karmic, cosmic, destiny, reveal, unlock, hidden wisdom.
            The model is instructed to refuse these; a defense-in-depth pass
            strips any that slip through.
          </p>
        </footer>
      </main>
    </div>
  );
}
