# Task: Create New AstroKalki Enhancement UI Components

## Summary
Created 8 new UI components and 2 API routes for the AstroKalki website enhancement features. All components follow the existing design system (dark cinematic luxury, gold/crimson/muted palette, framer-motion animations, scroll-reveal patterns).

## Files Created

### Frontend Components (`src/components/astrokalki/`)

1. **micro-reading.tsx** — 3-step interactive quiz lead magnet
   - Step 1: Month selection (4x3 grid)
   - Step 2: Emotional pattern chips (6 options)
   - Step 3: Relationship frustration (6 options)
   - Email capture gate before showing result
   - Mystical reveal animation with karmic number
   - Posts to `/api/micro-reading`

2. **cursor-trail.tsx** — Gold particle trail following mouse cursor
   - 10 gold particles with decreasing opacity
   - CSS transitions for smooth following (not JS animation loops)
   - Hidden on touch devices
   - Max opacity 0.3, fading to 0
   - pointer-events: none, z-index: 9999

3. **karmic-number.tsx** — Scroll-triggered numerological number reveal
   - Numbers appear and dissolve with mystical glow
   - Calculated from scroll position + time
   - Random viewport positioning within margins (15%-85%)
   - Very subtle (opacity 0.05-0.08)
   - Triggers every ~15 seconds of scrolling

4. **ambient-sound.tsx** — Ambient sound toggle button
   - ☯ symbol icon button (~32x32px)
   - Web Audio API drone pad (Om frequency + harmonics)
   - Subtle volume (0.12 max)
   - Pulsing gold glow when active
   - localStorage preference persistence
   - Smooth 1.5s fade in/out

5. **scarcity-indicator.tsx** — "Spots remaining" indicator
   - Shows "2-4 spots remaining this week"
   - Pulsing gold dot
   - Slight randomization on mount
   - Appears above booking CTA

6. **referral-badge.tsx** — Referral/invite component
   - "Invite a friend — you both get ₹200 off"
   - Copy Link button generating referral URL
   - Shows shareable code (AK-XXXXXX format)
   - Posts to `/api/referrals` on share
   - localStorage code persistence

7. **membership-tiers.tsx** — 3-tier membership section
   - Single Session (₹1,999 one-time)
   - Pattern Decoder Monthly (₹999/mo) — "Most Popular" badge
   - Annual Decoder (₹9,999/yr)
   - Uses tier images: /3d/tier-decode.png, tier-relate.png, tier-shadow.png
   - CTAs link to WhatsApp with membership type in message

8. **recorded-reading.tsx** — Digital product section
   - Session Recording Add-on (₹499)
   - Audio waveform visual animation
   - "Add to My Session" CTA → WhatsApp

### API Routes (`src/app/api/`)

9. **micro-reading/route.ts** — POST handler
   - Validates email, month, patterns, frustration
   - Saves to MicroReading Prisma model
   - Returns result hint

10. **referrals/route.ts** — POST + GET handlers
    - POST: share/validate actions
    - GET: lookup by code
    - Uses Referral Prisma model

### Updated Files

11. **page.tsx** — Integrated all new components
    - MicroReading after MicroDiagnosis
    - MembershipTiers after Services
    - ScarcityIndicator + RecordedReading after Booking
    - ReferralBadge before Footer
    - CursorTrail + KarmicNumber as global overlays
    - AmbientSound as fixed button (top-right, desktop only)

## Design Compliance
- ✅ `text-editorial` for Cinzel headings
- ✅ `text-body-cinematic` for body text
- ✅ `btn-primary-gold` and `btn-outline-gold` button classes
- ✅ `card-depth` for card hover effects
- ✅ `crimson-line` for accent lines
- ✅ `glow-gold` for heading glow
- ✅ All components `"use client"`
- ✅ Responsive (mobile-first)
- ✅ framer-motion animations
- ✅ Scroll-reveal pattern with `useInView`

## Lint Status
All new components pass lint. Remaining errors are pre-existing in other files.
