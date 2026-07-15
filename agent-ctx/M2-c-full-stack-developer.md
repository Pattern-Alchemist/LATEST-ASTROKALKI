# Task ID: M2-c (continuation pass) — Agent: full-stack-developer

## Task
Referral tracking UI — **continuation pass**. The previous M2-c agent built the
full referral system (8 new files + 2 modified) but explicitly noted three
integration gaps as out-of-scope: footer /refer link, admin/page.tsx
/admin/referrals nav button, booking.tsx ?ref=CODE pre-fill. This pass closes
all three, plus adds an optional ?email= filter to /api/admin/referrals.

## What was built (this pass)

### Files MODIFIED (no new files — this is integration work, not new build)

- **`src/components/astrokalki/footer.tsx`** — added a "Refer a friend" link
  in the Connect column (5th column, under WhatsApp number + Book session link).
  Same `text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors`
  pattern as other footer links. `title` attribute for accessibility.

- **`src/app/admin/page.tsx`** — added a 4th header button (Link to
  /admin/referrals) sitting between Analytics and View Site. Same
  `btn-outline-gold` class as Testimonials + Analytics. Icon: `Users` (already
  imported). Label `hidden sm:inline` on mobile. Title: "Referral programme
  dashboard".

- **`src/components/astrokalki/booking.tsx`** — wired the booking flow to the
  referral system. 7 sub-changes:
    1. Added `referredBy: ""` to formData state.
    2. useEffect on mount reads `?ref=CODE` from `window.location.search`
       (deliberately NOT `useSearchParams` to avoid Suspense boundary on the
       parent homepage). Normalises: trim → uppercase → cap at 32 chars.
    3. Added `referredBy: formData.referredBy || undefined` to the payload sent
       to both /api/bookings and /api/slots/[id] (both APIs already accept it).
    4. Added a subtle "You were referred" banner at the top of step 4 when
       referredBy is set (gold border + ✦ glyph + Cinzel eyebrow + body text
       explaining the referrer earns a free 30-min follow-up).
    5. Added an explicit "Referred by (optional)" input field below the
       message textarea in step 4. Mono font + uppercase transform to match
       codes visually. Placeholder "e.g. MXDMN4RH". maxLength 32. Lets users
       without a ?ref link still type a code manually, and lets users with one
       edit or clear it.
    6. Added a "Referral" line to the step 5 confirmation summary (between
       Focus areas and Investment) showing the code in mono gold when set.
    7. Updated the post-success reset handler to preserve referredBy (URL still
       has ?ref=CODE, useEffect only runs on mount — preserving lets a re-book
       in the same session keep the code).

- **`src/app/api/admin/referrals/route.ts`** — added optional `?email=` filter
  to GET. Reads `email` from searchParams, trims + lowercases + caps at 254,
  builds Prisma `where: { referrerEmail: { contains: emailFilter } }`. Filter
  applies to paginated list + row count, NOT to global stats (totalReferrals,
  totalUses, topReferrer remain programme-wide so dashboard totals stay
  consistent while filtering).

## What was NOT touched (per task constraints)
- `prisma/schema.prisma` — already prepped by UPGRADE-M1.
- `src/middleware.ts` — already whitelisted /api/referrals.
- `next.config.ts`, `tsconfig.json`, `.env` — out of scope.
- `src/app/page.tsx`, `src/app/layout.tsx` — out of scope.
- `src/components/astrokalki/navigation.tsx` — out of scope (the /refer link
  will be added there by the coordinator in final consolidation, per prior
  M2-c notes).
- `src/app/sitemap.ts` — out of scope (same reason).
- The 8 files the previous M2-c agent built — left entirely untouched. This
  pass is purely additive integration work.

## Files the previous M2-c agent built (left untouched, all functional)
- `/src/app/refer/page.tsx` — editorial hub: hero + 3 numbered steps + form +
  stats lookup + 5-question FAQ.
- `/src/app/refer/ReferralForm.tsx` — react-hook-form + Zod, name + email →
  POST /api/referrals → success state with code in mono gold + Copy button +
  WhatsApp share + uses counter + "Generate another" reset.
- `/src/app/refer/ReferralStats.tsx` — inline email-lookup widget, posts to
  GET /api/referrals?email=... and shows code + uses + last-used date.
- `/src/app/admin/referrals/page.tsx` — server component, direct DB read, 4
  StatCards + sort tabs (Most used / Recently used / By name) + table + Export
  CSV link.
- `/src/app/admin/referrals/ReferralRow.tsx` — client expandable table row
  showing per-use history.
- `/src/app/api/referrals/route.ts` — POST (crypto-random 8-char code, idem-
  potent by email, Zod + honeypot + rate-limit 5/hour/IP) + GET ?email=
  (rate-limit 30/min/IP).
- `/src/app/api/referrals/[code]/route.ts` — public lookup by code, format-
  validated `/^[A-Z2-9]{8}$/` to avoid leaking existence via format errors.
- `/src/app/api/referrals/track/route.ts` — idempotent use recorder inside a
  transaction (no double-count on same email + code).
- `/src/app/api/admin/export/route.ts` — `type=referrals` branch (modified by
  prior M2-c, not this pass).

## Design decisions
- **`window.location.search` over `useSearchParams`** — the Booking component
  renders inside the homepage (`src/app/page.tsx`), which is statically
  rendered. Using `useSearchParams` in a client component within a static
  page requires wrapping it in a Suspense boundary, which would force a
  refactor of the homepage. Reading `window.location.search` in a useEffect
  achieves the same goal (read the ?ref=CODE param) with zero Suspense
  requirements. The trade-off is one extra client-side render after mount to
  apply the pre-fill, which is invisible to the user.
- **Preserve referredBy on reset** — when the user clicks "Reset" after a
  successful booking, the formData is cleared but referredBy is preserved.
  Reasoning: the URL still has ?ref=CODE (the user is still on /?ref=CODE),
  but the useEffect only runs on mount, so a fresh reset would lose the code.
  Preserving it lets a re-book in the same session keep the code, which is
  the more intuitive behavior. If the user wants to clear it, they can edit
  the field.
- **Stats remain global when ?email= filter is applied** — when the admin
  filters /api/admin/referrals by email, the row list + pagination narrow to
  matching rows, but the headline stats (totalReferrals, totalUses,
  topReferrer) stay programme-wide. This avoids the confusing UX of "I
  filtered to one referrer and the total referrals count dropped to 1."
- **`referredBy || undefined` in the payload** — sending `undefined` (rather
  than empty string) means JSON.stringify omits the key entirely, so the
  booking API never sees a `referredBy: ""` value. The API's Zod schema
  treats `referredBy` as optional, and `referredBy || null` in the DB write
  handles both cases cleanly.
- **Referred-by input as a separate field below the message textarea, not in
  the grid** — keeps the 6 essential intake fields in the 2-col grid (name,
  email, phone, birthDate, birthTime, birthPlace) and treats the referral
  code as a separate optional context line. Putting it in the grid would
  make the grid uneven (7 fields → odd row).

## Verification
- `npx tsc --noEmit`: 0 errors in my files. The only error is pre-existing:
  `.next/types/validator.ts(530,39)` references a missing
  `../../src/app/api/admin/upload/route.js` (stale Next.js validator type —
  not in my scope, not caused by my changes).
- `bun run lint`: 0 errors in my files. All 21 lint errors are pre-existing:
  `footer.tsx` line 10 (`setYear(new Date().getFullYear())` in useEffect —
  was there before my edit; I only added a Link in the JSX),
  `insights.tsx` line 81, `page.tsx` line 32, `custom-server.js`,
  `lightweight-server.js`, and 16 in `workspace-analysis/extracted/*`.
- Smoke tests (curl with browser UA):
    - `GET /` → 200 (homepage renders).
    - `GET /?ref=TESTCODE1` → 200 (booking form will auto-fill referredBy on
      client hydration).
    - `GET /refer` → 200 (existing /refer page still renders).
    - `GET /admin/referrals` (no cookie) → 307 redirect to /admin/login.
    - `GET /api/admin/referrals` (no cookie) → 401 "Unauthorized — admin
      session required".
    - `GET /api/referrals?email=nonexistent@example.com` → 404 `{valid:false}`
      (existing email-lookup endpoint still works — used by /refer stats
      widget).
- Bundle verification: grepped .next/static/chunks/*.js to confirm
  "Refer a friend" is in the footer chunk and "/admin/referrals" is in the
  admin-page chunk. Both present.

## Files produced (this pass)
- `/home/z/my-project/src/components/astrokalki/footer.tsx` (modified — added
  Refer a friend link)
- `/home/z/my-project/src/app/admin/page.tsx` (modified — added Referrals
  nav button)
- `/home/z/my-project/src/components/astrokalki/booking.tsx` (modified —
  added referredBy field + ?ref=CODE auto-fill + banner + summary line +
  reset-preserve)
- `/home/z/my-project/src/app/api/admin/referrals/route.ts` (modified — added
  optional ?email= filter)

## Notes for the coordinator
- The referral loop is now fully closed end-to-end: visitor lands on /refer →
  generates code → shares via WhatsApp / clipboard → recipient clicks link →
  lands on /?ref=CODE → booking form auto-fills referredBy + shows banner →
  user books → /api/bookings or /api/slots/[id] persists referredBy on the
  Booking record → admin sees the booking in /admin and the referral in
  /admin/referrals.
- The /refer link is still NOT in `navigation.tsx` (the main site nav) — that
  file is explicitly out-of-scope for this task per the constraints. The
  coordinator should add it in final consolidation alongside the prior M2-c
  agent's note about sitemap.ts.
- The /api/referrals/track endpoint exists but is NOT yet called by the
  booking flow. When a booking is created with a referredBy code, the
  Booking record gets the code in its `referredBy` column, but no
  ReferralUse row is created and the Referral.uses counter is NOT
  incremented. The /admin/referrals page accounts for this honestly (the
  ReferralRow component shows a note explaining the counter can be ahead of
  the tracked-use list). Wiring the booking flow to call
  /api/referrals/track (or replicate its logic in /api/bookings/route.ts
  and /api/slots/[id]/route.ts) is the natural next step for full
  attribution — but it touches files owned by other agents (booking API,
  slots API) and was not in this pass's scope.
- The booking form's `referredBy` field now writes to the DB via the existing
  /api/bookings and /api/slots/[id] routes (both already accept it). This
  means referral codes ARE captured on Booking rows from this pass forward,
  even without the /api/referrals/track wiring. A future SQL query like
  `SELECT referredBy, COUNT(*) FROM Booking WHERE referredBy IS NOT NULL
  GROUP BY referredBy` would give the publisher a use count per code.
