# M9-b — Cohort + Revenue Analytics Dashboard

**Agent:** full-stack-developer
**Task:** Extend the admin analytics (built by M3-c) with the business-intelligence layer — revenue, churn, conversion funnel, and signup-cohort retention analysis. Live on `/admin/revenue`.

## Files delivered

### Created (3)

1. **`src/app/api/admin/revenue/route.ts`** — GET (admin-gated by middleware).
   - `mrr`: `monthlyActive × 999 + round(yearlyActive × 9999 / 12)` — pulled from live Membership table where `status='active'`. Pricing constants `MONTHLY_PRICE_INR=999` / `YEARLY_PRICE_INR=9999` hard-coded from `/membership` page (Stripe holds only price IDs in env).
   - `arr`: `mrr × 12`.
   - `revenue30d`: sum of `parsePrice(b.price)` for bookings created in last 30 days. `parsePrice` strips non-digits via `parseInt(price.replace(/[^0-9]/g,''))` per the documented contract.
   - `revenueByMonth`: last 12 calendar months, each `{ month:"MMM yyyy", revenue, bookings, memberships }`.
   - `churnRate`: `(memberships whose status is cancelled|expired AND updatedAt in last 30d) / (activeCount + churned) × 100`. Rounded to 1 decimal.
   - `ltv`: `(lifetimeBookingRevenue + lifetimeMembershipRevenue) / totalMembersEver`. Membership revenue is estimated conservatively as one plan's annual price per row.
   - `conversionFunnel`: `{ visitors, microReadings, bookings, completedSessions, memberships, steps:[] }`. Each step has `conversionRate` (% of visitors), `stepRate` (% of previous step), `dropoffRate` (100 - stepRate). Visitors = unique `sessionId` values in AnalyticsEvent for the window.
   - `cohorts`: last 12 calendar-month signup cohorts. Each row: `{ cohortMonth, size, retention30d, retention60d, retention90d }`. Retention Nd = (# cohort members whose createdAt ≥ Nd ago AND status='active') / (# cohort members whose createdAt ≥ Nd ago). Returns `null` when the cohort hasn't aged to that mark yet.
   - `membershipGrowth`: last 12 months, each `{ month, newMembers, cancelledMembers, netGrowth }`.
   - `?days=` param clamped to 1..365, default 30.
   - All time-bucketing done in JS using `Date` methods (avoids SQLite date-function quirks across Prisma versions — same pattern as M3-c).

2. **`src/app/admin/revenue/page.tsx`** — Server-component shell. Auth-gated by middleware (any unauthenticated visitor 307-redirects to `/admin/login?redirect=/admin/revenue` before this component renders). Initial server-side fetch of `/api/admin/revenue?days=30` with cookie forwarding (required because the middleware re-checks the admin session cookie on every internal fetch). Renders the dark editorial shell matching `/admin/analytics` — sticky header, eyebrow + serif H1, body-cinematic subtitle, mt-auto sticky footer. `metadata.robots = noindex,nofollow`. `dynamic='force-dynamic'`.

3. **`src/app/admin/revenue/RevenueDashboard.tsx`** — Client component with recharts visualizations:
   - **Revenue stat cards (4)**: MRR, ARR, 30-Day Revenue, LTV. Large numbers in Playfair Display (`var(--font-playfair)`), eyebrows in Cinzel (`text-[10px] tracking-[0.3em] uppercase`). Each card has a TrendingUp/Down icon and `motion` entrance animation.
   - **Revenue over time** (AreaChart): monthly booking revenue for last 12 months, gold area with linear gradient (`#c9a96e` 0.55 → 0.02 opacity). Dark grid (`#2a2a2a`) with `2 4` dashed, muted axis (`#7a7a7a`), Y-axis formatted as compact INR (`₹1.2K`/`₹3.4L`/`₹1.2Cr`). Custom dark tooltip with gold dot + mono number.
   - **Membership growth** (BarChart): two stacked bars per month — gold (`#c9a96e`) for new members, dark gold (`#5a4a2e`) for cancelled. Net-growth (12mo) summary in the legend row.
   - **Conversion funnel** (custom div-based, mirrors M3-c pattern): 5 rows — Visitors → Micro-Readings → Bookings → Completed Sessions → Memberships. Each row has step number, label, count, dropoff badge (only when dropoffRate > 0 — handles funnel inversions gracefully), animated gold-intensity bar (deepens per step), step-rate label, downward arrow between rows.
   - **Churn rate** card: SVG ring chart showing churnRate (gold <2%, goldPale 2-5%, crimson >5%) + ChurnTrendBadge (Healthy/Watch/Concern band).
   - **Cohort retention table** (heatmap-style): shadcn Table with cohort month rows × 30/60/90 day columns. Each cell uses `RetentionCell` — colored by retention band (gold >75%, goldPale 50-75%, goldMuted 25-50%, goldDeep <25%, n/a for cohorts too young). Heatmap legend below the table.
   - **Range selector**: 30 / 90 / 365 Days segmented buttons (matches spec exactly). Re-fetches `/api/admin/revenue?days={n}` on click.
   - Loading skeleton (4 stat cards + 4 chart placeholders + funnel rows + cohort table).
   - Error state with retry button.
   - Empty states for each section (renders cleanly when DB has no bookings/memberships/events).
   - Window footer with Clock + Gauge icons: "Window · N days · funnel & churn scope | Revenue & cohorts · 12-month trailing".
   - Palette strict: `#c9a96e`, `#8a7350`, `#5a4a2e`, `#e2c98f`, `#2a2a2a`, `#7a7a7a`, `#050505`, `#0a0a0a`, `#c0392b` (churn). ZERO blue/indigo.
   - Framer Motion entrance animations on cards and funnel rows (staggered delays).
   - All charts wrapped in `ResponsiveContainer` with explicit heights (h-72 to h-80) — responsive on mobile.

### Modified (1)

4. **`src/app/admin/page.tsx`** — Added a single `<Link href="/admin/revenue">` button to the admin dashboard nav, placed immediately after the existing "Analytics" link (so the two BI dashboards sit next to each other). Same `btn-outline-gold` styling. TrendingUp icon (already imported in the original file) + "Revenue" label.

## Verification

- **`npx tsc --noEmit`**: 0 errors in any of my new/modified files. The only remaining TS errors are pre-existing in:
  - `src/lib/astrology/*` (M10 transit/pattern-activation code — another agent's domain, NOT my files)
  - `src/app/admin/experiments/page.tsx` (M9-d experiment manager — another agent's missing file, NOT my code)
- **`bun run lint`**: 0 errors, 0 warnings in my files. (1 pre-existing warning in `src/app/case-studies/page.tsx` — NOT my file.)
- **Smoke test via curl**:
  - `GET /admin/revenue` (no auth) → `307` redirect to `/admin/login?redirect=%2Fadmin%2Frevenue` ✓ (matches spec)
  - `GET /api/admin/revenue` (no auth) → `401` ✓ (middleware auto-guards `/api/admin/*`)
  - `GET /api/admin/revenue?days=30` (with admin cookie) → `200` with full JSON payload ✓
  - `GET /api/admin/revenue?days=90` → `200` ✓
  - `GET /api/admin/revenue?days=365` → `200` ✓
  - `GET /api/admin/revenue?days=999` → `200` (clamp to 365 works) ✓
  - `GET /api/admin/revenue?days=bogus` → `200` (falls back to default 30) ✓
  - `GET /admin/revenue` (with admin cookie) → `200`, 136KB HTML containing all key UI markers: "Revenue, churn & cohorts", "MRR", "ARR", "30-Day Revenue", "LTV", "Revenue Over Time", "Membership Growth", "New vs cancelled members", "Conversion Funnel", "From visitor to member", "Cohort Retention", "30-day churn", "Revenue Dashboard" ✓
  - `GET /admin` (with admin cookie) → `200`, contains `href="/admin/revenue"` with `<span class="hidden sm:inline">Revenue</span>` ✓
- **Live API response shape verified** (with admin cookie against the dev DB):
  - `mrr: 999` (1 active monthly member × ₹999)
  - `arr: 11988` (12 × 999)
  - `revenue30d: 22993` (sum of booking prices in last 30 days)
  - `ltv: 23992` (lifetime revenue / total members ever)
  - `churnRate: 0` (no churn in last 30d)
  - `revenueByMonth`: 12 entries (Jul 2025 → Jun 2026)
  - `cohorts`: 12 entries (each with size + retention30/60/90)
  - `membershipGrowth`: 12 entries (each with newMembers/cancelledMembers/netGrowth)
  - `conversionFunnel`: 5 steps — visitors(245) → microReadings(6) → bookings(8) → completedSessions(1) → memberships(0). Step inversions handled gracefully (dropoff badge only shown when dropoffRate > 0, same defensive pattern as M3-c).
- **dev.log**: clean Prisma queries hitting Booking, MicroReading, Membership, AnalyticsEvent tables. Zero M9-b errors. Route `/api/admin/revenue?days=30` resolves in ~15ms. `/admin/revenue` page first render ~2.4s (mostly Next.js compile time on first request, subsequent renders ~250ms).

## Design decisions

- **Hard-coded pricing constants** (`MONTHLY_PRICE_INR=999`, `YEARLY_PRICE_INR=9999`) in the API route. Stripe env vars hold only the price *IDs* (`STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_YEARLY`), not the display amounts. The amounts are public knowledge from `/membership` and unlikely to change without a coordinated schema/env update, so embedding them with a comment is more robust than trying to fetch them from Stripe on every request.
- **LTV membership-revenue estimate is conservative** — counts each membership row as one plan-period of revenue (₹999 for monthly, ₹9999 for yearly). Real LTV would account for renewals, but we don't have per-period billing history in the DB (the Stripe webhook only upserts a single Membership row, not a ledger). The conservative estimate is transparent and avoids double-counting churned-but-previously-billed members.
- **Churn proxy uses `updatedAt`** — the Membership model has no explicit `cancelledAt` field, so we use `updatedAt in last 30d AND status in (cancelled, expired)` as the transition signal. This is the same proxy pattern used elsewhere in the admin APIs.
- **Cohort retention returns `null` for "too young" cells** — if a cohort was created 15 days ago, retention30d is genuinely unknown (we can't know if those members will still be active at day 30). The UI renders these as "n/a" rather than 0% so admins don't mistake a young cohort for a churned one.
- **Funnel inversion defense** — same as M3-c. If bookings(8) > microReadings(6), the dropoffRate goes negative; we only show the red dropoff badge when dropoffRate > 0 so the UI never shows a nonsensical "-33.3% dropoff" badge.
- **Range selector options: 30/90/365** (per spec). The AnalyticsDashboard uses 7/30/90, but the spec for M9-b explicitly lists 30/90/365 — these are BI/business windows where 7 days is too short for revenue signal.
- **`/admin/revenue` is sibling to `/admin/analytics`** (not nested under it) — they share the same server-shell pattern (sticky header, eyebrow + serif H1, mt-auto footer) but are independent routes so each can be hot-linked from the admin dashboard and stay focused on its own concern (behaviour vs business).

## What I did NOT touch (per spec)

- `prisma/schema.prisma` — all required models (Membership, Booking, Newsletter, MicroReading, AnalyticsEvent) already exist from earlier prep.
- `next.config.ts`, `tsconfig.json`, `.env`, `src/middleware.ts` — middleware already auto-gates `/admin/*` and `/api/admin/*`, no manual auth needed.
- `src/app/page.tsx`, `src/app/layout.tsx` — public site untouched.
- `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx` — public nav/footer untouched.
- `src/app/sitemap.ts` — not relevant for a noindex admin route.
- `src/app/admin/analytics/*` — the existing behaviour analytics (M3-c) is preserved as-is. My revenue dashboard is a separate sibling route.
- Any other agent's files.
