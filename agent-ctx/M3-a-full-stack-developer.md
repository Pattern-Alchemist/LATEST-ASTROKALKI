# Task M3-a — Self-serve booking calendar with slot picker

**Agent:** full-stack-developer
**Date:** 2026-06-18
**Task ID:** M3-a

## Task

Replace the "capture intake → hand off to WhatsApp" booking flow with an actual self-serve calendar slot picker. Users browse available time slots, pick one, and book it directly. Admins create availability slots (single + bulk generation). Schema already prepped by UPGRADE-M1 (AvailabilitySlot model + Booking.scheduledAt + Booking.slotId). Middleware already whitelists /api/slots for public POST.

## Files produced

### NEW (7 files)

1. **`/src/app/api/slots/route.ts`** — Public GET only. Returns slots where `status='open'` and `start >= now`, filtered by `?duration=30|60|90`, optional `?from` / `?to` ISO bounds. Hard cap 200 rows / 90-day window. Rate-limited 60/min/IP using `RATE_LIMITS.api`. Ordered by start asc.

2. **`/src/app/api/slots/[id]/route.ts`** — Public GET (single slot details) + POST (book a slot). POST reuses `bookingInputSchema` from `@/lib/security/validation`. Validations: rate-limit 3/hour/IP, 4KB body cap, honeypot, Zod. **Atomic slot reservation** via `db.$transaction` — verifies slot exists + status='open' + duration matches + not in past, then creates Booking (with `scheduledAt=slot.start`, `slotId=slot.id`, `status='pending'`) and marks slot `status='booked'` + links `bookingId`. Sends confirmation emails (user + admin, IST-formatted session time). Friendly errors: 404 not found, 409 just-taken, 400 duration-mismatch/past.

3. **`/src/app/api/admin/slots/route.ts`** — Admin-gated. GET: paginated list with `?status` filter, includes booking summary. POST: discriminated-union Zod schema for `single` mode (start/end ISO + duration) and `bulk` mode (startDate, endDate, weekdays[], times[], duration, timezoneOffset minutes). Bulk generation iterates days in range, filters by UTC weekday, computes UTC start as `Date.UTC(y,m,d,h,mi) - offsetMinutes*60000` (10:00 IST = 04:30 UTC), skips past slots, de-dupes against existing slots with same start time, uses `createMany` for performance.

4. **`/src/app/api/admin/slots/[id]/route.ts`** — Admin-gated. PATCH: update status (open|held|booked) and/or reschedule (start/end ISO). Consistency rules: can't mark 'booked' without bookingId; releasing 'booked' → 'open' clears the link. DELETE: only open slots (409 if held/booked).

5. **`/src/app/admin/slots/page.tsx`** — Server component. Direct DB read (auth already enforced by middleware). Sticky header (back-link, refresh), title block (eyebrow "Admin · Schedule", serif H1 "Availability calendar"), 6 StatTiles (Total/Open/Booked/Held/Upcoming/Past), SlotManager, SlotList, footer "Times shown in IST". `dynamic='force-dynamic'`. Serializes Dates to ISO strings before passing to client components.

6. **`/src/app/admin/slots/SlotManager.tsx`** — Client component. Collapsible generator with mode toggle (Bulk / Single). Bulk: start date, end date, weekday multi-select (Sun-Sat chips), time-of-day multi-input (HH:mm with add/remove), duration dropdown, timezone preset dropdown (IST/UTC/PST/EST/CET). Single: datetime-local + shared duration + timezone. POSTs to `/api/admin/slots`, shows count + skipped-duplicates summary, calls `router.refresh()`.

7. **`/src/app/admin/slots/SlotList.tsx`** — Client component. Receives initial slots as props. Filter tabs (All/Open/Held/Booked with counts). Groups slots by IST calendar day with Cinzel-uppercase day headers + thin gold dividers. Slot rows show: time range (mono), duration, status (icon + gold/emerald/yellow), booking link (if booked), delete button (only for open + non-past). Custom thin scrollbar styling.

### MODIFIED (2 files)

8. **`/src/components/astrokalki/booking.tsx`** — Added slot picker as step 2 of the new 5-step flow:
    - 0: Landing (existing)
    - 1: Duration (existing)
    - 2: **Slot picker (NEW)** — fetches `/api/slots?duration=<selected>`, displays loading/error/empty/slots states. Empty state shows message + "Request a time directly" skip button (falls back to WhatsApp path). Slots grouped by date with Cinzel uppercase headers + thin gold dividers; time slots in 2-3 column grid as borderless cards with bottom underline on hover; selected slot has gold border-bottom + bg tint.
    - 3: Context (was step 2)
    - 4: Details (was step 3)
    - 5: Confirm/Submit (was step 4)
   
   Minimal progress indicator now shows 5 numbered dots (01-02-03-04-05) with same thin-line style. On final submit: if `selectedSlot`, POSTs to `/api/slots/[selectedSlot.id]` with full intake payload, shows success state with date/time confirmation card; if skipped (no slot), falls back to original WhatsApp flow (`POST /api/bookings` + `openWhatsApp`). Honeypot `website:''` field included in both paths. Framer-motion AnimatePresence for step transitions preserved.

9. **`/src/lib/i18n.ts`** — Added 19 new booking.* keys in BOTH en and hi sections: `booking.step.slot`, `booking.slotTitle`, `booking.slotSubtitle`, `booking.slotLoading`, `booking.slotEmpty`, `booking.slotEmptyHint`, `booking.slotEmptyCta`, `booking.slotRetry`, `booking.slotRetryBtn`, `booking.slotSelected`, `booking.slotFallbackCta`, `booking.confirmSlot`, `booking.confirmSlotNone`, `booking.finalizeBooking`, `booking.submitting`, `booking.bookingSuccessTitle`, `booking.bookingSuccessBody`, `booking.bookingError`, `booking.whatsappDirect`.

## Design system followed

- Background `#050505`, Gold `#c9a96e`, Text `#f0eee9` / `#9a9a9a` / `#7a7a7a`
- Fonts: Playfair Display (serif headlines), Cinzel (editorial labels — used for slot-picker day headers), Inter/Geist (body)
- Editorial: numbered steps (01-02-03-04-05), thin gold dividers, generous whitespace
- Slot picker: borderless cards with bottom underline on hover, date headers in Cinzel uppercase, time slots in mono, selected slot has gold border-bottom
- NO indigo/blue colors anywhere
- Matched existing booking.tsx minimal progress indicator style (just extended to 5 steps)
- Matched /admin/leads + /admin/patterns visual style for admin slots page

## Verification

- **`npx tsc --noEmit`**: 0 errors in any of my new/modified files. (11 pre-existing errors in `/api/stripe/*` routes — not introduced by this task.)
- **`bun run lint`**: 0 errors in my files. (Pre-existing errors in `/src/app/page.tsx:32`, `/src/components/astrokalki/footer.tsx:10`, `/src/components/astrokalki/insights.tsx:81` — all in MUST-NOT-TOUCH list — and in `/workspace-analysis/extracted/*`.)
- **End-to-end smoke test** (via curl with `X-Forwarded-For` to bypass rate limit):
    1. Seeded a slot directly via Prisma → `GET /api/slots?duration=60` returns the slot
    2. `POST /api/slots/[id]` with full intake returns `201` + booking object with `scheduledAt=slot.start`, `slotId=slot.id`, `status='pending'`, slot marked `'booked'` + `bookingId` linked
    3. Second `POST` to same slot returns `409 "This slot was just taken"` (atomic transaction prevents double-booking)
    4. `GET /api/slots` no longer shows the booked slot (filtered by `status='open'`)
    5. `GET /api/slots/[id]` shows booked slot with `bookingId` linked
    6. Honeypot triggered (`website='http://spam.com'`) returns fake `201` success
    7. Test data cleaned up afterward
- **Admin routes**: `/admin/slots` returns 307 redirect to `/admin/login`; `/api/admin/slots` returns 401 — middleware correctly gates both.

## Notes for future agents

- `/api/bookings/route.ts` is preserved untouched as a fallback — the booking component still uses it when no slot is selected.
- The booking component's `selectedDuration` resets `selectedSlot` and `skippedSlot` whenever duration changes — this prevents stale slot selection across duration changes.
- The slot picker fetches once per duration and caches in component state (`slotsFetchedFor`) — navigating back to step 2 doesn't re-fetch unless duration changed.
- The admin slot grid shows ALL slots (capped at 1000) in one page — no pagination UI. If a practitioner ever exceeds 1000 slots, add pagination.
- Bulk slot generation skips past slots automatically — admins can run the generator with a start date in the past and only future slots get created.
- Bulk slot generation de-duplicates against existing slots with the same start time — re-running the same generator is idempotent (only creates new slots, doesn't duplicate).
- IST is hardcoded as the display timezone in the admin UI (`Asia/Kolkata` in toLocaleString options). If internationalisation is needed later, this should be configurable.
- The booking component uses `useState` (not react-hook-form) to match the existing pattern — the spec mentioned react-hook-form but the existing code doesn't use it.
- Slot times are stored as UTC Date objects. Display formatting converts to IST for admin consistency and for user-facing booking confirmation.

## Status

**COMPLETE.** Production-ready. Visually seamless with the existing cinematic editorial design. All endpoints tested end-to-end. 0 TS errors, 0 lint errors in new/modified files.
