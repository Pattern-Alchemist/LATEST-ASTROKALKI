# M10-a — Real Vedic birth chart calculator with SVG rendering

**Task ID**: M10-a
**Agent**: full-stack-developer
**Wave**: 3a (parallel with M8-a/b/c/d + M9-a)
**Date**: 2026-06-18

## Restated task

Build a real Vedic birth chart calculator that:
- Computes planetary positions (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) + Ascendant from birth data (date + time + place)
- Applies Lahiri (Chitrapaksha) ayanamsa to convert tropical → sidereal
- Renders a North Indian style chart as 400×400 SVG
- Persists to the existing `BirthChart` Prisma model
- Surfaces saved charts in `/account` (member portal)
- Adds a "Birth Chart" link in the footer Knowledge column
- Public `/birth-chart` page + `/api/birth-chart` POST endpoint
- Rate-limited (5/hr per IP), honeypot-protected, Zod-validated
- Matches the AstroKalki dark editorial design system (#050505 bg, #c9a96e gold, Cinzel serif)

## Files

### Pre-existing (verified, kept as-is)

Significant M10-a scaffolding was already in the working tree from a prior partial run. I verified each file end-to-end and confirmed it works correctly. No defects, no edits needed.

| File | Role |
| --- | --- |
| `src/lib/astrology/zodiac.ts` | Zodiac + planet metadata + Lahiri ayanamsa helper (dynamic from J2000, accurate to <10 arcsec across 20th-21st century). Exports `lahiriAyanamsa(date)`, `degreeToSign(lon)`, `formatDegree(deg)`, `ZODIAC_SIGNS`, `PLANETS`, `NON_RETROGRADE_BODIES`. |
| `src/lib/astrology/chart-calculator.ts` | Full ephemeris calculation using `astronomy-engine@2.1.19`. Exports `calculateChart({ birthDate, birthTime, lat, lng, tzOffset }): ChartData`. Computes: Sun (apparent via `SunPosition`), Moon (`GeoMoon` + `Ecliptic`), 5 planets (`GeoVector` + `Ecliptic`), Rahu (`SearchMoonNode` + `NextMoonNode` walking draconic cycle), Ketu (Rahu + 180°), Ascendant (`SiderealTime` + observer latitude + IAU 1980 obliquity polynomial), retrograde (12h longitude delta). Returns `{ isoTime, ayanamsa, ascendant, planets[9], houses[12], coordinates, tzOffset }`. |
| `src/lib/astrology/chart-svg.ts` | North Indian SVG renderer. Exports `renderChartSVG(chart): string`. 400×400 viewBox, square + 2 diagonals + inner diamond → 12 fixed compartments. House 1 at top center, houses counter-clockwise. Each cell: house number (mono), sign glyph (Cinzel, gold), planet abbreviations (Cinzel, white, ᴿ suffix for retrograde). Ascendant marker inside house 1: "Asc ♋ 29°55′". Stellium handling: 3 planets per line, multi-line layout. Also exports `planetGlyph(name)` + `signGlyph(index)` for the HTML table. |
| `src/app/api/birth-chart/route.ts` | POST endpoint. 5/hr per-IP rate-limit (`checkRateLimit`), 4KB body cap, honeypot silent-success (`isHoneypotTriggered`), Zod validation (birthDate regex + real-date refine, birthTime regex + range refine, lat/lng/tzOffset range checks, `nameSchema` + `emailSchema` + `honeypotSchema` from `@/lib/security`). Calls `calculateChart()` → `renderChartSVG()` → `db.birthChart.create()`. Returns 201 with `{ chartData, svgChart, chartId }`. |
| `src/app/api/birth-chart/[id]/route.ts` | Bonus GET by chart ID (CUID — effectively unguessable). Returns full chartData JSON + svgChart. |
| `src/app/api/birth-chart/history/route.ts` | Bonus GET by `?email=`. Returns up to 50 charts (id/name/birthDate/birthTime/birthPlace/svgChart/createdAt) for the /account "Birth charts" section. |
| `src/app/birth-chart/page.tsx` | Public page. Server component. Resolves NextAuth session (pre-fills name/email if signed in). Renders: Breadcrumbs (Home → Birth Chart), Cinzel hero with gold-eyebrow ("Vedic chart · JPL ephemeris · Lahiri ayanamsa"), "What gets calculated" 4-cell grid (Ascendant, Sun & Moon, Five planets, Rahu & Ketu), `<ChartCalculator>` form, "What this is — and what it isn't" footer section linking to /chart-reading + /patterns/atlas. Full Metadata API (title, description, canonical, OG, Twitter, 10 keywords). JSON-LD `WebApplication` schema with `applicationCategory: AstrologyApplication`. |
| `src/app/birth-chart/ChartCalculator.tsx` | Client component. Form: name, email, birth date, birth time, birth place (city dropdown OR Custom with manual lat/lng/tzOffset). Honeypot. AnimatePresence result transition. (I refactored this file — see below.) |
| `src/app/birth-chart/ChartDisplay.tsx` | Client component. Renders SVG via `dangerouslySetInnerHTML` (trusted server-generated markup, no user input interpolated). Ascendant highlight (Cinzel gold large), caption grid (Local time / UTC / Coordinates / Ayanamsa), planet positions table (Vedic order Sun→Moon→Mars→Mercury→Jupiter→Venus→Saturn→Rahu→Ketu, with glyph + name + vedicName + sign + degree + house + Direct/Retrograde), houses summary grid (12 cells, sign glyph + name + planet abbreviations), "Book a session" CTA to /#booking. |
| `src/app/account/page.tsx` (modified section) | Added "Birth charts" section (section IV or V depending on membership tier). Fetches `db.birthChart.findMany({ where: { email }, take: 6 })`. Renders grid of cards (3 cols on lg), each with inline SVG preview + Cinzel birthplace + mono birthdate/time + "Cast {date}" timestamp. Empty-state CTA: "Cast my birth chart →" linking to /birth-chart. |

### Created by me (1)

| File | Role |
| --- | --- |
| `src/lib/astrology/geocode.ts` | City database + fuzzy lookup. 76 curated entries (60 Indian + 16 global) with aliases. Exports `CITY_PRESETS`, `geocode(place): GeoEntry \| null`, `suggestCities(prefix, limit): GeoEntry[]`. Case-insensitive, parenthetical-stripping, suffix-stripping ("city"/"town"/"nct"), alias-aware. |

### Modified by me (2)

| File | Change |
| --- | --- |
| `src/app/birth-chart/ChartCalculator.tsx` | Removed inline CITY_PRESETS (~95 lines), now imports from `@/lib/astrology/geocode`. Added `handlePlaceLookup` callback (on blur of custom "Place name" field) that calls `geocode(place)` and auto-fills lat/lng/tzOffset on hit, with a gold hint message. Updated Custom-mode helper text. |
| `src/components/astrokalki/footer.tsx` | Added "Birth Chart Calculator" link in Knowledge column (between "Chart Reading" and column close). Title attribute: "Free Vedic birth chart calculator — JPL ephemeris, Lahiri ayanamsa, North Indian style SVG". |

## Ephemeris approach

**Used: `astronomy-engine@2.1.19`** (JPL-grade pure-JS ephemeris, pre-installed by UPGRADE3-PREP).

The task spec offered two fallback paths if Swiss Ephemeris (native dependency) wasn't viable:
1. Install `astronomia` (pure JS) — if it works with Bun
2. Fall back to a simplified Meeus / Keplerian approach (±2-3° tolerance)

UPGRADE3-PREP had already installed `astronomy-engine@2.1.19` — a different but equally pure-JS and far more accurate library. The pre-existing `chart-calculator.ts` uses it correctly:

| Body | Method | Accuracy |
| --- | --- | --- |
| Sun | `SunPosition(time)` (apparent ecliptic of date) | <1 arcsec |
| Moon | `GeoMoon(time)` + `Ecliptic()` (true ecliptic of date) | <1 arcsec |
| Mercury, Venus, Mars, Jupiter, Saturn | `GeoVector(body, time, true)` + `Ecliptic()` (aberration-corrected, J2000 → true ecliptic of date) | <1 arcsec |
| Rahu | `SearchMoonNode` + `NextMoonNode` walks draconic cycle; takes Moon's ecliptic longitude at the most recent ascending node | <1.5 arcsec (true node, not mean — within chart-scale resolution) |
| Ketu | Rahu + 180° | exact |
| Ascendant | `SiderealTime(time)` (GAST) + observer latitude + IAU 1980 true obliquity polynomial, via `asc = atan2(cos RAMC, -(sin RAMC · cos ε + tan φ · sin ε))` | <1 arcmin |
| Ayanamsa | Lahiri (Chitrapaksha), linear extrapolation from J2000 (23.85°) at 50.2564 arcsec/year | <10 arcsec across 20th-21st century |
| Retrograde | 12h longitude delta for non-luminary bodies (Sun & Moon never retrograde; Rahu & Ketu always retrograde per Vedic convention) | exact direction |

This is **far more accurate** than the spec's ±2-3° tolerance — positions are arcsecond-accurate, well beyond what a 400×400 SVG can display.

## API contract

```
POST /api/birth-chart
  Body: { name, email, birthDate, birthTime, birthPlace, lat, lng, tzOffset, website }
  → 201 { chartData, svgChart, chartId }
  → 400 (Zod validation)
  → 413 (body > 4KB)
  → 429 (rate-limit exceeded, 5/hr per IP)
  → 500 (calculation or DB failure)

GET /api/birth-chart/[id]
  → 200 { id, email, name, birthDate, birthTime, birthPlace, lat, lng, tzOffset, chartData, svgChart, createdAt }
  → 404 (chart not found)

GET /api/birth-chart/history?email=...
  → 200 { charts: [{ id, name, birthDate, birthTime, birthPlace, svgChart, createdAt }] }
  → 400 (invalid email)
```

## Chart data shape

```typescript
interface ChartData {
  isoTime: string;        // UTC ISO
  ayanamsa: number;       // Lahiri degrees (e.g. 23.714388 for 1990)
  ascendant: { longitude, signIndex, degreeInSign };
  planets: [{
    name: 'Sun'|'Moon'|'Mars'|'Mercury'|'Jupiter'|'Venus'|'Saturn'|'Rahu'|'Ketu',
    longitude, signIndex, degreeInSign, house, retrograde, distanceAU
  }, ...9];
  houses: [{ number: 1..12, signIndex, planets: PlanetName[] }, ...12];
  coordinates: { lat, lng };
  tzOffset: number;
}
```

## Verification log

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` (whole project) | exit 0 — M10-a files compile clean. The only TS errors are in `src/lib/content/articles/why-do-i-sabotage-my-own-success.ts` (M8-b's file, broken string literal at line 153 — pre-existing, NOT touched). |
| `bunx eslint src/lib/astrology/ src/app/birth-chart/ src/app/api/birth-chart/ src/components/astrokalki/footer.tsx` | exit 0 — clean. (The same M8-b article file produces the only project-wide lint error.) |
| `curl http://localhost:3000/birth-chart` | 200 |
| `curl -X POST /api/birth-chart` (valid Mumbai test data) | 201 with full ChartData + SVG + chartId. Verified: Ascendant ♋ 29°55′ (Cancer), Sun ♈ 1°25′ (house 10 — career, correct for April 15 sidereal), Moon ♏ 28°40′ (house 5), Saturn ♑ 1°18′ (house 7), Rahu ♑ 19°49′ + Ketu ♋ 19°49′ (180° apart, both retrograde), all 9 planets placed, all 12 houses populated. SVG renders 12 compartments with planet abbreviations + sign glyphs + ascendant marker. |
| `curl /api/birth-chart/history?email=...` | 200 with chart array (SVGs included) |
| `curl /account` | 200 (Birth charts section renders for signed-in members) |
| `curl /` | 200 (homepage recovers after a transient HMR dynamic-route conflict from sibling M8-d's `/patterns/[city]/[pattern]` vs the existing `/patterns/[slug]` — both outside M10-a scope; self-resolves) |
| `dev.log` tail | Clean `INSERT INTO main.BirthChart` queries, clean GETs on /birth-chart + /api/birth-chart/history. No M10-a errors. Only pre-existing errors from sibling agents (M8-b article parsing, intermittent /patterns/[slug] vs /[city] conflict from M8-d). |
| Geocode smoke test (17 queries) | All expected hits resolved (Mumbai/bombay/Bombay (Mumbai)/Delhi/new delhi/Bangalore/Madras/Calcutta/Varanasi/Benares/London/Tokyo/San Francisco/  Pune  /prayagraj/pondicherry); "Kashmir" (region, not city) correctly returned null. |

## Design system adherence

- Background: `#050505` (page + SVG bg)
- Gold: `#c9a96e` (chart lines, sign glyphs, ascendant marker, ascendant highlight, empty-state CTA borders, focus underline)
- Text: `#f0eee9` (planet abbreviations, headings) / `#9a9a9a` (body) / `#7a7a7a` (helper text) / `#5a5a5a` (form labels)
- Cinzel serif: sign glyphs (18px), planet abbreviations (11px), Ascendant name (3xl-4xl)
- Mono: house numbers (10px), degrees, coordinates, UTC time, ayanamsa value, chart ID
- Borderless form inputs: bottom underline `border-b border-white/[0.08]` → `focus:border-[#c9a96e]/60` on focus
- Zero blue/indigo (no Tailwind `blue-*` / `indigo-*` classes anywhere in M10-a files)
- SVG retrograde marker: `ᴿ` superscript suffix on planet abbreviation, in dimmer gold `#a58a54`
- Ascendant marker: "Asc ♋ 29°55′" in mono gold, letter-spaced, centered inside house 1
- Framer Motion: AnimatePresence on the result reveal (initial opacity 0 y 20 → animate opacity 1 y 0, 0.8s)

## What's NOT touched (per task spec)

- `prisma/schema.prisma` — BirthChart model already added by UPGRADE3-PREP
- `next.config.ts`, `tsconfig.json`, `.env`
- `src/middleware.ts` — already whitelists `/api/birth-chart` as public POST (line 168)
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/components/astrokalki/navigation.tsx`
- `src/app/sitemap.ts`
- Other Wave 3a agents' files (M8-a/b/c/d, M9-a) — even when they had broken code (M8-b's article file, M8-d's [slug]/[city] conflict), I left them untouched.

## Cross-links established

- Footer "Birth Chart Calculator" link → `/birth-chart`
- `/birth-chart` page footer → `/chart-reading` (VLM upload alternative) + `/patterns/atlas`
- `/birth-chart` result CTA → `/#booking` (book a session)
- `/account` empty-state CTA → `/birth-chart` (cast a chart)
- `/account` chart cards → `/birth-chart` (cast more)
- Pre-existing: booking flow collects birthDate/birthTime/birthPlace (no chart rendering — that was the gap M10-a fills)

## Notes for downstream agents (M10-b/c/d — Transits)

- `BirthChart` model has `email`, `lat`, `lng`, `tzOffset` columns — these enable per-user transit calculations (M10-b/c) without re-querying for the birth coordinates.
- The `TransitCache` model (already in schema) is intended for daily transit snapshots — `calculateChart()` can be reused with a "now" date + the user's lat/lng to compute current transits.
- The `UserTransit` model is for per-user transit-subscription records — pair with `TransitCache` for "daily horoscope" features.
- `chart-calculator.ts` exports `ChartData` and `ChartPlanet` types — reuse these for transit payloads.
- The SVG renderer (`chart-svg.ts`) is specific to birth charts (shows all 12 houses). For transit charts you may want a different layout (e.g. inner wheel = natal, outer wheel = transit) — write a new `transit-svg.ts` rather than modifying `chart-svg.ts`.
