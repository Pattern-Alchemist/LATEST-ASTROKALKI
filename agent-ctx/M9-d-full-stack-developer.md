# M9-d — Case study pages (anonymised long-form client journeys)

**Task ID**: M9-d
**Agent**: full-stack-developer
**Wave**: 3b (parallel with M9-b, M9-c + M10-b/c/d)
**Date**: 2026-06-18

## Restated task

Build case study pages — anonymised long-form client journeys structured as
Problem → Pattern → Session → Shift. These demonstrate the AstroKalki method
in practice and serve as deep trust signals.

The `CaseStudy` Prisma model was already added by UPGRADE3-PREP (id, slug
@unique, title, pattern, clientInitials, clientAge?, consentGiven, problem,
patternSection, session, shift, published, createdAt, updatedAt). 0 schema
changes needed.

## Files

### Created (7)

| File | Role |
| --- | --- |
| `src/lib/content/case-study-seed.ts` | 3 anonymised long-form client journeys, ~2400 words each across the 4 sections. Exports `CASE_STUDY_SEEDS` array + `CASE_STUDY_BY_SLUG` lookup. Cases: R., 34 (the-abandonment), M., 41 (the-rescuer), A., 38 (the-controller). Voice: direct, psychologically precise, no jargon, no mystical abstraction. Lazily seeded into DB on first access of /case-studies. |
| `src/app/api/admin/case-studies/route.ts` | GET (admin-gated, list with pagination + ?q= + ?published= filter, excerpt-truncated problem field) + POST (admin-gated, create new — 64KB body cap for 4 long markdown sections, Zod validation, slug uniqueness 409 handling). |
| `src/app/api/admin/case-studies/[id]/route.ts` | GET (single full content), PATCH (partial update, .strict() schema, slug collision check on rename), DELETE (permanent remove). Same 64KB body cap, same Zod validation. |
| `src/app/case-studies/page.tsx` | Public case studies hub. Server component. Lazily seeds 3 initial case studies on first access. Lists all published case studies as cluster-style cards matching /insights hub design. Breadcrumbs + full Metadata + honesty section + "Book a session" CTA. |
| `src/app/case-studies/[slug]/page.tsx` | Individual case study page. Server component. generateStaticParams pre-renders 3 seed slugs; DB-added slugs rendered on demand. 4 numbered sections (01 Problem, 02 The Pattern, 03 The Session, 04 The Shift) with Cinzel section numbers + Playfair Display headings. "The pattern recognized" callout linking to Atlas. Article + FAQPage + BreadcrumbList JSON-LD. Related case studies + consent notice + Book a session CTA. |
| `src/app/admin/case-studies/page.tsx` | Admin CRUD interface. Server component. Reads ?edit=ID or ?new=1 to switch between list view (summary grid + card list) and inline editor. AdminShell layout matches /admin/testimonials. |
| `src/app/admin/case-studies/CaseStudyEditor.tsx` | Client component editor. Two modes (new POST / edit PATCH). 4 markdown textareas with per-section word count + tab-switchable live preview pane (rendered markdown + raw markdown toggle). Top metadata grid (title, slug, pattern select, initials, age). Toggles row (consent + published + total word count). Save + View live + Delete actions. Auto-clear success after 4s. |

### Modified (3)

| File | Change |
| --- | --- |
| `src/app/admin/page.tsx` | Added "Case Studies" link in admin header nav (FileText icon) right after Testimonials link. Added FileText to lucide-react import list. |
| `src/app/sitemap.ts` | Added CASE_STUDY_SEEDS + db imports. Added /case-studies hub (priority 0.75). Added dynamic caseStudyPages section querying DB for published case studies + always-includes seed slugs fallback. priority 0.7 with /api/og image. |
| `src/components/astrokalki/footer.tsx` | Added "Case Studies" link in Practice column right after Testimonials link. |

## Verification log

- **npx tsc --noEmit**: exit 2, but ALL 4 errors are in another agent's files (`src/app/transits/TransitDisplay.tsx` + `src/lib/astrology/transits.ts` — M10-b/c/d transit work). ZERO TS errors in any M9-d file.
- **bun run lint**: 0 errors, 0 warnings after fixing 1 unnecessary eslint-disable directive.
- **curl http://localhost:3000/case-studies**: 200 (initial seed ran on first access, "Seeded 3 initial case studies" logged).
- **curl http://localhost:3000/admin/case-studies (no auth)**: 307 (correct, redirects to /admin/login).
- **curl http://localhost:3000/api/admin/case-studies (no auth)**: 401 (middleware auth working).
- **curl all 3 case study pages**: 200 each. Verified rendered HTML contains: title, h1, 4 Cinzel section numbers (01/02/03/04), 3 JSON-LD scripts (Article + FAQPage + BreadcrumbList), consent notice, pattern callout linking to /patterns/atlas/the-abandonment, "Book a session" CTA, related case studies section, "All case studies" back link.
- **curl http://localhost:3000/sitemap.xml**: 200, contains /case-studies hub + all 3 dynamic case study slugs.
- **dev.log**: clean Prisma queries (CaseStudy SELECT/INSERT), no errors, no warnings, no TS issues during compile.

## Design decisions

- **Lazy seeding**: case studies seed into DB on first access of /case-studies (matching the existing pillar-seed pattern). Idempotent — skips seeding if any case study already exists.
- **Server-side auth, no getServerSession in handlers**: middleware already gates /api/admin/* (401) and /admin/* (307 redirect). Adding redundant getServerSession calls in route handlers would be cargo-cult code. Following the existing /api/admin/testimonials pattern.
- **64KB body cap**: case studies have 4 long markdown sections (~600 words each, ~3.5KB per section). Default 4KB cap is too small; 64KB is generous without being absurd.
- **Pattern callout design**: bg-white/[0.015] (subtle warm tint), border-l-2 border-[#c9a96e]/30 (gold accent stripe), p-6 — matches spec exactly. Shows pattern.name + conciseAnswer + link to /patterns/atlas/[slug].
- **Section headings**: each section gets both a small Cinzel label ("01 — Problem") and a large Playfair Display heading ("What brought them in." / "What the chart named." / "What happened in the room." / "What changed."). This gives the page a more editorial, narrative feel than just the section label alone.
- **Related case studies**: same-pattern preference with fallback to any-other-published. Since the 3 seeds each use a different pattern, the fallback kicks in for all 3 seeds — but the mechanism is correct for future case studies that share a pattern.
- **Editor preview pane**: pure client-side renderMarkdown import (the function is pure string manipulation with no server-only deps, so it bundles cleanly). Tailwind classes in renderMarkdown output need to be present in the final CSS, which they are since Tailwind scans all files.
- **Slug auto-suggestion**: in "new" mode, the slug field auto-suggests from the title (lowercase kebab-case, max 120 chars) until the user manually edits the slug field. After that, slugTouched=true and the field stays manual.
- **On-create redirect**: after a successful POST, the editor redirects to ?edit=ID so subsequent saves become PATCHes. This prevents accidental duplicate-post on rapid Save clicks.
- **JSON-LD schemas**: Article (with wordCount, datePublished, dateModified, about=pattern) + FAQPage (3 Q/A pairs: what is the pattern, how does the session work, are these real) + BreadcrumbList (via Breadcrumbs component with withSchema=true default).
- **Sitemap fallback**: always includes seed slugs even when DB has rows, in case the seeds haven't been lazily-seeded yet — the sitemap should always advertise them so crawlers discover them on first visit (which triggers the seeding).

## Files NOT touched (per spec)

- prisma/schema.prisma (CaseStudy model already there from UPGRADE3-PREP)
- next.config.ts, tsconfig.json, .env, src/middleware.ts
- src/app/page.tsx, src/app/layout.tsx
- src/components/astrokalki/navigation.tsx
- Any other agent's files

## Stage summary

10 files delivered: 7 new + 3 modified. 3 long-form case studies seeded
(~7200 words total). All TS clean (only pre-existing M10 transit errors
remain), all lint clean, all routes return expected HTTP codes, dev.log
shows zero M9-d errors. Site is live on port 3000 with case studies
indexed in sitemap. Public can browse /case-studies → /case-studies/[slug].
Admin can manage via /admin/case-studies (CRUD + rich-text editor with live
markdown preview).
