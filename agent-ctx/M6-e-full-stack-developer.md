# M6-e — AI-generated pattern portrait

## Task
When a user completes the micro-reading or the Atlas quiz and identifies their pattern, generate a unique AI-created visual representing that pattern (their "pattern portrait"). Persist it, display it, make it shareable/downloadable/regeneratable, surface it on the member portal.

## Files created
- `src/lib/ai/portrait-prompts.ts` — 10 hand-crafted image prompts (one per Atlas slug). Each 2-3 sentences, abstract/symbolic (no faces — obsidian doorways, smoke, golden threads, fractured mirrors, labyrinths), with a shared closing aesthetic clause so the set reads as a coherent series. Exports `getPortraitPrompt(slug)` + `hasPortraitPrompt(slug)`.
- `src/app/api/ai/portrait/route.ts` (POST) — rate-limit (3/hr/IP), honeypot, Zod validation (pattern enum + email), `getPortraitPrompt()` lookup, `zai.images.generations.create({ prompt, size: '1024x1024' })`, save PNG to `/public/portraits/<uuid>.png`, `db.patternPortrait.create()`, return `{ imageUrl, portraitId, pattern }`.
- `src/app/api/ai/portrait/[id]/route.ts` (GET) — fetch single portrait by cuid. Public (portraits are shareable).
- `src/app/api/ai/portrait/history/route.ts` (GET ?email=) — Zod-validated email param, returns all portraits for that email newest-first.
- `src/components/astrokalki/pattern-portrait.tsx` (client) — the full portrait UI: gold-underline CTA, gold-pulse loading state with Playfair italic "Generating your portrait…", framed portrait card, Cinzel caption "Your [Pattern] portrait", Download/Share/Regenerate actions, gallery of previous portraits. 60s fetch timeout via AbortController.

## Files modified
- `src/app/patterns/atlas/quiz/PatternQuiz.tsx` — imported PatternPortrait, added `portraitEmail` state, inserted motion.div (delay 0.8) with inline email gate between Retake/Share and Cross-links. Once email valid, PatternPortrait mounts with the quiz's winning slug.
- `src/components/astrokalki/micro-reading.tsx` — imported PatternPortrait, inserted motion.div (delay 0.75) between Atlas CTA (0.6) and Book Full Decode (0.9). Conditional on atlasPattern existing. Passes user's already-collected email directly.
- `src/app/account/page.tsx` — added `db.patternPortrait.findMany` to Promise.all (with destructuring + catch slot), inserted "Pattern Portraits" section between "Your recordings" (V) and "Email preferences". Editorial 2/3/4-col responsive grid of framed portrait thumbnails linking back to Atlas pattern pages. Empty state with two text-link CTAs. Updated Email preferences roman numeral V→VI / IV→V. Imported `getAtlasPattern` for pattern-name lookup.

## Files NOT touched (per spec)
- prisma/schema.prisma, src/lib/zai.ts, next.config.ts, tsconfig.json, .env
- src/middleware.ts
- src/app/page.tsx, src/app/layout.tsx
- src/components/astrokalki/navigation.tsx, src/components/astrokalki/footer.tsx
- src/app/sitemap.ts
- Other agents' files (M6-a ai-chat, M6-c chart-analysis, M7 email-course)

## Validation
- `npx tsc --noEmit`: 0 errors in my files (3 pre-existing errors in other agents' files: api/ai/chart/route.ts:237, ai-chat.tsx:33, email-course/render.ts:20).
- `bun run lint`: 0 errors and 0 warnings in my files.
- Smoke tests: GET / → 200, GET /patterns/atlas/quiz → 200, GET /account → 200. POST /api/ai/portrait validation paths return correct codes (400 invalid slug, 400 invalid email, 200 honeypot, 429 rate-limited). GET /api/ai/portrait/<id> → 404 for nonexistent IDs. GET /api/ai/portrait/history?email=test@example.com → 200 {"portraits":[]}.

## Design decisions
- **Abstract/symbolic prompts only**: no faces, no literal astrology symbols. Each pattern is represented by an object/scene (doorway, thread, mirror, labyrinth, empty chair) that captures its emotional shape. The shared aesthetic clause makes the set feel like a coherent portrait series.
- **Inline email gate in PatternQuiz**: the quiz itself doesn't collect email. Rather than bolting email onto the quiz flow, I added a minimal borderless email input that gates just the PatternPortrait component — keeping the quiz email-optional while still letting users generate portraits.
- **No inline email gate in micro-reading**: step 4 already collects the email, so I pass it directly to PatternPortrait.
- **Gallery filter by pattern**: when showing the "your pattern portraits" gallery in the inline component, I filter by the current pattern slug (so a user landing on "the-rescuer" sees only their the-rescuer portraits, not all their portraits). The /account member portal shows ALL portraits unfiltered (it's the canonical archive).
- **60s fetch timeout**: image generation can take 10-30s; the AbortController ensures the UI doesn't hang indefinitely. The error message is graceful: "Portrait generation is taking longer than expected. Please try again."
- **File naming**: `crypto.randomUUID()` for the PNG filename. Regenerations get a new file (and a new DB row) so the gallery shows distinct portraits.
- **Public portrait access**: the [id] GET route is public because portraits are designed to be shareable. The cuid is unguessable in practice, and the image is also served directly from /public/portraits/<uuid>.png.
- **Portrait on /account links back to Atlas**: each gallery thumbnail links to the corresponding `/patterns/atlas/[slug]` page so a member revisiting an old portrait can re-read the pattern's nine-field breakdown.
