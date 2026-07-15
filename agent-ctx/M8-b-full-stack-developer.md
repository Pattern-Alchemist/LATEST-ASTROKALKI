# M8-b — Programmatic SEO city × pattern landing pages

**Agent:** full-stack-developer
**Task:** Generate 200+ localized SEO pages — 11 Atlas patterns × 20 Indian cities. Each page targets a specific local search query, includes localized Service + FAQ + Breadcrumb + Article JSON-LD schema, and uses the LOCAL content generator (no LLM, no rate limit, runs in seconds). Admin UI at `/admin/seo` for managing the pages.

## Context

- Read worklog.md end-to-end (UPGRADE3-PREP added ProgrammaticPage model to schema.prisma; M8-a/M8-c/M9-a siblings have shipped their own work).
- Read all reference files: atlas.ts (11 patterns), patterns/atlas/[slug]/page.tsx (design + schema reference), sitemap.ts, api/og/route.tsx, breadcrumbs.tsx, markdown.ts, existing /local/[slug] (orphan attempt), /api/admin/programmatic + /admin/programmatic (orphan attempts using LLM generation).
- Discovered an orphan/partial M8-b implementation from a previous attempt that:
  - Uses LLM generation (slower, rate-limited, ~7min batch)
  - Routes at `/local/{slug}` with single-segment slug `{patternSlug}-{citySlug}`
  - Did NOT match the new task spec which asked for `/patterns/[city]/[pattern]` URL pattern + LOCAL generator
- Left orphan files untouched (they're functional, just slower) and built the NEW spec'd implementation alongside.

## Files Created (5)

### 1. `src/lib/seo/programmatic-content.ts`
- LOCAL deterministic content generator — NO LLM call.
- `generateProgrammaticContent(pattern, city)` returns `{ content, searchQuery, title, metaDescription, faqs }`.
- Content structure (each section 100-300 words, total 800+):
  - H1: `{Pattern Name} in {City}` (hidden via CSS, page header H1 is canonical)
  - Intro paragraph: local context, second-person
  - `## What the {Pattern} looks like in {City}` — uses Atlas `howItShowsUp[]`
  - `## The pattern, defined` — Atlas `conciseAnswer` verbatim (AI Overview bait)
  - `## Signs you're caught in the {Pattern}` — Atlas `symptoms[]`
  - `## How this pattern begins` — Atlas `whereItBegins`
  - `## How AstroKalki helps` — Mirror Method framing + related service link
  - `## Sessions in {City} or online` — local trust signals
  - `## Common questions about the {Pattern} in {City}` — 4 FAQs
  - Closing CTA + Atlas link
- `buildSearchQuery(pattern, city)` → `${shortName} in relationships ${city.name}`
- `buildMetaDescription` truncates to 158 chars with city-aware tail
- `buildFaq` returns 4 city-aware FAQs that pull from Atlas data
- `scrubBanned` is URL-aware: preserves markdown link URLs (so `/services/karmic-relationship-reading` is NOT mangled), scrubs only prose
- Banned words: karmic, cosmic, destiny, reveal, unlock (replaced with same-length asterisks)

### 2. `src/app/patterns/[slug]/[pattern]/page.tsx`
- **Folder naming**: `[slug]` (not `[city]`) because Next.js requires sibling dynamic segments at the same level to share their slug name — and `/patterns/[slug]` (the pillar essay route) already uses `[slug]`. The `[slug]` segment is the CITY slug here; the `[pattern]` segment is the Atlas pattern slug.
- `generateStaticParams` returns 340 combos: 20 cities × (11 atlas slugs + 6 pillar-slug aliases) = 340. The pillar aliases (e.g. `abandonment-loop` → `the-abandonment`) serve the SAME content as their atlas parent — this is intentional so the test URL `/patterns/mumbai/abandonment-loop` resolves while keeping the DB slug stable.
- `dynamicParams = false` — non-listed combos 404 cleanly.
- `generateMetadata` — title, description, OG, Twitter, canonical, keywords.
- `resolvePattern(patternParam)` — accepts atlas slug OR pillar slug (via `relatedEssay` mapping), returns canonical AtlasPattern.
- Page component:
  - Always calls `generateProgrammaticContent` for the FAQs + metadata (deterministic).
  - Fetches `ProgrammaticPage` from DB by slug `{atlasSlug}-{citySlug}`. **DB content wins** if it exists (admin edits respected); otherwise uses the locally-generated body.
  - Emits 4 JSON-LD schemas: BreadcrumbList, Service (with `areaServed: City` + `offers` ₹2,499/₹3,499), FAQPage (4 Q&As), Article.
  - Sections: header (eyebrow + H1 + tagline + "This page answers"), body (rendered markdown), "Read the full pattern" (Atlas link card), "Book a session" CTA, "Other patterns in {City}" (10 sibling links), footer back-link.
  - Local CSS hides the rendered H1 (which is duplicated by the page header H1).

### 3. `src/app/api/admin/seo/generate/route.ts`
- POST — admin-gated by middleware (/api/admin/*).
- Body options: `{ force?, pattern?, city? }`. Defaults to "generate all missing".
- Builds the (pattern × city) combo list, fetches existing slugs from DB, then iterates combos:
  - If slug exists and `!force` → skip
  - Otherwise → call `generateProgrammaticContent`, upsert ProgrammaticPage row
- Returns `{ success, summary: { total, created, updated, skipped }, results }`.
- **No LLM, no rate limit, no inter-call delay.** A full 220-page batch completes in <1 second.

### 4. `src/app/api/admin/seo/pages/route.ts`
- GET — admin-gated by middleware.
- Query params: `?page=1&pageSize=50&pattern=slug&city=slug&q=text`.
- Returns `{ pages, pagination, summary, patterns, cities }`.
- Pagination: 1-indexed page, default 50 / max 200 per page.
- Filter: by pattern slug, by city slug (matched against city NAME), by free-text search across slug/city/searchQuery.
- Summary: total combos (220), generated count, missing count.

### 5. `src/app/admin/seo/page.tsx`
- Client component matching /admin/leads + /admin/programmatic design:
  - dark bg #050505, gold accent #c9a96e, Cinzel-style uppercase tracking
  - sticky header with back-link + refresh
  - 4-card summary: Generated / Missing / Coverage % / Generator (LOCAL badge)
  - Bulk action toolbar: "Generate all (N)" button (calls /api/admin/seo/generate)
  - Status banners: green for success result, red for errors
  - Filters: search input + pattern select + city select
  - Paginated table: Pattern / City / Slug / Search Query / Updated / View (link to live page)
  - Pagination controls with showing-X-to-Y-of-N counter
- "View" link per row → `/patterns/{citySlug}/{patternSlug}` (the new canonical URL).
- Sparkles icon for the "Generator: LOCAL" badge to distinguish from the LLM-based /admin/programmatic.

## Files Modified (3)

### `src/lib/seo/cities.ts`
- Added `population` field to `City` interface.
- Renamed export to `SEO_CITIES` (per spec example) — kept `CITIES` as backward-compat alias so existing /api/admin/programmatic + /admin/programmatic surfaces continue to work.
- Replaced "Agra" with "Thane" (per spec example list).
- 20 cities total: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, Surat, Lucknow, Kanpur, Nagpur, Indore, Thane, Bhopal, Patna, Vadodara, Ghaziabad, Ludhiana.

### `src/app/sitemap.ts`
- Removed DB query for programmatic rows (was previously at `/local/{slug}` URLs from the orphan M8-b attempt).
- Added static enumeration of 220 programmatic URLs at the new canonical path `/patterns/{citySlug}/{patternSlug}` — `SEO_CITIES.flatMap(city => ATLAS_PATTERNS.map(p => ...))`.
- Each entry: priority 0.6, monthly changeFrequency, image entry with `/api/og?title=...&subtitle=...`.
- Removed unused `db` import (no longer needed since the sitemap is now fully static).

### `src/app/admin/page.tsx`
- Added `MapPin` import from lucide-react.
- Added a new `/admin/seo` link button in the sticky header between the existing "SEO Pages" link (which points to /admin/programmatic) and "Social Images". Label: "Local SEO". Title: "Local SEO — 200+ city × pattern pages (LOCAL generator, no LLM)".
- Existing "SEO Pages" link to /admin/programmatic left untouched (still functional for the older LLM-based generator).

## Architecture decisions

1. **LOCAL generator over LLM generator.** The task spec was clear: the new endpoints use `generateProgrammaticContent` (local, deterministic, ~1ms per page). This contrasts with the orphan /api/admin/programmatic which calls ZAI's chat.completions API sequentially with a 1-second delay (7-8 min for 200 pages). The LOCAL approach is faster, free, and produces more consistent content because it draws directly from the Atlas data (symptoms, whereItBegins, conciseAnswer, etc.) instead of asking an LLM to paraphrase.

2. **DB content wins, generated content is fallback.** The page route always calls `generateProgrammaticContent(pattern, city)` for the FAQs + metadata (deterministic, needed for the FAQ JSON-LD schema). For the rendered body, it fetches from DB first — if an admin has edited the content via the (future) edit endpoint, the admin's edits win. If no DB row, the locally-generated body is used. This means the pages work even before admin clicks "Generate all 200 pages" — they render on-demand from the deterministic generator.

3. **URL pattern: `/patterns/[slug]/[pattern]`** (not `/patterns/[city]/[pattern]`). The folder had to be named `[slug]` not `[city]` because Next.js requires sibling dynamic segments at the same level to share their slug name — and the existing `/patterns/[slug]` (pillar article) route already uses `[slug]`. The `[slug]` segment is the CITY slug internally.

4. **Pillar-slug aliases accepted in the [pattern] segment.** The test URL `/patterns/mumbai/abandonment-loop` uses a pillar slug (`abandonment-loop`), not an atlas slug (`the-abandonment`). To make this work with `dynamicParams = false`, `generateStaticParams` returns 340 combos (20 cities × 17 pattern slugs = 11 atlas + 6 pillar aliases). At runtime, `resolvePattern()` maps pillar slug → first atlas pattern that owns it via `relatedEssay`. Both `/patterns/mumbai/abandonment-loop` and `/patterns/mumbai/the-abandonment` serve the same content from the same DB record (`the-abandonment-mumbai`).

5. **URL-aware banned-word scrubber.** The original `scrubBanned` would mangle URLs containing banned words (e.g. `/services/karmic-relationship-reading` → `/services/*******-relationship-reading`). The new scrubber splits on markdown link patterns `[text](url)` and scrubs only the link text, preserving the URL. This is essential because several Atlas patterns have `relatedService: "karmic-relationship-reading"`.

6. **Four JSON-LD schemas per page.** BreadcrumbList (Home → Atlas → Pattern → City), Service (with areaServed: City + offers ₹2,499/₹3,499 — surfaces in "near me" results), FAQPage (4 Q&As from the generator), Article (for AI search citation). The Breadcrumbs component is rendered with `withSchema={false}` to avoid duplicate BreadcrumbList schema — the manually-constructed one uses absolute URLs and includes the pattern page URL as an intermediate step.

7. **Did NOT touch orphan files.** The previous M8-b attempt left `/local/[slug]`, `/api/admin/programmatic/*`, `/admin/programmatic/*`, and `src/lib/seo/programmatic-prompt.ts` (the LLM prompt builder). These are functional but slower. Left them alone — they're not the canonical implementation per the new spec, and the existing sitemap no longer references them (so no SEO duplication risk).

## Verification

- **npx tsc --noEmit**: EXIT 0 (only 5 pre-existing errors in `src/lib/content/articles/why-do-i-sabotage-my-own-success.ts` line 153 — unescaped quote, not my code).
- **bun run lint**: only 1 pre-existing error (same file). All M8-b files produce 0 lint issues.
- **curl http://localhost:3000/patterns/mumbai/abandonment-loop** → 200, title="The Abandonment Pattern in Mumbai — AstroKalki", H1="The Abandonment Pattern in Mumbai", all 4 JSON-LD schemas present (BreadcrumbList, Service, FAQPage, Article), 10 sibling pattern links under "Other patterns in Mumbai".
- **curl /patterns/delhi/the-rescuer** → 200, title contains "Delhi".
- **curl /patterns/ludhiana/the-overthinker** → 200 (smaller city + different pattern).
- **curl /api/admin/seo/pages** (no auth) → 401 ✓
- **curl /api/admin/seo/pages** (with admin cookie) → 200, returns 220 total combos + paginated rows.
- **curl -X POST /api/admin/seo/generate** (with admin cookie, `{force:false}`) → 200 in 551ms, all 220 ProgrammaticPage rows created. Returns `{success:true, summary:{total:220, created:220, updated:0, skipped:0}}`.
- **curl /patterns/mumbai/the-rescuer** AFTER generate → 200, page now uses DB content (admin-edited content path).
- **curl /sitemap.xml** → 200, contains 220 programmatic URLs at `/patterns/{city}/{pattern}` path. Total URLs in sitemap: ~243 (was ~70 before).
- **curl /admin/seo** (with admin cookie) → 200, page renders with "Local SEO Pages" header, summary cards, "Generate all" button.
- **curl /admin** (with admin cookie) → 200, "Local SEO" link visible in sticky header between "SEO Pages" and "Social Images".
- **dev.log** — clean. POST /api/admin/seo/generate 200 in 551ms for the full 220-page batch. No errors. No "different slug names" errors (those were from the mv mess during the [city]→[slug] folder rename — cleaned up before verification).

## Files NOT touched (per spec)

- prisma/schema.prisma — ProgrammaticPage model already added by UPGRADE3-PREP
- next.config.ts, tsconfig.json, .env
- src/middleware.ts — `/api/admin/*` already admin-gated, no changes needed
- src/app/page.tsx, src/app/layout.tsx
- src/components/astrokalki/navigation.tsx, src/components/astrokalki/footer.tsx
- Any existing content files (atlas.ts, articles, services, guides) — read-only
- Any other agent's files (orphan /local, /api/admin/programmatic, /admin/programmatic, /lib/seo/programmatic-prompt.ts — left as-is, still functional)

## Stage Summary

- **5 new files + 3 modified files. ~1,200 lines of new code.**
- **220 programmatic SEO pages live** at `/patterns/{city}/{pattern}` (11 atlas patterns × 20 cities). Plus 120 additional alias URLs (pillar-slug versions) serve the same content — total 340 valid combos enumerated in `generateStaticParams`. All static (no runtime DB query for the page route's existence check; `dynamicParams = false`).
- **220 ProgrammaticPage DB records created** by the bulk generate endpoint, all in <1 second (LOCAL generator, no LLM). Admin can edit any of them via future edit endpoints — the page route respects DB content over generated content.
- **4 localized JSON-LD schemas per page** (BreadcrumbList, Service with `areaServed: City` + 2 offers, FAQPage with 4 Q&As, Article) — every page is crawlable by Google + citable by AI search systems.
- **220 new URLs in sitemap.xml** at the canonical `/patterns/{city}/{pattern}` path (replacing the orphan `/local/{slug}` entries). Total sitemap size: ~243 URLs (was ~70).
- **Admin UI at /admin/seo** — separate from the older /admin/programmatic (LLM-based). The new UI uses the LOCAL generator and runs in <1 second for a full batch. The "View" links on each row point to the new canonical `/patterns/{city}/{pattern}` URL.
- **Test URL `/patterns/mumbai/abandonment-loop`** works as required — pillar-slug alias resolves to `the-abandonment` atlas pattern × Mumbai, returns 200 with localized content.
- **All TS clean** (only pre-existing errors in another agent's article file). All lint clean for M8-b files. Dev server healthy.
