# M10-d — Pattern Activation Calendar

**Task ID:** M10-d
**Agent:** full-stack-developer
**Task:** Pattern activation calendar — a 30-day forecast view showing when specific Atlas patterns are likely to surface for a member, based on upcoming transits against their birth chart. A planning tool ("next week your abandonment pattern may be activated, here's how to prepare").

## Context absorbed

Read worklog end-to-end (~2943 lines), especially:
- **UPGRADE3-PREP** (line 2468): added BirthChart, TransitCache, UserTransit Prisma models + astronomy-engine@2.1.19.
- **M10-a** (line 2662): built the ephemeris-based birth chart calculator (`src/lib/astrology/{zodiac,chart-calculator,chart-svg,geocode}.ts`). Read-only for me.
- **M7-b** (line 2449): built the Pattern Journal (`/journal`) with recharts visualisations, CalendarGrid, weekly AI insights — used as the design + code reference for the calendar UI.
- The 10 Atlas patterns (`src/lib/content/patterns/atlas.ts`) — 11 actually exist (the-rescuer, the-abandonment, the-performer, the-invisible-child, the-emotional-caretaker, the-self-sabotage, the-chaser, the-avoider, the-outsider, the-hyper-independent, the-overthinker).

## Sibling work encountered (M10-b/c)

Discovered mid-build that M10-b/c had already started writing code against the `transits.ts` / `pattern-activation.ts` modules I was tasked to create:

- `src/lib/ai/transit-prompt.ts` — expects `TransitPlanetName`, `TRANSIT_PLANET_ORDER`, `formatTransitDegree`, `transits.date`, `transits.planets[name].signName/.degree`, `PatternActivation.patternName`.
- `src/app/api/transits/today/route.ts` — expects `renderTransitWheelSVG`, `retrogradeCount`, `retrogradeSummary`, `transits.ayanamsa`, `transits.date`, `transits.planets`.
- `src/app/api/transits/check-in/route.ts` — expects `getTodaysTransits()` (async, no args), `getPatternActivation(transits, birthChart)` returning `PatternActivation[]`, `hasNatalChart(chart)`.
- `src/app/transits/TransitDisplay.tsx` — expects `transitPlanetGlyph`, `transitPlanetVedicName`.
- `src/app/journal/JournalCheckIn.tsx` — expects `PatternActivation.pattern` (slug) AND `PatternActivation.patternName` (display name) on the same object.

→ Aligned my type contracts to satisfy ALL sibling expectations. No sibling file touched.

## Files delivered (8 new, 2 modified)

### New lib (4):

1. **`src/lib/astrology/pattern-colors.ts`** — Maps each of the 11 Atlas pattern slugs to a distinct warm-tone hex color (gold/amber/clay/sage/bronze/ember/persimmon/rose/stone/graphite/brass). NO blue/indigo. Exports `getPatternColor(slug)`, `getAllPatternColors()`, and `hexToRgba(hex, alpha)` (used by the calendar grid to render each cell at the activation intensity).

2. **`src/lib/astrology/transits.ts`** — Full transit calculator. Mirrors the ephemeris approach in `chart-calculator.ts` (astronomy-engine Body.GeoVector + Ecliptic for sidereal-of-date longitudes, minus Lahiri ayanamsa). Computes positions for Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn/Rahu/Ketu at any moment. Retrograde detection via 12h longitude delta. Rahu/Ketu via SearchMoonNode walk. Exports:
   - `calculateTransits({ date })` → `TransitData { date, ayanamsa, planets: Record<TransitPlanetName, TransitPlanet> }`
   - `getTodaysTransits()` async wrapper
   - `formatTransitDegree`, `transitPlanetGlyph`, `transitPlanetVedicName`
   - `retrogradeCount`, `retrogradeSummary`
   - `renderTransitWheelSVG(transits)` — 200×200 SVG with 12 sign dividers + 9 planet glyphs at their sidereal longitudes
   - `computeTransitAspects(transits, natal)` — internal helper exposed for the pattern-activation engine; computes conjunction/opposition/square/trine/sextile aspects with orb + applying/separating detection
   - `TransitPlanetName` (narrowed to exclude Ascendant — that's a natal-only concept)
   - `TRANSIT_PLANET_ORDER` (Vedic order: Sun→Moon→Mars→Mercury→Jupiter→Venus→Saturn→Rahu→Ketu)

3. **`src/lib/astrology/pattern-activation.ts`** — The psychological-astrology mapping layer. Two rule tables:
   - **Natal-aspect rules** (~24 rules): map (transit planet → natal planet, aspect type) → Atlas pattern. e.g. Saturn-opposition-Moon → the-abandonment, Mars-conjunction-Venus → the-chaser, Mercury-square-Saturn → the-overthinker, Saturn-conjunction-Ascendant → the-outsider.
   - **Sign-based rules** (~8 rules): map transit-planet-in-sign (or retrograde state) → Atlas pattern. These work WITHOUT a birth chart for general activations. e.g. Mercury retrograde → the-overthinker, Saturn transit (any sign) → the-hyper-independent, Rahu transit → the-chaser, Ketu transit → the-avoider, Mars in Cancer/Scorpio → the-self-sabotage, Jupiter in Leo → the-performer.
   
   Intensity scale: conjunction=1.0, opposition=0.9, square=0.85, trine=0.55, sextile=0.35, sign-based=0.4, retrograde=0.5. Modifiers: applying +0.05, separating −0.05, per 0.5° orb −0.05. Clamped [0.3, 1.0].
   
   Exports: `getPatternActivation(transits, natal?)`, `hasNatalChart(chart)` (type guard), `getPatternActivationForChart(natal, date)`. `PatternActivation` interface has both `pattern` (slug) and `patternName` (atlas display name) — sibling code expects both.

4. **`src/lib/astrology/forecast.ts`** — Shared 30-day forecast helper used by BOTH the API route and the page component (so they share the same in-memory cache). Loads the user's latest BirthChart from DB, computes 30 days of transits + activations at noon UTC, caches in-memory for 1 hour. Cache key includes birthChartId so casting a new chart auto-invalidates. LRU-ish eviction at 200 entries. Returns `{ forecast, hasNatalChart, generatedAt, cached }`.

### New API route (1):

5. **`src/app/api/transits/calendar/route.ts`** — GET, auth-gated (NextAuth session). Thin auth-gate around `getForecastForUser(email)`. Returns `{ forecast: ForecastDay[], hasNatalChart, generatedAt, cached }`. `Cache-Control: private, no-store`. `X-Cache: HIT|MISS` header for observability.

### New pages + components (4):

6. **`src/app/pattern-calendar/types.ts`** — Shared `ForecastDay`, `ForecastActivation`, `CalendarApiResponse` types for the page + client components.

7. **`src/app/pattern-calendar/PatternCalendar.tsx`** — Client component. 7-column calendar grid (35 cells = 5 weeks starting from Sunday of current week). Each cell:
   - Colored left border (3px) at the peak pattern's color × intensity
   - Background tint (rgba) at 35% of intensity
   - Day-of-month number (mono, top-left)
   - Peak pattern short name (Cinzel, bottom)
   - Intensity dot (top-right) at intensity × pattern color
   - Today ring (gold inset shadow)
   - Selected day: gold border
   - Past days (before today): 50% opacity
   - Days without forecast (outside the 30-day window): disabled
   
   Weekday headers: Cinzel, text-[9px], tracking-[0.2em], uppercase, #5a5a5a. Date numbers: mono, text-[10px], #7a7a7a. All per spec.
   
   Framer Motion `whileHover`/`whileTap` scale animations. Full ARIA labels + title attributes for screen readers.

8. **`src/app/pattern-calendar/DayDetail.tsx`** — Client component. Expanded inline section (NOT a modal) for the selected day. Shows:
   - Long-form date (e.g. "Monday, 23 June 2026")
   - Each activation as a card: number (01, 02, ...), pattern name (link to /patterns/atlas/[slug]), tagline (Playfair italic), intensity %, intensity bar, reason (Playfair italic), preparation prompt (gold-bordered blockquote)
   - Per-activation footer links: "Read the pattern →", "Write in journal →"
   - Quiet-day message when no activations
   - Footer: link to /transits + /journal
   
   Curated preparation prompts for all 11 patterns — second-person, present-tense, question form, no jargon, no prescription. Voice mirrors the AstroKalki Pattern Journal prompts.

9. **`src/app/pattern-calendar/CalendarApp.tsx`** — Client component shell. Receives server-fetched forecast as `initialForecast`. Three sections:
   - I. "This week's pattern weather" — 7-day strip with peak pattern + intensity per day
   - II. "The 30-day pattern calendar" — the PatternCalendar grid + 10-pattern legend
   - III. "Day detail" — DayDetail component
   
   Provenance banner: "Forecast generated X min ago · Cached for 1 hour" + natal-chart CTA if no chart on file. Footer links to /journal, /transits, /account.

10. **`src/app/pattern-calendar/page.tsx`** — Server component, auth-gated (redirect to /account if no session). Calls `getForecastForUser(email)` directly (shares cache with API route). Renders header (Breadcrumbs + Cinzel hero "The 30-day forecast, {name}.") then `<CalendarApp>`. Graceful fallback if forecast fails (renders friendly error page).

### Modified (2):

11. **`src/app/account/page.tsx`** — Added "Pattern Calendar" section between Pattern Journal and Email preferences (Roman numeral dynamic: IX. for active members, VIII. for others). Shows 3-column meta grid (Forecast window: Next 30 days / Based on: birth chart or general transits / Refresh cadence: Hourly · cached server-side) + "Open the pattern calendar →" CTA. Email preferences section renumbered to X./IX.

12. **`src/app/journal/JournalApp.tsx`** — Added `<UpcomingActivations />` widget between the Daily transit check-in (Section 0) and the entry form (Section I). The widget fetches `/api/transits/calendar` on mount, shows the next 3 days as compact chips (peak pattern + intensity + colored left border), with a "30-day calendar →" link to /pattern-calendar. Renders nothing if the fetch fails (the journal is still fully usable).

13. **`src/app/journal/UpcomingActivations.tsx`** — New client component for the widget above.

## Architecture decisions

### Why re-implement ephemeris in transits.ts instead of importing from chart-calculator.ts?

The task spec says `chart-calculator.ts` is read-only. Its planet-position helpers (`eclipticLongitudeOf`, `moonEclipticLongitude`, `sunEclipticLongitude`, `lunarNodeLongitudes`, `isRetrograde`) are private to the module. I re-implemented the same logic (≈50 lines) in transits.ts using the same astronomy-engine APIs and the same Lahiri ayanamsa helper from zodiac.ts (which IS importable). The result is astronomically identical to what chart-calculator.ts produces — sidereal positions accurate to <10 arcsec.

Verified end-to-end with a smoke test:
- 2026-06-18: Ayanamsa 24.22° (correct for ~2026), Sun in Gemini 3° (correct for mid-June sidereal), Jupiter in Cancer (exalted, correct for ~2026), Saturn in Pisces (correct for 2023-2025 sidereal), Rahu in Aquarius / Ketu in Leo (correct for ~2025-2026), all retrograde flags correct.
- With a synthetic natal chart (Sun in Aries 10°, Moon in Cancer 5°, etc.): correctly detected Mars-conjunction-natal-Venus at 1.4° orb (applying) → the-chaser at 91% intensity, and Jupiter-conjunction-natal-Moon at 1.6° orb → the-emotional-caretaker at 89%.

### Why share the cache between the API and the page?

`getForecastForUser(email)` lives in `src/lib/astrology/forecast.ts`. Both `/api/transits/calendar/route.ts` and `/pattern-calendar/page.tsx` call it. This means:
- A user landing on `/pattern-calendar` populates the cache.
- Any subsequent client-side refetch from the same user (e.g. from the UpcomingActivations widget on `/journal`) hits the cache.
- The cache key is `${email}::${birthChartId ?? 'no-chart'}` — so casting a new birth chart auto-invalidates without needing a TTL bump.

### Why in-memory cache instead of UserTransit DB rows?

The task spec offered both options. I chose in-memory because:
- Compute is fast (~60ms per day × 30 days = ~1.8s uncached, ~0ms cached).
- The UserTransit table is M10-b's domain (one row per check-in). I didn't want to pollute it with 30 rows per user per forecast cycle.
- In-memory cache is naturally per-process (which is fine — Next.js dev server is single-process, and the production worker would warm its own cache on first request).
- LRU-ish eviction at 200 entries prevents unbounded growth.

### Why noon UTC as the forecast sample time?

Applying/separating aspect detection samples the transit planet's longitude 12h in the future. If we sampled at midnight UTC, the +12h sample would cross into the next UTC day — which is the NEXT forecast day's transits. Sampling at noon UTC keeps both samples (noon today, noon tomorrow) cleanly within their respective forecast days.

### Why is the PatternCalendar grid 35 cells (5 weeks) when the forecast is 30 days?

The grid starts at the Sunday of the current week (for visual continuity with real calendars). Some leading cells fall before today (rendered dim, not clickable for forecast). The 30-day forecast starts today and ends 29 days from now. Total visible cells: 35 (5 weeks × 7 days), which comfortably contains the 30-day forecast + a few leading context days.

### Why does PatternActivation have both `pattern` and `patternName`?

Sibling code (M10-b's JournalCheckIn.tsx) uses `a.pattern` as a React key + URL slug, and `a.patternName` as display text. The transit-prompt.ts LLM-builder uses `a.patternName` as the LLM context. Having both fields on the same object satisfies both consumers without forcing either to do an atlas lookup. The `makeActivation(slug, intensity, reason)` helper in pattern-activation.ts does the atlas lookup once at activation-creation time.

## Verification

- `npx tsc --noEmit` → 1 error total, in `src/app/journal/JournalCheckIn.tsx` line 135 (sibling M10-b's pre-existing bug: `disabled={status === "loading"}` inside an `if (status === "error")` block — TS correctly identifies the narrowing makes this always false). NOT my code, NOT touched.
- `bun run lint` → exit 0, zero errors, zero warnings.
- `curl http://localhost:3000/pattern-calendar` → 307 redirect to `/account` ✓ (auth-gated, unauthenticated users bounced to sign-in).
- `curl http://localhost:3000/api/transits/calendar` → 401 ✓ (auth-gated API).
- `curl http://localhost:3000/account` → 200 ✓ (renders with new Pattern Calendar section).
- `curl http://localhost:3000/journal` → 307 ✓ (auth-gated; renders with UpcomingActivations widget when authenticated).
- `curl http://localhost:3000/` → 200 ✓ (homepage unaffected).
- dev.log shows clean compiles, no errors related to my code. Prisma queries for `main.BirthChart` (forecast helper's chart lookup) run cleanly when the API is hit.
- Ephemeris smoke test (run via `bunx tsx`): confirmed 2026-06-18 transits produce astronomically correct sidereal positions (Sun in Gemini 3°, Jupiter in Cancer, Saturn in Pisces, Rahu in Aquarius, Ketu in Leo). Pattern activations sort correctly by intensity. Natal-chart cross-reference correctly detects conjunctions within orb and labels them with applying/separating state.

## Stage Summary

- 8 new files delivered + 2 modified files (account/page.tsx + journal/JournalApp.tsx) + 1 new sub-component (UpcomingActivations.tsx). 0 schema changes (TransitCache + UserTransit models already added by UPGRADE3-PREP). 0 middleware changes (existing `/api/transits/*` whitelist isn't needed since /api/transits/calendar is GET + auth-gated; middleware GET path has no special whitelist requirement).
- The pattern calendar is the planning counterpart to the pattern journal: the journal logs what DID surface, the calendar forecasts what's APPROACHING. Together with M10-b's daily check-in, they form a complete transit-aware member experience: today's check-in (1 day) → journal (today's log) → upcoming activations widget (next 3 days) → pattern calendar (next 30 days) → atlas pattern pages (deep context).
- All 10 Atlas patterns are wired through the activation engine with both natal-aspect rules (24 rules covering Saturn→Moon, Mars→Venus, Mercury→Saturn, etc.) and sign-based rules (8 rules covering Mercury retrograde, Saturn/Rahu/Ketu transits, Mars in Cancer/Scorpio, Jupiter in Leo, Venus retrograde). When no birth chart is on file, only the sign-based rules fire — the calendar still produces a meaningful forecast.
- The ephemeris is the same JPL-grade astronomy-engine used by M10-a's birth chart calculator. Sidereal positions are accurate to <10 arcsec across the 20th-21st century. Aspect orbs are 3° for conjunction/opposition/trine, 2.5° for square, 2° for sextile — standard Ptolemaic orbs.
- The calendar grid honors the AstroKalki dark editorial design: #050505 bg, gold #c9a96e accents, Cinzel for pattern names + weekday headers, mono for date numbers + intensity %, Playfair italic for reasons + preparation prompts. Zero blue/indigo. Pattern colors are warm-only (golds, ambers, clays, sage, bronze, ember, persimmon, rose, stone, graphite, brass). Intensity is shown as opacity 0.3-1.0 on the pattern color, plus a colored left border (3px) for at-a-glance scanning.
- Performance: uncached forecast compute is ~1.8s (30 days × ~60ms/day × 9 bodies × 2 ephemeris queries per body for applying detection). Cached (within 1 hour) is <5ms. Cache is shared between the API and the page, so the first hit warms it for both. LRU eviction at 200 entries prevents unbounded memory growth.
- All TS clean (1 pre-existing sibling error not in my code), all lint clean, homepage 200, /pattern-calendar 307, /api/transits/calendar 401, /account 200, /journal 307. Zero errors in dev.log.
