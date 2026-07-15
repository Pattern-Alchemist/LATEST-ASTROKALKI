import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/astrokalki/breadcrumbs";
import SearchBar from "@/components/astrokalki/search-bar";
import { ALL_ARTICLES, getArticlesByCluster, type Article } from "@/lib/content/articles";
import { CLUSTERS, CLUSTER_BY_SLUG } from "@/lib/content/clusters";
import { AUTHOR } from "@/lib/content/author";
import { GUIDES } from "@/lib/content/guides";
import { ATLAS_PATTERNS, type AtlasPattern } from "@/lib/content/patterns/atlas";

/**
 * Blog hub — cluster-based index of all 20 articles.
 *
 * Structure:
 *   - Hero with the editorial premise
 *   - Search bar (GETs /insights?q=...)
 *   - When ?q= is present: search results across 20 articles + 10 atlas patterns
 *   - When no query: cluster-based browsing + long-form guides
 *
 * The search endpoint closes the SearchAction schema dead-end declared in
 * layout.tsx (WebSite → potentialAction → SearchAction → target → urlTemplate
 * `https://astrokalki.com/insights?q={search_term_string}`).
 */

interface ArticleSearchHit {
  kind: "article";
  article: Article;
  /** Why it matched — for result UX clarity */
  matchedField: string;
}

interface PatternSearchHit {
  kind: "pattern";
  pattern: AtlasPattern;
  matchedField: string;
}

type SearchHit = ArticleSearchHit | PatternSearchHit;

interface InsightsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = {
  title: "Insights — AstroKalki",
  description:
    "Long-form essays on emotional pattern recognition, relationship patterns, self-sabotage, identity thresholds, and astrology as a diagnostic tool. Written for people who are trying to understand why the same things keep happening.",
  alternates: { canonical: "https://astrokalki.com/insights" },
  openGraph: {
    title: "AstroKalki Insights — Pattern Recognition for the Emotional Life",
    description:
      "Long-form essays on emotional patterns, repeating relationships, self-sabotage, identity thresholds, and astrology as a diagnostic tool.",
    type: "website",
    url: "https://astrokalki.com/insights",
    siteName: "AstroKalki",
  },
  keywords: [
    "emotional patterns",
    "relationship patterns",
    "self-sabotage",
    "identity crisis",
    "astrology psychology",
    "trauma bond",
    "karmic relationship",
    "shadow work",
  ],
};

/** Case-insensitive contains check on a haystack string. */
function matches(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle);
}

/**
 * Search the 20 articles by title, excerpt, cluster label, target keyword,
 * body, concise answer, key takeaways, and FAQs.
 */
function searchArticles(query: string): ArticleSearchHit[] {
  const q = query.toLowerCase();
  const hits: ArticleSearchHit[] = [];
  for (const article of ALL_ARTICLES) {
    const cluster = CLUSTER_BY_SLUG[article.cluster];
    const clusterLabel = cluster?.title ?? article.cluster;
    let matchedField = "";
    if (matches(article.title, q)) matchedField = "title";
    else if (matches(article.excerpt, q)) matchedField = "excerpt";
    else if (matches(clusterLabel, q)) matchedField = "cluster";
    else if (matches(article.targetKeyword, q)) matchedField = "targetKeyword";
    else if (matches(article.conciseAnswer, q)) matchedField = "concise answer";
    else if (matches(article.body, q)) matchedField = "body";
    else if (article.keyTakeaways.some((k) => matches(k, q))) matchedField = "key takeaways";
    else if (article.faqs.some((f) => matches(f.q, q) || matches(f.a, q))) matchedField = "FAQ";
    if (matchedField) hits.push({ kind: "article", article, matchedField });
  }
  return hits;
}

/** Search the 10 atlas patterns across all structured fields. */
function searchAtlasPatterns(query: string): PatternSearchHit[] {
  const q = query.toLowerCase();
  const hits: PatternSearchHit[] = [];
  for (const pattern of ATLAS_PATTERNS) {
    let matchedField = "";
    if (matches(pattern.name, q)) matchedField = "name";
    else if (matches(pattern.tagline, q)) matchedField = "tagline";
    else if (matches(pattern.targetKeyword, q)) matchedField = "targetKeyword";
    else if (matches(pattern.conciseAnswer, q)) matchedField = "concise answer";
    else if (matches(pattern.metaDescription, q)) matchedField = "meta description";
    else if (matches(pattern.chartSignature, q)) matchedField = "chart signature";
    else if (pattern.symptoms.some((s) => matches(s, q))) matchedField = "symptoms";
    else if (pattern.howItShowsUp.some((s) => matches(s, q))) matchedField = "how it shows up";
    else if (matches(pattern.whereItBegins, q)) matchedField = "where it begins";
    else if (matches(pattern.relationshipImpact, q)) matchedField = "relationship impact";
    else if (matches(pattern.careerImpact, q)) matchedField = "career impact";
    else if (matches(pattern.shadowSide, q)) matchedField = "shadow side";
    else if (matches(pattern.whatPeopleMistakeItFor, q)) matchedField = "what people mistake it for";
    if (matchedField) hits.push({ kind: "pattern", pattern, matchedField });
  }
  return hits;
}

export default async function InsightsHub({ searchParams }: InsightsPageProps) {
  const { q: rawQ } = await searchParams;
  const query = typeof rawQ === "string" ? rawQ.trim() : "";
  const isSearching = query.length > 0;

  const articleHits = isSearching ? searchArticles(query) : [];
  const patternHits = isSearching ? searchAtlasPatterns(query) : [];
  const totalResults = articleHits.length + patternHits.length;

  return (
    <main className="min-h-screen bg-[#050505] text-[#f0eee9]">
      {/* Hero */}
      <header className="border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="mb-8">
            <Breadcrumbs
              items={[{ label: "Home", href: "/" }, { label: "Insights" }]}
            />
          </div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-6 font-light">
            Insights
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">
            {isSearching ? (
              <>
                Search.
              </>
            ) : (
              "The pattern beneath the pattern."
            )}
          </h1>
          <p className="text-lg sm:text-xl text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
            {isSearching ? (
              <>
                Searching {ALL_ARTICLES.length} essays and {ATLAS_PATTERNS.length} atlas patterns for{" "}
                <span className="text-[#c9a96e] font-serif italic">&ldquo;{query}&rdquo;</span>.
              </>
            ) : (
              <>
                Long-form essays on why the same things keep happening — in your relationships, your work, your sense of who you are. Written for people who already sense they are stuck, but haven&apos;t yet seen the pattern from above.
              </>
            )}
          </p>

          {/* Search bar — always visible at the top of /insights */}
          <div className="mt-10 max-w-2xl">
            <SearchBar
              defaultValue={query}
              placeholder="Search patterns, articles, questions..."
            />
            <p className="mt-3 text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a]">
              {isSearching ? (
                <Link
                  href="/insights"
                  className="hover:text-[#c9a96e] transition-colors border-b border-white/[0.08] hover:border-[#c9a96e]/40 pb-0.5"
                >
                  Clear search · Browse all {ALL_ARTICLES.length} essays by cluster
                </Link>
              ) : (
                <>
                  {ALL_ARTICLES.length} essays across {CLUSTERS.length} clusters · {GUIDES.length} long-form guides · {ATLAS_PATTERNS.length} atlas patterns
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      {isSearching ? (
        /* ─────────── Search results view ─────────── */
        <SearchResults
          query={query}
          articleHits={articleHits}
          patternHits={patternHits}
          totalResults={totalResults}
        />
      ) : (
        <>
          {/* Featured guides — citation magnets */}
          <section className="border-b border-white/[0.04] bg-white/[0.015]">
            <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
              <div className="mb-10">
                <div className="flex items-center gap-4 mb-4">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#d4b878]" />
                  <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/80 font-light">
                    Long-form guides
                  </p>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
                  The canonical references.
                </h2>
                <p className="text-base sm:text-lg text-[#9a9a9a] font-light leading-[1.7] max-w-2xl">
                  Three monster essays — 3,000–5,000 words each — that consolidate everything AstroKalki has written on a topic into a single, citation-worthy reference. Start here if you want the complete picture rather than scattered articles.
                </p>
              </div>
              <div className="space-y-6">
                {GUIDES.map((guide, idx) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="block group p-6 sm:p-8 border border-white/[0.05] hover:border-[#d4b878]/30 transition-colors"
                  >
                    <div className="flex items-start gap-6">
                      <span className="text-[#d4b878]/50 font-mono text-xs pt-1 shrink-0 hidden sm:block">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#d4b878] transition-colors">
                          {guide.title}
                        </h3>
                        <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] mb-4">
                          {guide.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                          <span>{guide.readTime} min read</span>
                          <span>·</span>
                          <span>Guide</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Cluster sections */}
          <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
            {CLUSTERS.map((cluster, clusterIdx) => {
              const articles = getArticlesByCluster(cluster.slug);
              return (
                <section
                  key={cluster.slug}
                  id={cluster.slug}
                  className={
                    clusterIdx > 0 ? "mt-20 pt-16 border-t border-white/[0.04]" : ""
                  }
                >
                  {/* Cluster header */}
                  <div className="mb-10">
                    <div className="flex items-center gap-4 mb-4">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: cluster.accent }}
                      />
                      <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 font-light">
                        Cluster {String(clusterIdx + 1).padStart(2, "0")}
                      </p>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-serif text-[#f0eee9] font-light tracking-[-0.02em] mb-3">
                      {cluster.title}
                    </h2>
                    <p className="text-base sm:text-lg text-[#cfcabf] font-serif italic leading-[1.6] mb-5">
                      {cluster.tagline}
                    </p>
                    <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.8] max-w-2xl">
                      {cluster.description}
                    </p>

                    {/* Target queries — for transparency about search intent */}
                    <div className="mt-6">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] mb-3">
                        Search intent this cluster addresses
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {cluster.targetQueries.map((q) => (
                          <li
                            key={q}
                            className="text-[11px] text-[#7a7a7a] border border-white/[0.06] px-3 py-1 font-light"
                          >
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Article list */}
                  <div className="space-y-6">
                    {articles.map((article, idx) => (
                      <Link
                        key={article.slug}
                        href={`/insights/${article.slug}`}
                        className="block group p-6 sm:p-8 border border-white/[0.05] hover:border-[#c9a96e]/25 transition-colors"
                      >
                        <div className="flex items-start gap-6">
                          <span className="text-[#c9a96e]/50 font-mono text-xs pt-1 shrink-0 hidden sm:block">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] mb-4">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                              <span>{article.readTime} min read</span>
                              <span>·</span>
                              <time dateTime={article.publishedAt}>
                                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                })}
                              </time>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Author CTA */}
            <div className="mt-24 pt-12 border-t border-white/[0.04] text-center">
              <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
                About the work
              </p>
              <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] max-w-xl mx-auto mb-8">
                These essays are written by {AUTHOR.name} — a pattern recognition practice working at the intersection of Vedic astrology and depth psychology.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] tracking-[0.3em] uppercase">
                <Link
                  href="/about"
                  className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                >
                  About AstroKalki
                </Link>
                <Link
                  href="/methodology"
                  className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                >
                  The methodology
                </Link>
                <Link
                  href="/#booking"
                  className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                >
                  Book a session
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Search results view — separated for readability                              */
/* ─────────────────────────────────────────────────────────────────────────── */

interface SearchResultsProps {
  query: string;
  articleHits: ArticleSearchHit[];
  patternHits: PatternSearchHit[];
  totalResults: number;
}

function SearchResults({
  query,
  articleHits,
  patternHits,
  totalResults,
}: SearchResultsProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      {/* Result counter + clear search */}
      <div className="mb-12 pb-6 border-b border-white/[0.04]">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/70 mb-3 font-light">
          {totalResults > 0 ? "Results" : "No results"}
        </p>
        <h2 className="text-2xl sm:text-3xl font-serif text-[#f0eee9] font-light tracking-[-0.02em]">
          {totalResults > 0 ? (
            <>
              {totalResults} {totalResults === 1 ? "result" : "results"} for{" "}
              <span className="text-[#c9a96e] font-serif italic">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            <>
              Nothing matched{" "}
              <span className="text-[#c9a96e] font-serif italic">&ldquo;{query}&rdquo;</span>
            </>
          )}
        </h2>
        <p className="mt-3 text-[11px] tracking-[0.3em] uppercase text-[#5a5a5a]">
          {articleHits.length > 0 && (
            <span className="mr-4">{articleHits.length} articles</span>
          )}
          {patternHits.length > 0 && (
            <span className="mr-4">{patternHits.length} atlas patterns</span>
          )}
          <Link
            href="/insights"
            className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-0.5 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
          >
            Clear search
          </Link>
        </p>
      </div>

      {/* Empty state */}
      {totalResults === 0 && (
        <div className="py-16 text-center">
          <p className="text-base sm:text-lg text-[#cfcabf] font-light leading-[1.8] max-w-xl mx-auto mb-10">
            No essays or atlas patterns matched your search. Try a broader term —
            pattern names like <em className="text-[#c9a96e]">rescuer</em>,{" "}
            <em className="text-[#c9a96e]">abandonment</em>, or{" "}
            <em className="text-[#c9a96e]">people-pleasing</em> — or explore the
            clusters below.
          </p>
          <div className="max-w-md mx-auto">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#5a5a5a] mb-4 font-light">
              Or browse by cluster
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] tracking-[0.2em] uppercase">
              {CLUSTERS.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/insights#${c.slug}`}
                    className="text-[#c9a96e] border-b border-[#c9a96e]/40 pb-0.5 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Atlas pattern hits — shown first (proprietary knowledge moat) */}
      {patternHits.length > 0 && (
        <section className={articleHits.length > 0 ? "mb-16" : ""}>
          <div className="flex items-center gap-4 mb-8">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c9a96e]" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/80 font-light">
              Pattern Atlas · {patternHits.length} {patternHits.length === 1 ? "match" : "matches"}
            </p>
          </div>
          <div className="space-y-6">
            {patternHits.map(({ pattern, matchedField }) => (
              <Link
                key={pattern.slug}
                href={`/patterns/atlas/${pattern.slug}`}
                className="block group p-6 sm:p-8 border border-white/[0.05] hover:border-[#c9a96e]/30 transition-colors"
              >
                <div className="flex items-start gap-6">
                  <span className="text-[#c9a96e]/50 font-mono text-[10px] tracking-[0.2em] uppercase pt-1 shrink-0 hidden sm:block">
                    Pattern
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-2 group-hover:text-[#c9a96e] transition-colors">
                      {pattern.name}
                    </h3>
                    <p className="text-sm sm:text-base text-[#cfcabf] font-serif italic font-light leading-[1.6] mb-3">
                      {pattern.tagline}
                    </p>
                    <p className="text-sm text-[#9a9a9a] font-light leading-[1.7] mb-4 line-clamp-3">
                      {pattern.conciseAnswer}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                      <span>{pattern.readTime} min read</span>
                      <span>·</span>
                      <span className="text-[#c9a96e]/60">matched: {matchedField}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Article hits */}
      {articleHits.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c9a96e]/60" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/80 font-light">
              Essays · {articleHits.length} {articleHits.length === 1 ? "match" : "matches"}
            </p>
          </div>
          <div className="space-y-6">
            {articleHits.map(({ article, matchedField }) => {
              const cluster = CLUSTER_BY_SLUG[article.cluster];
              return (
                <Link
                  key={article.slug}
                  href={`/insights/${article.slug}`}
                  className="block group p-6 sm:p-8 border border-white/[0.05] hover:border-[#c9a96e]/25 transition-colors"
                >
                  <div className="flex items-start gap-6">
                    <span className="text-[#c9a96e]/50 font-mono text-[10px] tracking-[0.2em] uppercase pt-1 shrink-0 hidden sm:block">
                      Essay
                    </span>
                    <div className="flex-1 min-w-0">
                      {cluster && (
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]/60 mb-2 font-light">
                          {cluster.title}
                        </p>
                      )}
                      <h3 className="text-xl sm:text-2xl font-serif text-[#f0eee9] font-light tracking-[-0.01em] mb-3 group-hover:text-[#c9a96e] transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm sm:text-base text-[#9a9a9a] font-light leading-[1.7] mb-4 line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-[#5a5a5a]">
                        <span>{article.readTime} min read</span>
                        <span>·</span>
                        <time dateTime={article.publishedAt}>
                          {new Date(article.publishedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })}
                        </time>
                        <span>·</span>
                        <span className="text-[#c9a96e]/60">matched: {matchedField}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
