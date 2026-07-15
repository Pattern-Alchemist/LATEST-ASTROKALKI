# M9-c — A/B testing framework (full-stack-developer)

## Scope
Server-side, cookie-based A/B testing for headline/CTA experiments on the
hero section and booking flow. Admin creates experiments, visitors get
assigned to variants via cookie, conversions are tracked, results shown
in admin.

## Files delivered (10 total)

### New — Core library (2)
- `src/lib/ab/session.ts` — `ak_sid` cookie management
  - `getOrCreateSessionId(request)` — reads cookie or generates UUIDv4
  - `setSessionCookie(response, sessionId)` — httpOnly, 1-year expiry, SameSite=Lax
- `src/lib/ab/testing.ts` — A/B engine
  - `getVariant(name, sessionId)` — sticky assignment + weighted random selection
  - `trackConversion(name, sessionId)` — idempotent conversion marking
  - `getExperimentsSummary()` — per-variant breakdown for admin dashboard

### New — Public API (2)
- `src/app/api/experiment/assign/route.ts` — GET
  - `?name=<experimentName>` → `{variant, config}` or `{variant: null}`
  - Sets `ak_sid` cookie on every response
- `src/app/api/experiment/convert/route.ts` — POST
  - `{name}` → marks session's assignment as converted (idempotent)
  - Zod-validated, silent no-op if no session cookie

### New — Admin API (2)
- `src/app/api/admin/experiments/route.ts` — GET (list with stats) + POST (create)
  - Admin-gated by middleware (ak_admin cookie)
  - Zod validation: kebab-case name, lowercase page, ≥2 unique variants, weights ≥0
- `src/app/api/admin/experiments/[id]/route.ts` — PATCH (toggle/edit) + DELETE (cascade)
  - 404 → friendly JSON on Prisma P2025

### New — Admin UI (2)
- `src/app/admin/experiments/page.tsx` — server-component shell
  - Server-side fetch for initial paint, forwards Cookie header for auth
  - Matches /admin/analytics layout (sticky header, title block, sticky footer)
- `src/app/admin/experiments/ExperimentManager.tsx` — client UI (~1030 lines)
  - List of experiment cards with stats, per-variant gold bar chart, leader badge
  - Create panel (collapsible): name + page + variant rows + active toggle
  - Edit panel (inline): variant name/weight/config editing
  - Pause/Activate/Delete actions
  - WINNER_MIN_ASSIGNMENTS=20 guard prevents misleading "winner" badges

### New — Client wrapper (1)
- `src/components/astrokalki/ab-variant.tsx`
  - Props: `experimentName`, `variants: {[name]: ReactNode}`, `default: ReactNode`
  - Fetches /api/experiment/assign on mount, 2500ms timeout, AbortController
  - Renders default while loading / on error / if no experiment (never throws)

### Modified (1)
- `src/components/astrokalki/hero.tsx`
  - Extracted 3-line H1 into `Headline({show, line1, line2, line3})` helper
  - Wrapped H1 in `<AbVariant experimentName="hero-headline">` with:
    - default = control copy (i18n hero.headline1/2/3 → "The Same Pain." / "Different Face." / "Same Pattern.")
    - variant "b" = "Same Pain." / "Same Story." / "Same Pattern." (hammer-rhythm variant)
  - Zero visual regression — same animations, classes, colors across variants

## Architecture decisions

### Sticky assignment via DB unique constraint
`@@unique([experimentId, sessionId])` on ExperimentAssignment guarantees
one assignment per (experiment, session) pair at the database level.
`getVariant` checks for existing assignment first; if found, returns it.
Race condition (concurrent requests for same session between findUnique
and create) is handled by catching the P2002 and re-reading.

### Weighted random selection (crypto RNG)
Uses `crypto.getRandomValues(Uint32Array)` mapped to [0, 1) for unbiased
randomness — better than `Math.random()` for assignment decisions. Weights
are relative (not percentages), so [1, 1, 2] = 25/25/50. All-zero weights
fall back to uniform selection so misconfigured experiments still assign
something rather than throw.

### Failure-isolation principle
Every layer returns gracefully on error:
- `getVariant` catches all errors, logs, returns null
- API routes return `{variant: null}` or `{success: true}` on error
- `AbVariant` renders `default` on any error / timeout / network failure
- A/B test failures NEVER break the visitor's page render

### Conservative statistics
`WINNER_MIN_ASSIGNMENTS = 20` — variant must have ≥20 assignments before
being badged as the "Leader". Below that, shows a "low sample" tag instead.
Prevents misleading admins with statistically noisy early data.

### JSON-encoded variants column
Prisma can't model a list of structured objects as a scalar, so `variants`
is stored as a JSON-encoded String. Parsed defensively in `parseVariants`
(returns `[]` on any failure → caller short-circuits to "no experiment").

### Cookie design
- `ak_sid` (visitor session): httpOnly, 1-year expiry, SameSite=Lax, path=/
  - 1-year window keeps sticky assignment stable across long conversion
    windows (hero variant today → booking two weeks from now)
  - httpOnly = XSS cannot steal the session ID
- `ak_admin` (admin auth): already exists, untouched — middleware handles it

## Verification log

### TypeScript
`npx tsc --noEmit` → 0 errors in any M9-c file. Pre-existing errors in
other agents' WIP files (transits, journal) are unrelated.

### Lint
`bun run lint` → 0 errors, 0 warnings project-wide.

### HTTP smoke tests
- `curl /admin/experiments` (no cookie) → 307 redirect to /admin/login?redirect=%2Fadmin%2Fexperiments ✓
- `curl /api/experiment/assign?name=test` (no experiment) → 200 {"variant":null} ✓
- `curl /api/experiment/assign?name=hero-headline` (active experiment) → 200 {"variant":"b","config":{"line2":"Same Story."}} + Set-Cookie: ak_sid=... ✓
- Sticky test: same cookie × 3 sequential calls → same variant ✓
- POST /api/experiment/convert with cookie → {success:true} ✓
- POST /api/experiment/convert without cookie → {success:false, reason:"no-session"} ✓
- POST /api/admin/experiments (admin cookie) → 201 with experiment object ✓
- PATCH /api/admin/experiments/[id] {active:false} → experiment paused ✓
- /api/experiment/assign returns {variant:null} when paused ✓
- PATCH /api/admin/experiments/[id] {active:true} → experiment reactivated ✓
- DELETE /api/admin/experiments/[id] → {success:true} ✓
- DELETE non-existent → 404 {error:"Experiment not found."} ✓
- Validation: bad name → 400 with Zod details; <2 variants → 400; duplicate variant names → 400 ✓

### Demo data seeded
Created `hero-headline` experiment with variants a (weight 1, config {})
and b (weight 1, config {line2:"Same Story."}). Generated 20 fresh
assignments (12 a / 8 b — close to 50/50 split as expected) + 5
conversions (3 a / 2 b). Overall conversion rate: 25%. Per-variant:
a=25%, b=25%. Neither hits the 20-assignment threshold for the Leader
badge — conservative behavior.

### Dev log
Zero M9-c errors. Only clean Prisma queries against Experiment +
ExperimentAssignment tables. Homepage renders cleanly with AbVariant
wrapper (GET / 200 in 266ms, no hydration warnings).

## What I did NOT touch
- `prisma/schema.prisma` (Experiment + ExperimentAssignment already added by UPGRADE3-PREP)
- `src/middleware.ts` (already whitelists /api/experiment POST)
- `next.config.ts`, `tsconfig.json`, `.env`
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/components/astrokalki/navigation.tsx`, `footer.tsx`
- `src/app/sitemap.ts`
- `src/components/astrokalki/booking.tsx` (no modification needed — convert endpoint can be called from anywhere, but the task spec only required wiring the hero headline)
- Any other agent's files
