# M2-d — RecordedReading admin (upload / attach / secure playback)

Task ID: **M2-d**
Agent: full-stack-developer
Scope: Build the complete admin + client flow for RecordedReading audio files.

## Files created (13)

### Security lib
- `src/lib/security/playback-token.ts` — Web Crypto HMAC-SHA256 signed playback tokens. Token = `<base64url(hmac)>.<expires>` where hmac is computed over `${recordingId}:${expires}`. 24h TTL. Mirrors the pattern in `auth.ts` so the same code works in both Edge and Node runtimes.

### Admin API
- `src/app/api/admin/recordings/route.ts` — GET (paginated list with optional `?bookingId=` filter, includes booking name+email) + POST (create metadata row, validates audioUrl must start with `/recordings/`, verifies bookingId exists before linking).
- `src/app/api/admin/recordings/[id]/route.ts` — GET single + PATCH (title/duration/price/bookingId) + DELETE (removes DB row AND deletes the audio file from `public/recordings/`). Path-traversal safe: audioUrl is re-validated to resolve strictly inside `public/recordings/` before any unlink.
- `src/app/api/admin/upload/route.ts` — multipart/form-data upload of a single `audio` file. 50MB cap. Validates MIME (`audio/*`) + extension (mp3/m4a/wav/ogg/flac/aac/weba). Saves to `public/recordings/<uuid>.<ext>` via `randomUUID()`. Returns `{url, filename, originalName, size, mimeType}`. The 4KB public-POST cap doesn't apply — admin routes are excluded from `isPublicPostApi` in middleware.
- `src/app/api/admin/bookings/route.ts` — GET bookings search (`?search=&limit=`) used by the recording manager's booking picker combobox. Searches across name OR email, returns 7 fields (id, name, email, duration, price, status, scheduledAt, createdAt), capped at 50.

### Public playback API
- `src/app/api/recordings/[id]/route.ts` — GET. Auth-gated by signed token (`?token=<sig>.<expires>`). Looks up recording → verifies HMAC + expiry (constant-time via Web Crypto) → resolves audio file path defensively → streams with `Content-Type` + `Content-Range` support so HTML5 `<audio>` can seek. 206 Partial Content for Range requests, 200 for full file.
- `src/app/api/recordings/[id]/token/route.ts` — POST `{email}`. Validates email matches the recording's booking email. Rate-limited (10/hour per IP+email). 404 for unknown recording, 403 for no-booking recordings, 403 for email mismatch. Returns `{token, expires, url, expiresInMs}`.

### Admin UI (dark editorial)
- `src/app/admin/recordings/page.tsx` — Server component. Reads `?filter=all|attached|unattached`. Stats tiles (total / total duration / unattached). Filter tabs as Link components. Mounts `<RecordingManager />` and `<RecordingsTable>`.
- `src/app/admin/recordings/RecordingManager.tsx` — Client. Upload form: file picker (drag-style), title, duration presets + custom, price, booking picker (debounced server-side search via `/api/admin/bookings?search=`). Two-step submit: POST file → `/api/admin/upload` (XHR with onprogress), then POST metadata → `/api/admin/recordings`. Progress bar + done state.
- `src/app/admin/recordings/RecordingPlayer.tsx` — Client. Minimal custom audio player (gold play button, click-to-seek progress bar, volume, restart). For attached recordings: fetches a signed token via the booking email so we exercise the real client path. For unattached: falls back to direct `/recordings/<file>` URL (admin is already cookie-authed).
- `src/app/admin/recordings/RecordingsTable.tsx` — Client. Each row: title, duration, price, attached booking (name + email + status), play/edit/delete actions. Inline edit form (title/duration/price + booking picker). Delete confirms then DELETE → `router.refresh()`.

### Client UI
- `src/app/account/RecordingsList.tsx` — Client. Lists recordings tied to the signed-in member's email. Each row has a "Listen" button → fetches signed token → expands an inline custom audio player (gold accents, no default browser styling). On 403 (expired token), shows a "Refresh access" button to re-issue.

### Modified files (1)
- `src/app/account/page.tsx` — Added a parallel `db.recordedReading.findMany({where:{booking:{email}}})` to the existing Promise.all. Added "Your recordings" section between Session history and Email preferences (Roman numerals auto-adjust: III/IV for recordings, IV/V for email prefs based on whether Subscription management section is shown).

## Verification

### TypeScript
- `npx tsc --noEmit` → exit 0 (zero errors in any file)
- Pre-existing `.next/types/validator.ts` error (references a non-existent `unsubscribe/route.ts`) was NOT my issue and is now resolved (dev server regenerated the validator).

### ESLint
- `bun run lint` → zero errors in any of my new files. (21 pre-existing errors in `page.tsx`, `footer.tsx`, `insights.tsx`, `scripts/`, `workspace-analysis/` — all owned by other agents or in excluded dirs.)

### Functional tests (all passing)
- `/admin/recordings` without cookie → 307 redirect to `/admin/login` ✓
- `/admin/recordings` with admin cookie → 200, renders all UI markers (Admin · Recordings, Recorded sessions, Total recordings, Unattached, Upload a recording, Upload new) ✓
- `/api/admin/recordings` without cookie → 401 "Unauthorized — admin session required" ✓
- `/api/admin/upload` without cookie → 401 ✓
- Upload a 5KB test MP3 with admin cookie → 201 with `{url, filename, size, mimeType}` ✓
- Uploaded file is reachable at `/recordings/<uuid>.mp3` (200, audio/mpeg, correct size) ✓
- POST `/api/admin/recordings` with admin cookie → 201, creates row with `booking: null` ✓
- GET `/api/admin/recordings` → list with pagination metadata ✓
- PATCH `/api/admin/recordings/[id]` (rename + price change + attach bookingId) → 200, returns updated row with booking details ✓
- POST `/api/recordings/[id]/token` with matching email → 200, returns signed token + url ✓
- POST `/api/recordings/[id]/token` with wrong email → 403 "This email does not match..." ✓
- POST `/api/recordings/[id]/token` for recording with no booking → 403 "not yet available" ✓
- POST `/api/recordings/[id]/token` for unknown recording → 404 "Recording not found" ✓
- POST `/api/recordings/[id]/token` with invalid email → 400 Zod error ✓
- POST `/api/recordings/[id]/token` 11 times → 429 on the 11th (rate-limit working) ✓
- GET `/api/recordings/[id]` with valid token, no Range → 200, full file, audio/mpeg ✓
- GET `/api/recordings/[id]` with valid token + `Range: bytes=0-99` → 206, 100 bytes, `Content-Range: bytes 0-99/5124` ✓
- GET `/api/recordings/[id]` with invalid token → 403 ✓
- GET `/api/recordings/[id]` with no token → 403 ✓
- DELETE `/api/admin/recordings/[id]` → `{success: true, audioFileRemoved: true}`, file removed from disk ✓
- End-to-end test: book → upload → create recording with bookingId → admin page renders "Attached" + booking details → token endpoint issues signed URL for matching email ✓
- `/account` signed-out renders correctly with all sign-in markers ✓

### Files NOT touched (per task spec)
- `prisma/schema.prisma` ✓ (RecordedReading was already there from UPGRADE-M1)
- `src/middleware.ts` ✓ (admin routes already auth-gated; no need to touch)
- `next.config.ts`, `tsconfig.json`, `.env` ✓
- `src/app/page.tsx`, `src/app/layout.tsx` ✓
- `src/components/astrokalki/navigation.tsx`, `footer.tsx` ✓
- `src/app/sitemap.ts` ✓
- `src/app/admin/page.tsx` ✓ (DO NOT modify — owned by other agents; recordings route is reachable via URL only)

## Design system adherence
- Background `#050505`, gold `#c9a96e`, text `#f0eee9`/`#9a9a9a`/`#7a7a7a`
- Playfair Display serif for headlines, Cinzel-free editorial labels (`tracking-[0.3em]` uppercase), monospace for IDs/durations/timestamps
- Audio player: minimal dark, gold gradient progress bar, gold play button. NO default browser audio styling.
- Forms: borderless underline inputs (`border-b border-white/[0.08] focus:border-[#c9a96e]/60`)
- NO blue/indigo anywhere
- Responsive: mobile-first (grid-cols-1 → sm:grid-cols-2/3/12)
- Sticky footer (`mt-auto`) on /admin/recordings

## Security notes
- Playback tokens bind `recordingId` into the HMAC so a token issued for recording A cannot be replayed against recording B.
- Tokens expire after 24h; clients can re-request via the token endpoint.
- Rate limit on token issuance (10/hour per IP+email) prevents enumeration attacks.
- Audio files live under `public/recordings/` (statically served by Next.js) BUT the URLs are unguessable UUIDs AND the production playback flow always goes through the signed-token endpoint. The direct URL is only used as an admin-only fallback when a recording has no booking.
- Path traversal is prevented: `safeResolveAudioPath()` validates that `audioUrl` starts with `/recordings/` AND that the normalized absolute path stays inside `public/recordings/` before any file operation.
- DELETE removes the DB row first (atomic), then attempts file cleanup. If cleanup fails the row is already gone — orphaned files can be cleaned by an admin script later.

## Operational notes
- All admin routes inherit the existing `/api/admin/*` middleware auth + Origin check + security headers. No new middleware code needed.
- Audio file storage is local disk under `public/recordings/`. For production at scale this should move to object storage (S3/R2) with presigned URLs — but for the current single-instance deployment, local disk is correct and simpler.
- The 50MB upload cap is enforced both client-side (RecordingManager checks `file.size` before upload) and server-side (the upload route checks `file.size` after `formData()` parse and returns 413 if exceeded).
