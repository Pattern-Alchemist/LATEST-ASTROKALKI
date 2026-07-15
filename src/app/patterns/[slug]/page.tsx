import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PILLAR_ARTICLES, PILLAR_BY_SLUG, type PillarArticleSeed } from "@/lib/pillar-seed";
import type { Metadata } from "next";

/**
 * Pillar article page — long-form essay for each emotional pattern.
 * Seeded from /src/lib/pillar-seed.ts on first access, then editable via DB.
 *
 * SEO structure:
 *   - <h1> = article title
 *   - <h2> = section headings from markdown ##
 *   - Meta description from seed
 *   - Article schema JSON-LD
 *   - Pattern-specific OG image
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render the 6 known slugs at build time
export async function generateStaticParams() {
  return PILLAR_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const seed = PILLAR_BY_SLUG[slug];
  if (!seed) return { title: "Pattern not found — AstroKalki" };

  return {
    title: `${seed.title} — AstroKalki`,
    description: seed.metaDescription,
    alternates: { canonical: `https://astrokalki.com/patterns/${slug}` },
    openGraph: {
      title: seed.title,
      description: seed.metaDescription,
      type: "article",
      url: `https://astrokalki.com/patterns/${slug}`,
      images: [{ url: `/api/og?pattern=${seed.patternKey}`, width: 1200, height: 630, alt: seed.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seed.title,
      description: seed.metaDescription,
      images: [`/api/og?pattern=${seed.patternKey}`],
    },
    keywords: [seed.targetKeyword, seed.patternKey.replace(/-/g, " "), "emotional pattern", "astrology"],
  };
}

async function getArticle(slug: string): Promise<PillarArticleSeed | null> {
  const seed = PILLAR_BY_SLUG[slug];
  if (!seed) return null;

  // Try DB first (in case admin has edited). If not in DB, seed it.
  try {
    const existing = await db.pillarArticle.findUnique({ where: { slug } });
    if (existing) {
      return {
        slug: existing.slug,
        patternKey: existing.patternKey,
        title: existing.title,
        subtitle: existing.subtitle,
        metaDescription: existing.metaDescription,
        targetKeyword: existing.targetKeyword,
        readTime: existing.readTime,
        body: existing.body,
      };
    }
    // Seed it
    await db.pillarArticle.create({
      data: {
        slug: seed.slug,
        patternKey: seed.patternKey,
        title: seed.title,
        subtitle: seed.subtitle,
        body: seed.body,
        metaDescription: seed.metaDescription,
        targetKeyword: seed.targetKeyword,
        readTime: seed.readTime,
      },
    });
  } catch (err) {
    // If DB fails (e.g. SQLite busy), fall back to seed content — the user
    // still gets the article.
    console.error("[pillar] DB error, falling back to seed:", err);
  }

  return seed;
}

// Minimal markdown → HTML renderer. Handles: #, ##, ###, -, >, **bold**, [text](url),
// paragraph breaks, horizontal rules (---).
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inBlockquote = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const raw of lines) {
    const line = raw;

    if (line.trim() === "") {
      closeList();
      closeBlockquote();
      continue;
    }

    if (line.trim() === "---") {
      closeList();
      closeBlockquote();
      out.push('<hr class="border-white/[0.08] my-12" />');
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      closeList();
      closeBlockquote();
      out.push(`<h3 class="text-xl sm:text-2xl font-serif text-[#f0eee9] mt-10 mb-4 font-light tracking-[-0.01em]">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      closeBlockquote();
      out.push(`<h2 class="text-2xl sm:text-3xl font-serif text-[#c9a96e] mt-14 mb-6 font-light tracking-[-0.015em]">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      closeBlockquote();
      out.push(`<h1 class="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">${inline(line.slice(2))}</h1>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      closeList();
      if (!inBlockquote) {
        out.push('<blockquote class="border-l-2 border-[#c9a96e]/40 pl-6 my-8 italic text-[#cfcabf] font-serif text-lg">');
        inBlockquote = true;
      }
      out.push(`<p class="mb-2">${inline(line.slice(2))}</p>`);
      continue;
    }

    // List item
    if (line.startsWith("- ")) {
      closeBlockquote();
      if (!inList) {
        out.push('<ul class="list-none space-y-3 my-6 pl-1">');
        inList = true;
      }
      out.push(`<li class="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light flex gap-3"><span class="text-[#c9a96e] shrink-0">—</span><span>${inline(line.slice(2))}</span></li>`);
      continue;
    }

    // Numbered list item (1. 2. 3.)
    if (/^\d+\.\s/.test(line)) {
      closeBlockquote();
      if (!inList) {
        out.push('<ul class="list-none space-y-3 my-6 pl-1">');
        inList = true;
      }
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        out.push(`<li class="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light flex gap-3"><span class="text-[#c9a96e] shrink-0 font-mono text-sm pt-2">${match[1]}.</span><span>${inline(match[2])}</span></li>`);
      }
      continue;
    }

    // Paragraph
    closeList();
    closeBlockquote();
    out.push(`<p class="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light my-5">${inline(line)}</p>`);
  }
  closeList();
  closeBlockquote();

  return out.join("\n");
}

function inline(text: string): string {
  // Bold
  let out = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#f0eee9] font-normal">$1</strong>');
  // Italic — careful, single * could be a list bullet but we already handled those
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
  // Links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-[#c9a96e] underline decoration-[#c9a96e]/40 hover:decoration-[#c9a96e] underline-offset-4 transition-colors">$1</a>'
  );
  return out;
}

export default async function PillarArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  // Find next pattern's article for "Continue reading" CTA
  const idx = PILLAR_ARTICLES.findIndex((a) => a.slug === slug);
  const next = PILLAR_ARTICLES[(idx + 1) % PILLAR_ARTICLES.length];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    author: { "@type": "Organization", name: "AstroKalki" },
    publisher: { "@type": "Organization", name: "AstroKalki" },
    keywords: article.targetKeyword,
    articleSection: "Psychology",
    inLanguage: "en",
  };

  return (
    <article className="min-h-screen bg-[#050505] text-[#f0eee9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Header */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
          <a
            href="/"
            className="text-[11px] tracking-[0.3em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors block mb-8"
          >
            ← AstroKalki
          </a>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 mb-6 font-light">
            Pattern · {article.readTime} min read
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {article.title}
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.6] max-w-2xl">
            {article.subtitle}
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-16">
        <div
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
        />

        {/* Footer CTA — soft, not pushy */}
        <div className="mt-20 pt-10 border-t border-white/[0.06] text-center">
          <p className="text-[#9a9a9a] text-base leading-[1.8] font-light mb-8 max-w-md mx-auto">
            This is one of six patterns. The micro-reading will tell you which one is yours.
          </p>
          <a
            href="/#micro-reading"
            className="inline-flex items-center gap-4 text-[11px] tracking-[0.3em] uppercase text-[#f0eee9] border-b border-[#c9a96e]/50 pb-3 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-500"
          >
            Take the micro-reading
            <span className="text-[#c9a96e]">→</span>
          </a>
        </div>

        {/* Continue reading */}
        <div className="mt-16 pt-10 border-t border-white/[0.06]">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
            Continue reading
          </p>
          <a
            href={`/patterns/${next.slug}`}
            className="block group"
          >
            <p className="text-[#c9a96e] text-sm font-serif font-light italic mb-1">{next.patternKey.replace(/-/g, " ")}</p>
            <p className="text-[#f0eee9] text-xl font-serif font-light tracking-[-0.01em] group-hover:text-[#c9a96e] transition-colors">
              {next.title} →
            </p>
          </a>
        </div>
      </div>
    </article>
  );
}
