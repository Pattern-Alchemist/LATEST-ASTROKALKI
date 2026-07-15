# Task ID: 6 — Agent: full-stack-developer

## Task
Build admin patterns dashboard with API aggregation at `/admin/patterns`.

## What was built
- **API route**: `src/app/api/admin/patterns/route.ts`
  - GET handler that queries `MicroReading` and `Booking` tables
  - Aggregates counts by `emotionalPattern`, `relationshipFrustration`, `booking.contexts` (JSON-parsed array), and `booking.duration`
  - Computes total + recent (30-day) sample counts
  - Returns sorted arrays of `{label, count}` per dimension
- **Dashboard page**: `src/app/admin/patterns/page.tsx`
  - Server-rendered React Server Component (no `'use client'`)
  - Fetches from `/api/admin/patterns` via absolute URL built from request `host` + `x-forwarded-proto` headers (so it works on any preview domain)
  - Sticky header with `Back to /admin` link + `Refresh` link
  - Title block: eyebrow `Admin · Patterns`, H1 `Pattern data`, subtitle explaining the 100+ users directive
  - Totals row: 4 stat cards (total micro-readings, recent micro-readings, total bookings, recent bookings)
  - 4 bordered section blocks each with eyebrow + italic subtitle + horizontal bar list:
    1. **Most selected emotional patterns** (Micro-diagnosis · Step 1 — "Which pattern feels familiar?")
    2. **Most selected relationship frustrations** (Micro-diagnosis · Step 3 — "What frustrates you most in relationships?")
    3. **Most common booking focus areas** (Booking contexts — "What users say they want to work on")
    4. **Booking duration distribution** (Session tier — "30 / 60 / 90 minute bookings")
  - Each row: label | horizontal CSS-width bar | count
  - Honest empty states per section when no data
  - Footer with `Back to admin` and `Refresh` links (sticky footer pattern)

## Design decisions
- Visual language matches existing `/admin/page.tsx`: `bg-[#050505]`, `text-[#f0eee9]`, gold accent `#c9a96e`, `text-editorial` + `text-body-cinematic` classes, `border-white/[0.04]` dividers
- Pattern + frustration raw keys (e.g. `emotional-numbness`, `cant-leave`) are humanised via `PATTERN_LABELS` and `FRUSTRATION_LABELS` maps so the publisher sees readable language instead of kebab-case; unmapped values fall through unchanged (honest data)
- Booking contexts shown raw as stored (e.g. `booking.ctx1`) — exposes pre-existing i18n-key leakage in booking form so it can be fixed later
- `BarRow` uses pure CSS width percentages relative to the section max — no chart library
- Server component means zero client JS for this page; the dashboard is publisher-only and refresh-by-navigate is appropriate

## Verification
- `bun run lint` — no errors in new files (pre-existing errors in `footer.tsx` / `insights.tsx` untouched)
- `curl /api/admin/patterns` → 200, returns expected JSON shape
- `curl /admin/patterns` → 200, HTML contains expected labels
- Dev log shows successful Prisma queries + successful render in ~70ms after first compile
- Real DB has 3 micro-readings + 1 booking; page correctly shows "Deep Freeze ×2", "Abandonment Loop ×1", "I can't trust them — or myself ×2", "60 minutes ×1"

## Files produced
- `/home/z/my-project/src/app/api/admin/patterns/route.ts`
- `/home/z/my-project/src/app/admin/patterns/page.tsx`
