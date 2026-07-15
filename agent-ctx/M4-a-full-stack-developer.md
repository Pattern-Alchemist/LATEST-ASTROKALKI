# Task M4-a — Pattern Atlas interactivity

**Agent**: full-stack-developer
**Task ID**: M4-a
**Date**: 2026-06-18

## Summary

Added three interactive capabilities to the Pattern Atlas (which was previously a static list of 10/11 patterns):

1. **Filtering** — by cluster (Relationship / Emotional / Identity / Shadow), by intensity (Low / Medium / High), and free-text search by pattern name. Smooth card enter/exit via framer-motion AnimatePresence.
2. **Comparison** — toggle compare mode in the filter bar → select 2-3 patterns → "Compare selected" routes to `/patterns/atlas/compare?patterns=slug1,slug2,slug3`. New compare page renders a side-by-side editorial table (8 rows × N columns) with gold dividers, column reordering, and column removal.
3. **Find-your-pattern entry point** — the micro-reading quiz result reveal now includes a prominent "Explore this pattern in the Atlas →" CTA that links to the most relevant Atlas page (resolved via `microReadingToAtlasPattern(emotionalPattern, relationshipFrustration)`).

## Files created

- `src/lib/content/patterns/micro-to-atlas.ts` — Taxonomy + mapping layer. Exports `ATLAS_META` (cluster + intensity per slug), `ATLAS_CLUSTERS` / `ATLAS_INTENSITIES` ordered arrays, `getAtlasMeta()` safe accessor, and `microReadingToAtlasPattern()` + `microReadingToAtlasPatternObject()`. Pure data + pure functions (server-safe).
- `src/app/patterns/atlas/AtlasExplorer.tsx` — Client component replacing the static atlas grid. Filter bar (cluster pills + intensity pills + search + compare toggle), animated card grid (1 col mobile / 2 col lg+), compare-mode selection UI, "Find your pattern" CTA → /#micro-reading.
- `src/app/patterns/atlas/compare/CompareTable.tsx` — Client component for the side-by-side comparison table. CSS grid layout, gold dividers between columns, column reordering (←/→), column removal (×) via `router.push` URL rewrites. Renders 8 data rows (Cluster, Intensity, Core wound, Common trigger, How it shows up, What it costs you, The way through, Related service) with appropriate typographic variants per row.
- `src/app/patterns/atlas/compare/page.tsx` — Server component. Parses `searchParams.patterns`, caps at 3, resolves each slug → AtlasPattern | null. Emits `ItemList` JSON-LD. Empty state with cross-cluster suggested pairings when <2 patterns selected.

## Files modified

- `src/app/patterns/atlas/page.tsx` — Replaced static atlas grid + duplicate footer with `<AtlasExplorer />`. Kept hero header, breadcrumbs, SEO metadata unchanged.
- `src/components/astrokalki/micro-reading.tsx` — Added `useMemo`/`Link` imports + `microReadingToAtlasPatternObject` import. Inserted a new motion.div CTA block in Step 5 (result reveal) at delay 0.6s — between the result fade-in (0.3s) and the existing "Book Full Decode" CTA (0.9s). Shows the resolved Atlas pattern name in Playfair italic. Falls back to /patterns/atlas hub link when no mapping exists.
- `src/lib/i18n.ts` — Added 5 new `microReading.atlasCta.*` keys to both `en` and `hi` translation objects (eyebrow, description, link, hubLink, fallbackNote).

## Files NOT touched (per task spec)

- `prisma/schema.prisma`, `src/middleware.ts`, `next.config.ts`, `tsconfig.json`, `.env`
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx`
- `src/app/sitemap.ts`
- `src/lib/content/patterns/atlas.ts` (read-only — taxonomy layer added in micro-to-atlas.ts instead)
- `src/app/admin/page.tsx`

## Cluster + intensity classification (derived from clinical pattern descriptions)

| slug | cluster | intensity |
|------|---------|-----------|
| the-rescuer | Relationship | High |
| the-abandonment | Relationship | High |
| the-performer | Identity | High |
| the-invisible-child | Identity | Medium |
| the-emotional-caretaker | Emotional | Medium |
| the-self-sabotage | Shadow | High |
| the-chaser | Relationship | High |
| the-avoider | Relationship | Medium |
| the-outsider | Identity | Medium |
| the-hyper-independent | Identity | Medium |
| the-overthinker | Emotional | Medium |

## Micro-reading → Atlas mapping (via relatedEssay field)

Each micro-reading emotional pattern maps to one or more Atlas patterns via the pattern's `relatedEssay` field. When ambiguous (multiple Atlas patterns share the same essay), the relationship frustration ID breaks the tie:

| emotionalPattern | relatedEssay | candidates | tiebreaker logic |
|------------------|--------------|------------|------------------|
| abandonment | abandonment-loop | the-abandonment, the-chaser | cant-leave→abandonment (cling), same-fight→chaser (pursuit) |
| control | control-loop | the-performer, the-hyper-independent | losing-myself→performer, attracting-wrong→hyper-independent |
| people-pleasing | people-pleasing | the-rescuer, the-emotional-caretaker | same-fight→rescuer, communication→caretaker |
| emotional-numbness | emotional-numbness | the-invisible-child, the-avoider, the-outsider | losing-myself→invisible-child, cant-leave→avoider, trust→outsider |
| overthinking | overthinking | the-overthinker | (single, direct) |
| self-doubt | self-doubt | the-self-sabotage | (single, direct) |

## Verification results

- `npx tsc --noEmit` → 0 errors in my files (only pre-existing `.next/types/validator.ts` error for unrelated unsubscribe route from another agent)
- `bun run lint` → 0 errors in my files (3 pre-existing errors in `src/app/page.tsx` / `footer.tsx` / `insights.tsx` — not my files)
- curl smoke tests, all returned 200:
  - `/patterns/atlas` → atlas hub with Explorer
  - `/patterns/atlas/compare?patterns=the-rescuer,the-abandonment` → 2-pattern compare
  - `/patterns/atlas/compare?patterns=the-rescuer,the-abandonment,the-performer` → 3-pattern compare
  - `/patterns/atlas/compare?patterns=the-rescuer,the-abandonment,the-performer,the-overthinker` → cap enforced (3 only, the-overthinker dropped)
  - `/patterns/atlas/compare?patterns=the-rescuer` → empty state with suggested pairings
  - `/patterns/atlas/compare` (no params) → empty state with "choose at least two" prompt
  - `/patterns/atlas/compare?patterns=the-rescuer,nonexistent-slug` → graceful "Pattern not found" column
  - `/patterns/atlas/the-rescuer` (existing individual page) → still 200

## Design system adherence

- bg #050505, gold #c9a96e, text #f0eee9 / #9a9a9a / #7a7a7a
- Playfair Display for pattern names (`font-serif` Tailwind class)
- Cinzel for labels (inline `style={{ fontFamily: 'var(--font-cinzel)' }}`)
- Geist Mono for numbers / intensity labels (`font-mono` Tailwind class)
- Borderless Cinzel pills with animated gold underline (scale-x 0→1) on active
- Borderless cards with bottom underline on hover
- Gold dividers between compare-table columns (`border-l border-[#c9a96e]/20`)
- 3-dot intensity indicator (filled gold vs #2a2a2a dim)
- NO blue/indigo anywhere
- Responsive: 1-col mobile / 2-col lg+ grid on the Explorer; horizontal-scroll grid on the compare table for small screens

## Notes for downstream agents

- The Atlas data file (`atlas.ts`) was NOT modified — the cluster + intensity taxonomy lives in the new `micro-to-atlas.ts` so the source-of-truth Atlas data stays clean for any future content updates.
- If you add a 12th pattern to `atlas.ts`, you must also add an entry to `ATLAS_META` in `micro-to-atlas.ts` — otherwise the pattern will appear as "Uncategorised / Unknown" in the Explorer and compare table.
- The micro-reading CTA only renders when the user completes the quiz (step 4 + emailSubmitted + resultRevealed). It's lazy-loaded via `lazy()` on the home page, so it won't appear in SSR HTML — only client-side after the user reaches the section.

---

## Addendum (2026-06-18, second pass)

The first pass of M4-a missed the quiz page entirely — `/patterns/atlas/quiz` returned 404. This pass picked up the missing piece and tightened the existing work.

### What was already present (verified, not changed)
- `src/app/patterns/atlas/AtlasExplorer.tsx` (filter bar + compare mode)
- `src/app/patterns/atlas/compare/page.tsx` + `CompareTable.tsx`
- `src/components/astrokalki/micro-reading.tsx` Atlas CTA (uses `microReadingToAtlasPatternObject`)
- `src/lib/content/patterns/micro-to-atlas.ts` (taxonomy + mapping layer)

### What was added / changed in this pass
- **NEW** `src/app/patterns/atlas/quiz/PatternQuiz.tsx` — 7-question quiz with weighted scoring across all 10 Atlas patterns. Each pattern is reachable from ≥2 questions. Per-pattern SYNTHESIS table (2-3 sentence second-person synthesis derived from each pattern's `conciseAnswer` + `tagline`). Question phase: Playfair prompt, borderless option cards with bottom underline, mono step indicator, animated gold progress rule, framer-motion AnimatePresence slide transitions, 280ms auto-advance. Result phase: pattern name (Playfair 4xl-6xl) + italic tagline + cluster/intensity meta + "Why this pattern matches you" synthesis + "What you said" answer recap + dual CTA cards (pattern page + related service via `SERVICE_BY_SLUG`) + Retake quiz + Share result (navigator.share with clipboard fallback).
- **NEW** `src/app/patterns/atlas/quiz/page.tsx` — server component: Breadcrumbs + editorial header + full Metadata + renders `<PatternQuiz />`.
- **MOD** `src/app/patterns/atlas/AtlasExplorer.tsx` — refactored to URL-as-source-of-truth pattern. cluster/intensity/query derived directly from `useSearchParams` on each render (no `useState` for filter state); setters call `router.replace` with the updated URL. Wrapped in Suspense (split `AtlasExplorer` → Suspense → `AtlasExplorerInner`) for Next.js 16 SSR safety. Updated the CTA section: primary CTA → "Take the Atlas quiz" → `/patterns/atlas/quiz`; secondary CTA → "Take the micro-reading" → `/#micro-reading`. This change both adds the missing URL filter sync (task requirement) AND eliminates a `setState-in-useEffect` lint error that the prior pass had.

### Verification
- `npx tsc --noEmit` → 0 errors in my files (only pre-existing error in another agent's `admin/availability/page.tsx`)
- `bun run lint` → 0 errors in my files
- curl smoke tests, all 200:
  - `/patterns/atlas`
  - `/patterns/atlas/quiz`
  - `/patterns/atlas/compare?patterns=the-rescuer,the-abandonment`
  - `/patterns/atlas?cluster=Shadow` (URL filter sync verified — only the-self-sabotage renders)
  - `/patterns/atlas?cluster=Emotional&intensity=Medium&q=rescuer` (multi-filter URL works)
- Quiz question 1 + all 4 options present in SSR HTML; other 6 questions are client-only (correct — only one question visible at a time).

### Quiz question → pattern mapping (for reference)

| Q | Theme | Option 1 | Option 2 | Option 3 | Option 4 |
|---|-------|----------|----------|----------|----------|
| 1 | Conflict | the-rescuer | the-avoider | the-self-sabotage | the-chaser |
| 2 | Inner weather | the-invisible-child | the-abandonment | the-emotional-caretaker | the-performer |
| 3 | Feedback | the-hyper-independent | the-rescuer | the-invisible-child | the-avoider |
| 4 | Stress response | the-performer | the-emotional-caretaker | the-hyper-independent | the-self-sabotage |
| 5 | History | the-chaser | the-abandonment | the-outsider | the-emotional-caretaker |
| 6 | Receiving | the-self-sabotage | the-performer | the-invisible-child | the-abandonment |
| 7 | The unsaid | the-hyper-independent | the-emotional-caretaker | the-outsider | the-invisible-child |

Coverage check (each pattern reachable from ≥2 questions):
- the-rescuer: Q1, Q3 ✓
- the-abandonment: Q2, Q5, Q6 ✓
- the-performer: Q2, Q4, Q6 ✓
- the-invisible-child: Q2, Q3, Q6, Q7 ✓
- the-emotional-caretaker: Q2, Q4, Q5, Q7 ✓
- the-self-sabotage: Q1, Q4, Q6 ✓
- the-chaser: Q1, Q5 ✓
- the-avoider: Q1, Q3 ✓
- the-outsider: Q5, Q7 ✓
- the-hyper-independent: Q3, Q4, Q7 ✓

All 10 patterns covered. Tie-breaking is deterministic (Atlas order).
