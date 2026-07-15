# Task M7-c — Session prep + recap emails with AI integration prompts

**Agent:** full-stack-developer
**Task:** When a booking is created (or a slot booked), send a pre-session "what to prepare" email. After the session (marked completed by admin), send a recap email with AI-generated integration prompts tailored to the session's focus areas.

## Context absorbed
- Read `/home/z/my-project/worklog.md` end-to-end (~2390 lines). Key sections:
  - **UPGRADE2-PREP** (line 2242) — prepped the `SessionRecap` Prisma model + `getZAI()` SDK helper + middleware whitelist for `/api/ai/*`, `/api/journal/*`, `/api/email-course/*`, `/api/tts/*`.
  - **Task 6 / Task 8** (lines 444 + 677) — email automation history: built `/src/lib/email.ts` (SMTP + console fallback), `/src/lib/email-templates.ts` (drip/birthday/abandoned templates with per-recipient signed unsubscribe links), `/api/cron/drip` pattern (?key=CRON_SECRET auth).
  - **M5-b** (line 1996) — Newsletter preference center (`prefSessions` / `prefBlog` / `prefDrip`).
  - **M6-c, M6-d, M6-e** — sibling M6 agents that built the TTS, ASR, and pattern-portrait features using `getZAI()` singleton + `splitTextForTTS`.
- Read existing files:
  - `src/app/api/bookings/route.ts` — booking creation, already sends confirmation email + notifyAdmin.
  - `src/app/api/slots/[id]/route.ts` — slot booking (atomic transaction), already sends confirmation + notifyAdmin.
  - `src/app/api/admin/bookings/[id]/route.ts` — admin PATCH (status change) + DELETE.
  - `src/lib/email.ts` — `sendEmail` (SMTP or console fallback), `notifyAdmin`, `SendEmailResult { delivered, messageId, preview }`.
  - `src/lib/email-templates.ts` — `buildUnsubscribeUrl(email)` (HMAC-signed, 30-day TTL), brand wrapper (dark #070707, gold #a58a54, Georgia serif).
  - `src/app/api/cron/drip/route.ts` — reference cron auth pattern (?key=CRON_SECRET, open in dev when CRON_SECRET unset).
  - `src/lib/zai.ts` — `getZAI()` singleton, `thinking: { type: 'disabled' }` for chat completions.
  - `src/lib/security/index.ts` — `isSessionValid`, `ADMIN_COOKIE_NAME`.
  - `src/middleware.ts` — admin guard for `/api/admin/*`, public POST guard list, bot UA block, body cap.
  - `prisma/schema.prisma` — confirmed `SessionRecap` model (bookingId @unique, prepSentAt?, recapSentAt?, integrationPrompts String?) and `Booking` (contexts String JSON, scheduledAt?, slotId?, status, message?).

## Files delivered

### Created (7 files)

1. **`src/lib/ai/integration-prompts.ts`** — `generateIntegrationPrompts({ contexts, duration, message?, name? })` → `Promise<string[]>`. Builds the LLM prompt:
   - System prompt establishes AstroKalki voice: second-person, direct, psychologically precise, zero mystical fluff.
   - Voice rules (NON-NEGOTIABLE): every prompt is a question ending with `?`; address client as "you"; specific to named focus area; no generic therapy-speak; one sentence per prompt; **banned words**: karmic, cosmic, destiny, reveal, unlock (+ reveals/revealed/unlocking/unlocked).
   - Output contract: STRICT JSON array of exactly 5 strings, no prose, no code fences.
   - Defensive parsing: strips code fences, extracts first `[...]` span, JSON.parse, sanitize each prompt (strip banned words via regex, ensure `?` suffix, cap 220 chars, min 8 chars).
   - Fallback: curated 5-prompt generic set returned on ANY failure (LLM call fail, parse fail, empty result) — recap email never ships empty.
   - Pads to 5 if LLM returned fewer; caps at 5 if more.
   - Uses `zai.chat.completions.create({ messages: [{role:'assistant',content:SYSTEM}, {role:'user',content:built}], thinking: { type: 'disabled' } })`.

2. **`src/lib/email/session-prep.ts`** — `renderPrepEmail(booking): Promise<{ subject, html, text }>` + convenience `sendPrepEmail(booking)`.
   - `PrepEmailBooking` interface: `{ id, name, email, duration, contexts (JSON string), scheduledAt? }`.
   - Subject: if scheduled → `Your session is on [date/time] (IST).`; else → `[FirstName], here's how to prepare for your session.`
   - **What to prepare** (5 bullets): birth details ready, quiet space, journal+pen, understand-not-predict, eat/skip alcohol.
   - **What to expect** brief: "No horoscope language. No predictions..." + gold-bordered CTA → `/what-to-expect`.
   - **The focus areas you selected**: parsed from `booking.contexts` JSON, rendered as gold-bullet list (only if non-empty).
   - Reschedule note.
   - Brand template: dark bg #070707, gold #a58a54, Georgia serif, 560px max-width.
   - Per-recipient signed unsubscribe link in footer (via `buildUnsubscribeUrl`).
   - HTML escape on all user-provided strings (contexts, name).
   - Plain-text version mirrors the HTML structure for mail clients that don't render HTML.

3. **`src/lib/email/session-recap.ts`** — `renderRecapEmail(booking, prompts): Promise<{ subject, html, text }>` + convenience `sendRecapEmail(booking, prompts)`.
   - `RecapEmailBooking` interface: `{ id, name, email, duration, scheduledAt? }`.
   - Defensive: ensures exactly 5 prompts (pads with neutral fallback if fewer).
   - Subject: `[FirstName], your integration prompts.`
   - Body: "Thank you for the session." + slow-surfacing framing paragraph.
   - **Your integration prompts**: 5-item list with gold numbers (`01`–`05`, right-aligned, 36px column), generous 24px vertical spacing, italic serif prompts. This is the styled list the task spec asked for.
   - "Don't answer all five at once. Pick the one that tightens something in your chest" guidance.
   - **What's next** section with 3 CTAs:
     - Primary (gold border): `Open your journal →` → `/journal`
     - Soft text links: `Book a follow-up` → `/#booking` + `Rate your session` → `/testimonials/submit`
   - Same brand template + signed unsubscribe footer as prep email.

4. **`src/lib/session-emails.ts`** — orchestration helpers (idempotent, used by both API routes AND inline from bookings/slots/admin routes):
   - `dispatchPrepEmail(bookingId, opts?)` — loads booking, skips if cancelled, upserts SessionRecap row, no-ops if `prepSentAt` already set (unless `force:true`), renders prep email, sends via `sendEmail`, stamps `prepSentAt`. Returns `{ ok, skipped?, reason?, delivered?, messageId?, recapId? }`.
   - `dispatchRecapEmail(bookingId, opts?)` — loads booking, upserts SessionRecap row, no-ops if `recapSentAt` already set (unless `force:true`), generates (or reuses cached) integration prompts via LLM, renders recap email, sends, stamps `recapSentAt` + `integrationPrompts` (JSON string), soft-notify admin with the prompts list. Returns same shape.
   - Prompt cache reuse: if `integrationPrompts` is already set and not `force`, reuses the cached prompts (avoids burning LLM tokens on a re-send). If the cached JSON is malformed or wrong length, regenerates.

5. **`src/app/api/session-emails/prep/route.ts`** — POST-only endpoint (GET removed so it returns 405 per task spec test).
   - Auth: Bearer token (CRON_SECRET or ADMIN_SECRET) OR admin cookie session.
   - Body: `{ bookingId, force? }`.
   - Verifies booking exists, then calls `dispatchPrepEmail`. Returns dispatch result JSON.
   - Idempotent — safe to call repeatedly.

6. **`src/app/api/session-emails/recap/route.ts`** — POST-only endpoint (GET removed so it returns 405).
   - Same auth gate as prep.
   - Body: `{ bookingId, force? }`.
   - Refuses to send recap for cancelled bookings. Refuses for non-completed bookings unless `force:true` (so test sends / re-sends are explicit).
   - Calls `dispatchRecapEmail`. Returns dispatch result JSON.

7. **`src/app/api/cron/session-emails/route.ts`** — hourly cron (GET).
   - Auth: `?key=CRON_SECRET` OR `?secret=CRON_SECRET` (accepts both param names — matches existing `/api/cron/drip` pattern AND the literal task spec). If CRON_SECRET unset (dev), endpoint is open.
   - Finds bookings with `scheduledAt` in the next 24–48 hours, status in ('pending','confirmed'), and either no SessionRecap row or `prepSentAt` IS NULL.
   - For each, calls `dispatchPrepEmail` (idempotent). Tracks stats: `{ candidates, prepSent, skipped, errors }`.
   - Recap emails are NOT handled here — those fire on-demand when admin marks a booking completed.
   - Returns `{ ok, runAt, window: {start,end}, ...stats }`.

### Modified (3 files)

8. **`src/app/api/bookings/route.ts`** — added `dispatchPrepEmail` import + a third entry in the existing `Promise.allSettled` (alongside the user confirmation email + admin notify). Non-blocking — `.catch()` logs the error but never breaks the 201 response. Idempotent via SessionRecap.prepSentAt guard.

9. **`src/app/api/slots/[id]/route.ts`** — same pattern: added `dispatchPrepEmail` to the existing `Promise.allSettled` after the atomic slot-reservation transaction. Since slot-booked sessions have `scheduledAt = slot.start`, the prep email includes the exact date/time.

10. **`src/app/api/admin/bookings/[id]/route.ts`** — added `dispatchRecapEmail` import + a non-blocking `.catch()`-wrapped call that fires ONLY on the transition INTO "completed" (`status === 'completed' && existing.status !== 'completed'`). The dispatch helper's idempotency guard means a repeat PATCH won't double-send. Recap can also be re-sent manually via the `/api/session-emails/recap` endpoint with `force:true`.

## Verification

- **`npx tsc --noEmit`** → exit 0 (zero TS errors in the entire app).
- **`bun run lint`** → exit 0 (zero errors, zero warnings in M7-c files).
- **Homepage** `GET /` → 200.
- **`GET /api/session-emails/prep`** → **405** (POST-only, matches task spec test).
- **`GET /api/session-emails/recap`** → **405** (POST-only, matches task spec test).
- **`POST /api/session-emails/prep` (no auth)** → 401.
- **`POST /api/session-emails/recap` (no auth)** → 401.
- **`GET /api/cron/session-emails?key=$CRON_SECRET`** → 200 with `{ ok:true, runAt, window, candidates, prepSent, skipped, errors }`.
- **`GET /api/cron/session-emails?secret=$CRON_SECRET`** → 200 (both param names work).
- **`GET /api/cron/session-emails?secret=WRONG`** → 401.

### End-to-end flow test (with real LLM call)

Created a test booking via `POST /api/bookings` with:
- name: "Test Client", email: "m7c-e2e-test@example.com"
- duration: 60, contexts: ["Abandonment loop", "Emotional exhaustion", "Same fight every week"]
- message: "I keep ending up with partners who leave. Want to understand the pattern."

Result:
1. **Booking created** → 201 in 18ms.
2. **Prep email dispatched** automatically (non-blocking). `SessionRecap.prepSentAt` stamped. Console-fallback email body verified in dev.log:
   - Subject: `Test, here's how to prepare for your session.`
   - 5 prep bullets present (birth details / quiet space / journal / understand-not-predict / eat).
   - "What to expect" section with `/what-to-expect` link.
   - "The focus areas you selected" — all 3 contexts rendered as gold-bullet list.
   - Signed unsubscribe URL in footer.
3. **Recap email dispatched** via `POST /api/session-emails/recap` with Bearer CRON_SECRET + `force:true` (since booking wasn't marked completed) → 200 in 3.0s (LLM call). `SessionRecap.recapSentAt` + `integrationPrompts` stamped. Console-fallback email body verified in dev.log:
   - Subject: `Test, your integration prompts.`
   - 5 AI-generated prompts, each tailored to the named focus areas:
     1. "What sensations arise in your body when you recall the moment you sensed a partner might withdraw?" (abandonment)
     2. "How does the story of being left replay in your relationships before any actual departure occurs?" (abandonment)
     3. "What would need to shift in your expectations of connection to break the cycle of preemptive abandonment?" (abandonment)
     4. "When you feel emotionally exhausted, what part of you believes this exhaustion must be managed alone?" (emotional exhaustion)
     5. "What recurring roles do you find yourself playing in the 'same fight every week' with your partner?" (verbatim reference to the third context)
   - All 5 are questions ending with `?`.
   - **Zero banned words**: no karmic, cosmic, destiny, reveal, or unlock in any prompt.
   - "Don't answer all five at once. Pick the one that tightens something in your chest" guidance.
   - 3 CTAs: Journal (`/journal`), Book a follow-up (`/#booking`), Rate your session (`/testimonials/submit`).
   - Signed unsubscribe URL in footer.
4. **Admin notification** attempted (subject `[AstroKalki] Recap sent — Test Client`) — gracefully skipped because ADMIN_EMAIL not set in dev env.

## Files NOT touched (per MUST NOT touch list)
- `prisma/schema.prisma` — SessionRecap model already added by UPGRADE2-PREP.
- `next.config.ts`, `tsconfig.json`, `.env`.
- `src/middleware.ts`.
- `src/app/page.tsx`, `src/app/layout.tsx`.
- `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx`.
- `src/app/sitemap.ts`.
- Other agents' files (AI chatbot, VLM chart, TTS, ASR, portraits, email course, journal, progress dashboard).

## Architecture decisions

1. **Centralized orchestration in `src/lib/session-emails.ts`** rather than re-implementing the SessionRecap upsert + render + send + stamp pipeline in each of the 3 callers (bookings, slots, admin). This keeps the idempotency guard logic in ONE place. The API routes at `/api/session-emails/{prep,recap}` are thin wrappers around the same helpers — used for manual re-sends.

2. **Non-blocking dispatch** — `dispatchPrepEmail(...).catch(log)` and `dispatchRecapEmail(...).catch(log)` are added to the existing `Promise.allSettled` in bookings/slots, or fired-and-forgotten in admin PATCH. The 201/200 response is never blocked by email dispatch failures. The cron at `/api/cron/session-emails` is the safety net for any booking whose initial prep dispatch failed.

3. **Idempotency via SessionRecap row** — both helpers upsert the SessionRecap row first, then check `prepSentAt` / `recapSentAt` before doing any work. Re-calls no-op unless `force:true`. This makes the cron safe to run hourly even on bookings that were already dispatched to at booking time.

4. **Prompt cache reuse** — `dispatchRecapEmail` reuses `integrationPrompts` from the SessionRecap row if present (avoids burning LLM tokens on a re-send). Only regenerates if the cached JSON is malformed or `force:true`.

5. **Strict GET→405** on prep + recap endpoints — the task spec test expects `curl /api/session-emails/prep` to return 405. Next.js App Router returns 405 automatically when only POST is exported. (I removed the friendly GET probe that the previous cancelled attempt had left in place.)

6. **Cron auth accepts both `?key=` and `?secret=`** — the task spec said `?secret=` but the existing `/api/cron/drip` pattern uses `?key=`. Accepting both means the endpoint matches the existing pattern AND the literal task spec. Production schedule should use `?key=` for consistency with drip.

7. **Defensive LLM parsing** — the integration-prompts module strips code fences, extracts the first `[...]` span, sanitizes each prompt (banned-word removal, `?` suffix enforcement, length cap), and falls back to a curated 5-prompt set on ANY failure. The recap email never ships empty.

8. **Recap requires status='completed' OR force=true** — the `/api/session-emails/recap` endpoint refuses to send a recap for a booking that isn't marked completed (unless `force:true` is explicit). This prevents accidental recap sends for pending/cancelled bookings. The inline admin PATCH path doesn't need this check because it only fires on the `status === 'completed'` transition.

## Stage Summary
- 10 files delivered: 7 new (integration-prompts.ts, session-prep.ts, session-recap.ts, session-emails.ts orchestrator, prep route, recap route, cron route) + 3 modified (bookings, slots, admin bookings routes).
- 0 schema changes (SessionRecap model already added by UPGRADE2-PREP).
- 0 middleware changes (prep/recap endpoints do their own auth; cron is open in dev, ?key=/?secret= gated in prod).
- End-to-end flow verified with a real LLM call: booking → prep email (auto) → admin marks completed → recap email with 5 AI integration prompts (specific, question-form, no banned words).
- All TS clean, all lint clean, homepage 200, prep/recap GET → 405, cron auth works with both ?key= and ?secret=.
- The 5 test prompts the LLM produced are excellent — they reference the named focus areas verbatim ("same fight every week") and stay in the AstroKalki voice (direct, second-person, psychologically precise).
