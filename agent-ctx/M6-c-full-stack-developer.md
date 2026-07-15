# Task M6-c — TTS audio narration of articles + guides

**Agent**: full-stack-developer
**Task ID**: M6-c
**Date**: 2026-06-18

## Summary

Converted all 25 cluster articles + 3 pillar guides (28 total) into audio-narratable content via the ZAI TTS SDK. Built a minimal editorial audio player that auto-mounts on every article/guide page, hides itself when no narration has been generated yet, and provides play/pause + scrub + speed control. Built an admin dashboard at `/admin/tts` for batch + per-slug generation with voice selection, rate limits, and file-size/duration tracking.

## Architecture

```
Article page (server)        Admin dashboard (client)
       │                            │
       │ renders <AudioPlayer>      │
       ▼                            ▼
   /api/tts/[slug]  ◄──probe──  AudioPlayer          /api/admin/tts (GET list)
   (public GET)                    │                  (admin-gated by middleware)
   returns 404 if no audio          │
   streams MP3 if generated         │ per-slug:  ▼
                                    │ POST       /api/ai/tts  (admin-gated manually)
                                    │            /api/admin/tts/generate-all (admin-gated by mw)
                                    ▼
                              src/lib/ai/tts-generator.ts
                              ├── stripMarkdown(text)
                              └── generateNarration(text, { voice, speed })
                                    ├── splitTextForTTS(text, 1000)  // chunk ≤1000 chars
                                    ├── per-chunk: zai.audio.tts.create (retry once on err)
                                    └── Buffer.concat(buffers) → MP3 file
                                          → /public/audio/<slug>.mp3
                                          → AudioNarration DB row (upsert)
```

## Files created

- **`src/lib/ai/tts-generator.ts`** — TTS generation service.
  - `stripMarkdown(md)` — strips headers, bold, italic, links, images, code, list markers, blockquotes, collapses whitespace.
  - `generateNarration(text, { voice, speed })` — splits into ≤1000-char chunks via `splitTextForTTS`, calls `zai.audio.tts.create` per chunk, retries once on error, skips failed chunks, concatenates MP3 buffers via `Buffer.concat`. Returns `{ buffer, durationSec, chunksGenerated, chunksSkipped }`. Duration estimated as `chars / 15 / speed`.

- **`src/app/api/ai/tts/route.ts`** — POST endpoint. Admin-gated **manually** (route lives under `/api/ai/*`, not `/api/admin/*`, so middleware's auto-guard doesn't apply — uses `isSessionValid` + `ADMIN_COOKIE_NAME` from `@/lib/security`). Rate-limited to 5 generations/hour/IP via `checkRateLimit`. Body: `{ slug, force?, voice?, speed? }`. Resolves slug against `ALL_ARTICLES` (25 articles) then `GUIDES` (3 pillar guides). Builds narration text from `title + conciseAnswer + keyTakeaways + body` (skips excerpt, FAQs, references — duplicate or non-narration-friendly). Writes MP3 to `public/audio/<slug>.mp3`. Upserts `AudioNarration` DB row. Returns `{ success, audioUrl, durationSec, chunksGenerated, chunksSkipped, fileSizeBytes }`.

- **`src/app/api/tts/[slug]/route.ts`** — Public GET endpoint. Streams MP3 from `public/audio/<slug>.mp3`. Returns 404 if file doesn't exist (player uses this to self-hide on article pages where no narration has been generated yet). Sanitizes slug with `^[a-z0-9-]+$` regex (path-traversal defense). Sets `Content-Type: audio/mpeg`, `Cache-Control: public max-age=86400 immutable`, `Accept-Ranges: bytes`, CORS `*`. Also exposes `X-Audio-Duration` + `X-Audio-Voice` from DB row for client use. Supports HEAD for cheap existence probing.

- **`src/app/api/admin/tts/route.ts`** — GET endpoint (admin-gated by middleware auto-guard on `/api/admin/*`). Returns the full list of all 28 narratable items (25 articles + 3 guides) cross-referenced with `AudioNarration` DB rows + on-disk file sizes. Each item: `{ slug, title, kind, cluster?, status: 'generated'|'missing', durationSec?, fileSizeBytes?, voice?, createdAt?, audioUrl? }`. Plus a `summary` object `{ total, generated, missing }` and `voices` list.

- **`src/app/api/admin/tts/generate-all/route.ts`** — POST endpoint (admin-gated by middleware). Body: `{ force?, voice?, limit? }`. Rate-limited to 1 batch per 10 min/IP (prevents accidental double-click → 2 parallel batches hammering ZAI). Builds job list of all articles + guides that don't have narrations yet (or all of them if `force=true`). Runs sequentially (no parallel TTS calls — avoids ZAI-side rate limits). For each job: `generateNarration → writeFile → upsert DB row`. Returns `{ success, summary: { total, generated, failed, skipped, processed }, results: [...] }`.

- **`src/components/astrokalki/audio-player.tsx`** — Client component. Editorial minimal player.
  - On mount: probes `GET /api/tts/{slug}`. 404 → self-hides (returns `null`). 200 → renders player.
  - Play/pause button: `w-10 h-10 rounded-full border border-[#c9a96e]/40 hover:bg-[#c9a96e]/10`, gold Play/Pause icon.
  - Progress bar: `h-1 bg-white/[0.06]` track, `bg-[#c9a96e]` fill, draggable scrubber (mouse + touch), gold dot on hover, keyboard accessible (←/→ to seek 2%).
  - Time display: mono font `text-[10px] text-[#7a7a7a]`, `M:SS / M:SS` format, `tabular-nums`.
  - Speed control: dropdown menu with 0.75x / 1x / 1.25x / 1.5x. Click-away catcher.
  - "LISTEN" eyebrow above player: Cinzel `text-[9px] tracking-[0.3em] uppercase text-[#c9a96e]/60`.
  - Container: `bg-white/[0.02] border border-white/[0.04] p-4 rounded-sm`, Framer Motion fade-in.
  - Hidden `<audio>` element drives everything; src points at `/audio/<slug>.mp3` (static — faster than API route for playback).
  - Loading state: gold spinner inside play button while probing.

- **`src/app/admin/tts/page.tsx`** — Admin TTS management dashboard. Matches `/admin/leads` design:
  - Header with back-link to `/admin` + Refresh button.
  - Toolbar with voice `<select>` dropdown (7 voices with descriptions: Tong Tong — warm narrator default, Chui Chui — calm measured, Xiao Chen — soft intimate, Jam — crisp articulate, Kazi — lower register, Dou Ji — reflective, Luodo — steady deliberate) + gold "Generate all missing (N)" CTA button.
  - Filter pills: All / Generated / Missing / Articles / Guides (each with count).
  - Sortable table columns: Type, Title (links to article page in new tab), Status (Ready green ✓ / Missing yellow ⚠), Duration (M:SS), Size (KB/MB), Voice, Actions.
  - Per-row actions: Download MP3 link (if generated) + Generate (if missing) / Regenerate (if generated) button with loading spinner.
  - Status banners for batch result summary + errors.
  - Footer note about rate limits + storage path.
  - Batch generation asks for confirmation with count + estimated time before firing.

## Files modified

- **`src/app/insights/[slug]/page.tsx`** — Added `import AudioPlayer from "@/components/astrokalki/audio-player"`. Inserted `<AudioPlayer slug={slug} />` in a new `<section>` between the page header (with H1 + excerpt + author/date) and the "Concise answer" section. Player auto-hides if no narration has been generated for the slug yet.

- **`src/app/guides/[slug]/page.tsx`** — Same pattern: imported AudioPlayer, inserted in a new `<section>` between header and "Concise answer" section.

## Files NOT touched (per task spec)

- `prisma/schema.prisma` — `AudioNarration` model already exists from UPGRADE2-PREP.
- `src/lib/zai.ts`, `next.config.ts`, `tsconfig.json`, `.env`
- `src/middleware.ts` — `/api/ai/tts` was already whitelisted as public POST by UPGRADE2-PREP, but the manual admin-cookie check inside the route handler prevents abuse. `/api/admin/tts/*` is auto-guarded by the existing `/api/admin/*` matcher. `/api/tts/[slug]` is a public GET, no middleware change needed.
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx`
- `src/app/sitemap.ts`

## Verification

- `npx tsc --noEmit` — 0 errors in M6-c files. (9 total errors, all in other agents' files: `src/app/account/page.tsx`, `src/app/api/ai/chart/route.ts`, `src/components/astrokalki/ai-chat.tsx`, `src/lib/email-course/render.ts`.)
- `bun run lint` — 0 errors, 0 warnings on M6-c files. (8 total warnings, all in other agents' files.)
- `curl -sI http://localhost:3000/admin/tts` → `307` redirect to `/admin/login?redirect=%2Fadmin%2Ftts` (middleware admin guard works).
- `curl -sI http://localhost:3000/api/tts/test-slug` → `404` (public endpoint returns 404 for missing audio).
- `curl -s -X POST http://localhost:3000/api/ai/tts` → `401 {"error":"Unauthorized — admin session required"}` (manual admin-cookie check works).
- `curl -sI http://localhost:3000/insights/why-you-keep-attracting-the-same-relationship` → `200` (article page with AudioPlayer renders server-side).
- `curl -sI http://localhost:3000/guides/complete-guide-to-relationship-patterns` → `200` (guide page with AudioPlayer renders server-side).
- Dev log clean — no warnings or errors from the new routes after compile.

## Design decisions

1. **Manual admin auth on `/api/ai/tts`** instead of moving it under `/api/admin/`. The task spec said the path must be `src/app/api/ai/tts/route.ts` and it must be admin-gated. Middleware auto-guards `/api/admin/*` but not `/api/ai/*`, so we manually verify `ADMIN_COOKIE_NAME` via `isSessionValid` inside the route handler. This matches the security posture without changing file paths.

2. **Markdown stripped at the generator layer**, not the API route. `stripMarkdown` lives in `tts-generator.ts` and is called automatically by `generateNarration`. Callers pass raw markdown and the generator handles stripping + chunking. Keeps the API routes thin.

3. **MP3 concatenation via `Buffer.concat`**. MP3 frames are independent — naive byte concatenation produces a valid MP3 that plays continuously across chunk boundaries. No need for segment playlists or re-muxing. Trade-off: no gapless playback metadata, but for narration (no music) this is imperceptible.

4. **Duration estimated from char count** rather than parsing MP3 frames. `chars / 15 / speed ≈ seconds` for English narration. The client `<audio>` element's `loadedmetadata` event provides the real duration once playback starts; the estimate is only used by the admin dashboard before playback.

5. **Player probes `/api/tts/[slug]`** (returns 404 cleanly) instead of HEAD-fetching `/audio/<slug>.mp3` (which would 200 even on missing files in some Next configs). Once existence is confirmed, the audio element's `src` points at the static `/audio/<slug>.mp3` for actual playback — faster than routing bytes through the API.

6. **Bulk generation runs sequentially**, not in parallel. ZAI TTS is slow (~5s per chunk) and parallel calls risk triggering their rate limit. Sequential is slower (5–10 min for full set) but reliable. The 1-batch-per-10-min rate limit on this endpoint prevents accidental parallel batches from a double-clicking admin.

7. **Narration text composition**: title + conciseAnswer + keyTakeaways (prefixed with "Key takeaway N.") + body. The excerpt is skipped (it's a summary of the body — narrating both is redundant). FAQs and references are skipped — they don't translate well to a flowing narration and add 5+ minutes per article.

## Stage summary

- 25 articles + 3 pillar guides are now audio-narratable. Admin can generate narrations per-slug or in bulk via `/admin/tts`.
- Readers see a minimal editorial audio player at the top of every article/guide page; the player self-hides if no narration exists yet, so the UX is clean for un-narrated content.
- All 7 TTS voices (tongtong, chuichui, xiaochen, jam, kazi, douji, luodo) are selectable per generation.
- Rate-limited at two levels: 5/hr/IP for single-article generation (admin), 1/10min/IP for bulk generation (admin).
- Public audio endpoint streams MP3s with 24h cache headers — friendly to CDN edge caching.
- TS clean (0 errors in M6-c files), lint clean (0 warnings in M6-c files), dev server healthy, all route guards verified via curl.
