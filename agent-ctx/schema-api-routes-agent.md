# Task: Prisma Schema & API Routes for AstroKalki

## Summary

Created the complete Prisma schema with 10 models and 10 API routes for the AstroKalki website enhancements. Seeded the Insight table with 5 articles. Build verified successful.

## Files Created/Modified

### Prisma Schema (Modified)
- `/home/z/my-project/prisma/schema.prisma` — Replaced User/Post models with 10 new models:
  1. **Booking** — id, name, email, phone, duration, price, contexts (JSON), birthDate, birthTime, birthPlace, message, status, referredBy, createdAt, updatedAt
  2. **AnalyticsEvent** — id, event, data (JSON), page, timestamp, sessionId
  3. **Newsletter** — id, email (unique), source, createdAt
  4. **Insight** — id, slug (unique), title, category, excerpt, content (markdown), readTime, published, featuredImage, createdAt, updatedAt
  5. **MicroReading** — id, email, birthMonth, emotionalPattern, relationshipFrustration, resultHint, createdAt
  6. **Referral** — id, code (unique), referrerName, referrerEmail, uses, createdAt
  7. **Testimonial** — id, quote, context, initials, detail, avatarUrl, videoUrl, featured, order, createdAt
  8. **RecordedReading** — id, bookingId (optional FK), audioUrl, title, duration, price, createdAt
  9. **Membership** — id, email, name, plan, status, stripeSessionId, createdAt, updatedAt
  10. **SiteConfig** — id, key (unique), value, updatedAt

### API Routes (Created)
1. `/home/z/my-project/src/app/api/bookings/route.ts` — POST (create booking), GET (list with pagination/filtering)
2. `/home/z/my-project/src/app/api/analytics/route.ts` — POST (track events, lightweight, no auth)
3. `/home/z/my-project/src/app/api/newsletter/route.ts` — POST (subscribe, dedup by email)
4. `/home/z/my-project/src/app/api/insights/route.ts` — GET (list published, with category filter)
5. `/home/z/my-project/src/app/api/insights/[slug]/route.ts` — GET (single insight by slug)
6. `/home/z/my-project/src/app/api/micro-reading/route.ts` — POST (quiz submission, returns archetypal pattern hint)
7. `/home/z/my-project/src/app/api/referrals/route.ts` — POST (create code), GET (lookup by code, increments uses)
8. `/home/z/my-project/src/app/api/testimonials/route.ts` — GET (list featured, ordered)
9. `/home/z/my-project/src/app/api/og/route.tsx` — GET (dynamic OG image via next/og ImageResponse, edge runtime)
10. `/home/z/my-project/src/app/api/sitemap/route.ts` — GET (XML sitemap with static + dynamic insight pages)

### Seed Script (Created)
- `/home/z/my-project/scripts/seed-insights.ts` — Seeds 5 insight articles with ~500 words of markdown each

## Key Implementation Details

### Micro-Reading Pattern Logic
- 12 archetypal patterns (The Wounded Healer, The Shadow Bearer, The Invisible Child, etc.)
- Deterministic selection based on birthMonth + emotionalPattern + relationshipFrustration
- Uses hash mixing: primary index from birthMonth, offset from combined hash
- Result stored in MicroReading table

### OG Image Route
- Uses `next/og` ImageResponse with edge runtime
- Dark background (#050505), gold text (#c9a96e)
- Accepts `title` and `category` query params
- Branded with "AstroKalki" name and decorative elements
- File extension `.tsx` required for JSX support

### Build Verification
- `npx next build` succeeds with all routes detected
- Lint errors are pre-existing (scarcity-indicator.tsx etc.), not from new code
- Dev server running on port 3000

## Issues Encountered
1. **OG route JSX parsing error**: Initially created as `.ts` but JSX requires `.tsx` extension. Fixed by renaming.
2. No other issues — schema push, seed, and build all completed successfully.
