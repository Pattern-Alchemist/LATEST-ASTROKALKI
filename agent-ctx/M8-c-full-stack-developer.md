# M8-c — AI Social Share Cards (Wave 3a)

**Task ID**: M8-c
**Agent**: full-stack-developer
**Wave**: 3a (parallel with M8-a AI writer, M8-b programmatic SEO, M8-d, M9-a, M10-a)
**Started**: 2026-06-18 18:42 UTC
**Finished**: 2026-06-18 18:58 UTC

## What I built

Auto-generated AI social share cards for every article (25) + atlas pattern (11) + guide (3) = 39 content surfaces. Each card is visually distinct (per-content-type motif palettes + per-slug emotional/thematic seed) but shares the AstroKalki cinematic aesthetic (#050505 dark + #c9a96e gold + smoke + fractured mirrors + A24/35mm grain).

## Files I created

- `src/lib/ai/social-card-prompts.ts` — 3 prompt builders (getArticleCardPrompt / getAtlasCardPrompt / getGuideCardPrompt) + per-content-type motif palettes + emotional lexicon extraction + AESTHETIC_CLOSING clause.
- `src/app/api/ai/social-image/generate-all/route.ts` — POST admin-gated bulk generate for 39 items, 1 batch per 10 min rate-limit, 1.5s inter-call delay.
- `src/app/api/ai/social-image/[slug]/route.ts` — GET public streaming PNG endpoint, 307 fallback to /api/og?slug=<slug>.

## Files I rewrote

- `src/app/api/ai/social-image/route.ts` — POST admin-gated, body {slug, type:"article"|"atlas"|"guide", force?}, 5/hr rate-limit.
- `src/app/api/admin/social-images/route.ts` — GET-only list endpoint (removed POST), now includes atlas patterns + per-kind summary.
- `src/app/admin/social-images/page.tsx` — admin UI with per-kind summary cards, 6 filter chips, card grid with previews, preview modal with prompt display, calls new endpoints.

## Files I modified

- `src/app/insights/[slug]/page.tsx` — OG image URL → `/api/ai/social-image/<slug>`, dimensions 1344x768.
- `src/app/patterns/atlas/[slug]/page.tsx` — OG image URL → `/api/ai/social-image/<slug>`, dimensions 1344x768.
- `src/app/guides/[slug]/page.tsx` — OG image URL → `/api/ai/social-image/<slug>`, dimensions 1344x768.

## Files I deleted

- `src/lib/ai/social-image-prompts.ts` — replaced by `social-card-prompts.ts` (previous M8-c revision; new spec uses different filename).
- `src/app/api/admin/social-images/generate-all/route.ts` — moved to `/api/ai/social-image/generate-all` per new spec.

## Files I MUST NOT touch (verified)

`prisma/schema.prisma`, `src/lib/zai.ts`, `next.config.ts`, `tsconfig.json`, `.env`, `src/middleware.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx`, `src/app/sitemap.ts`, `src/app/api/og/route.tsx` (serves as fallback — untouched), any content files.

## Architecture notes

### Streaming PNG endpoint with fallback chain
1. `GET /api/ai/social-image/<slug>` — public, no auth (crawlers can't authenticate)
2. If `SocialImage` row exists AND PNG file on disk → stream PNG (1344x768, image/png, immutable cache)
3. Else → 307-redirect to `/api/og?slug=<slug>` (which then either serves AI card via defensive double-lookup, or renders the programmatic ImageResponse poster as last resort)

Every page always returns a valid OG image, whether or not an admin has generated the AI card yet.

### Auth pattern
- `/api/ai/social-image` (POST) and `/api/ai/social-image/generate-all` (POST) — manual admin cookie verify via `isSessionValid(ADMIN_COOKIE_NAME)`. These routes sit under `/api/ai/*` (NOT `/api/admin/*`), so middleware's auto-guard doesn't apply. Matches the existing `/api/ai/tts` + `/api/ai/draft` pattern. Middleware whitelists `/api/ai/social-image*` as public-POST with 4KB body cap + UA block + Origin check.
- `/api/admin/social-images` (GET) — auto-guarded by middleware (returns 401 without admin cookie).
- `/api/ai/social-image/<slug>` (GET) — public, no auth (crawlers need to read OG images).

### Rate-limits
- Single-card generate: 5/hour per IP (image generation is expensive)
- Bulk generate: 1 batch per 10 min per IP (prevents double-clicks during the 10–25 min bulk run)

### Prompt determinism
Each prompt is deterministic per inputs → persisted `prompt` column on `SocialImage` is stable across regenerations. Useful for prompt auditing and reproduction.

### Visual distinctiveness
- Articles: 5 cluster palettes × 5 motifs each = 25 distinct motif slots for 25 articles. Emotional lexicon extraction from excerpt further differentiates within a cluster.
- Atlas: 11 specimen/cabinet-of-curiosities motifs for 11 patterns. Clinical/somber register.
- Guides: 6 vast-hall motifs. Title-derived thematic seed ensures two guides hashing to the same motif still produce different prompts.

## Verification

- `npx tsc --noEmit` → EXIT 2, but ALL ERRORS are in `src/lib/content/articles/why-do-i-sabotage-my-own-success.ts` (line 153 — unescaped double-quotes in a FAQ answer string). This is a parallel agent's content file (likely M8-a). I MUST NOT touch it per task spec. Scoped TS check on my own files: ZERO errors.
- `bun run lint` → EXIT 1 for the same parallel-agent file. Lint scoped to my own files: EXIT 0.
- All curl tests pass (see worklog for full output):
  - `/admin/social-images` (no auth) → 307 redirect to /admin/login (correct)
  - `/admin/social-images` (with auth) → 200
  - `POST /api/ai/social-image` (curl UA) → 403 (suspicious UA block)
  - `POST /api/ai/social-image` (Mozilla UA, no auth) → 401
  - `POST /api/ai/social-image` (with auth, invalid slug) → 400
  - `POST /api/ai/social-image` (with auth, repeated) → 429 (rate-limited)
  - `POST /api/ai/social-image/generate-all` (no auth) → 401
  - `GET /api/admin/social-images` (no auth) → 401
  - `GET /api/admin/social-images` (with auth) → 200 JSON list of 39 items
  - `GET /api/ai/social-image/test-slug` (no AI card) → 307 redirect to /api/og?slug=test-slug (correct fallback)
  - `GET /api/ai/social-image/why-you-keep-attracting-the-same-relationship` (AI card exists) → 200, Content-Type: image/png, 114,758 bytes
- HTML metadata check (verified via curl + grep):
  - `/insights/<slug>` → `og:image` = `/api/ai/social-image/<slug>`, 1344x768
  - `/patterns/atlas/<slug>` → `og:image` = `/api/ai/social-image/<slug>`, 1344x768
  - `/guides/<slug>` → `og:image` = `/api/ai/social-image/<slug>`, 1344x768
- Prompt functions unit-tested via tsx (see worklog for full output).

## Known issues (NOT mine)

1. `src/lib/content/articles/why-do-i-sabotage-my-own-success.ts` line 153 has unescaped double-quotes (`saying "it was nothing"` inside a double-quoted string). This blocks global `tsc --noEmit` and `bun run lint`. Owned by another agent (likely M8-a). I cannot touch per task spec.
2. Dev server briefly threw "Failed to reload dynamic routes" errors due to a parallel agent's route conflict (`/patterns/[city]` vs `/patterns/[slug]` introduced by M8-b programmatic-SEO agent). M8-b iterated and resolved the conflict — all my routes recovered. Not caused by my changes.

## What's next

Admin can now visit `/admin/social-images`, see a card grid of all 39 content surfaces with their generation status, click "Generate" on individual cards or "Generate all missing" for bulk generation. Once generated, every article/atlas/guide page's OG metadata points to the AI card (with graceful fallback to the programmatic /api/og poster if no card exists yet).
