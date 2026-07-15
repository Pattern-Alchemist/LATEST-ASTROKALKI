# Task M3-c — Analytics dashboard

## What I built

Three new files + one modified file. All under the AstroKalki admin
surface, matching the dark editorial gold theme used by /admin and
/admin/leads.

### New files
1. `src/app/api/admin/analytics/route.ts` — Aggregated events API.
   - GET /api/admin/analytics?days=30 (clamped 1..365, default 30)
   - Returns: range, funnel (6 steps), timeseries (daily), topPages
     (top 10), topEvents (all), sessions {total, unique,
     avgEventsPerSession}, byHour (24 buckets 0-23).
   - Auth-gated by middleware (zero-touch).
   - micro_reading_complete DERIVED from JSON `data` payload of
     micro_reading events (complete===true | step==='complete').

2. `src/app/admin/analytics/page.tsx` — Server-component shell.
   - Forwards cookie from incoming request to internal API round-trip
     (required because middleware re-checks session on every fetch).
   - Renders dark editorial header/footer matching /admin/leads +
     /admin/patterns.
   - Passes initialData to client component.

3. `src/app/admin/analytics/AnalyticsDashboard.tsx` — Client
   component with recharts visualisations.
   - Range selector (7/30/90 days) + Refresh button.
   - Loading skeleton, error retry, empty states for every section.
   - 3 session stat cards (Total Events, Unique Sessions, Avg
     Events/Session).
   - Custom div-based funnel (6 steps, animated bars, gold
     gradient, dropoff badges).
   - Timeseries AreaChart (4 series in distinct gold tones, dark
     grid, custom tooltip, legend).
   - Activity-by-hour BarChart with Cell-based intensity (gold for
     peak, goldMuted for active, goldDeep for quiet).
   - Top pages Table (shadcn Table, page | views | conversions |
     conversion rate).
   - Event inventory grid (every event type as a card with count +
     share % + mini bar).
   - Strict palette: #c9a96e, #8a7350, #5a4a2e, #e2c98f, #2a2a2a,
     #7a7a7a, #050505, #0a0a0a. ZERO blue/indigo.

### Modified files
4. `src/app/admin/page.tsx` — Added `Link` import + `BarChart3`
   icon import, and a single new gold nav button to the header
   (next to the existing "View Site" button). No restructuring.

## Verification
- `npx tsc --noEmit`: zero errors in my files (11 pre-existing
  errors are all in src/app/api/stripe/* — another agent's domain).
- `bun run lint`: zero errors/warnings in my files (21 pre-existing
  errors are all react-hooks/set-state-in-effect in page.tsx /
  footer.tsx / insights.tsx — not my files).
- Smoke tested all routes via curl:
  - /admin/analytics without cookie → 307 redirect to /admin/login
  - /api/admin/analytics without cookie → 401 JSON
  - With admin cookie: 200 + full JSON payload on API, 200 + 125KB
    HTML on page.
- Seeded 250 realistic events through /api/analytics to verify
  dashboard renders with data: funnel shows 133 section_views →
  28 micro_readings → 31 booking_completes → 11 newsletter_signups;
  top pages sorted correctly; sessions computed properly.

## Files I did NOT touch
- prisma/schema.prisma (model already exists)
- src/middleware.ts (auto-guards /admin/* and /api/admin/* — no
  manual auth needed)
- next.config.ts, tsconfig.json, .env
- src/app/page.tsx, src/app/layout.tsx
- src/components/astrokalki/navigation.tsx, footer.tsx
- src/app/sitemap.ts
- src/app/api/admin/stats/route.ts (kept as-is, separate endpoint)
- Any other agent's files

## Notes for downstream agents
- The /api/admin/analytics endpoint derives micro_reading_complete
  from the JSON `data` payload of micro_reading events. The tracking
  layer should send micro_reading events with `data: { complete: true,
  step: 'complete' }` (or any of: complete===true, completed===true,
  step==='complete', step==='done') to populate the funnel's third
  step. Otherwise that step will show 0.
- The dashboard's empty states are designed to render gracefully
  when no events exist — important for fresh deployments.
- The /admin/analytics/page.tsx forwards the cookie header to the
  internal fetch. This pattern is reusable for any other admin page
  that needs to call /api/admin/* from a server component.
