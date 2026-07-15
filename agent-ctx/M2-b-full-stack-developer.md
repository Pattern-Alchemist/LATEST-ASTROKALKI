# Task ID: M2-b — Testimonials moderation + public submission flow

## Task
Build a proper submission → moderation → publish flow for testimonials:
- Public submit form at /testimonials/submit
- POST /api/testimonials (public, rate-limited, validated, honeypot, creates pending row, admin email)
- GET /api/testimonials (only approved+featured)
- Admin moderation queue at /admin/testimonials (server component, tabbed)
- Admin CRUD: GET/POST /api/admin/testimonials, PATCH/DELETE /api/admin/testimonials/[id]
- Client action buttons (Approve/Reject/Feature/Delete) with router.refresh()
- Link from /admin dashboard to /admin/testimonials
- "Share your experience" link from /testimonials page

## Files Created
- `src/app/api/admin/testimonials/route.ts` — GET (paginated, status filter) + POST (admin seed-create with explicit status)
- `src/app/api/admin/testimonials/[id]/route.ts` — PATCH (update any subset of fields) + DELETE
- `src/app/admin/testimonials/page.tsx` — Server component, tabbed view (Pending/Approved/Rejected/All), dark editorial cards, reads ?status= searchParam
- `src/app/admin/testimonials/TestimonialActions.tsx` — Client component, text-link buttons, calls router.refresh() after each PATCH/DELETE
- `src/app/testimonials/submit/page.tsx` — Public submission form, react-hook-form + Zod, borderless underline inputs, honeypot, success state

## Files Modified
- `src/app/api/testimonials/route.ts` — Added POST (public submission, rate-limited, validated, honeypot, admin email); updated GET to filter status='approved' AND featured=true
- `src/app/testimonials/page.tsx` — Updated DB query to filter status='approved' AND featured=true; added "Share your experience" link to /testimonials/submit
- `src/app/admin/page.tsx` — Added "Testimonials" link in admin header (Quote icon, alongside Analytics)
- `src/lib/security/validation.ts` — Replaced legacy `testimonialInputSchema` with new public-submission contract (quote 10-2000, context 3-100, initials 2-20, email valid, pattern enum, website honeypot); exported `TESTIMONIAL_PATTERNS` constant
- `src/lib/security/honeypot.ts` — Updated `honeypotSuccessResponse('testimonials')` to return canonical success message

## Files NOT Touched (per task constraints)
- prisma/schema.prisma (M1 already added status/email/pattern columns)
- src/middleware.ts (already gates /api/admin/* — reused)
- next.config.ts, tsconfig.json, .env
- src/app/page.tsx, src/app/layout.tsx
- src/components/astrokalki/navigation.tsx, footer.tsx
- src/app/sitemap.ts
- Other agents' files

## Verification
- `npx tsc --noEmit` — zero TS errors in M2-b files. (11 pre-existing TS errors in /api/stripe/* untouched.)
- Smoke tests via curl with browser UA + Origin:
  - POST /api/testimonials (valid) → 201 `{"message":"Thank you. Your testimonial is awaiting review."}` + DB row with status='pending'
  - POST /api/testimonials (invalid) → 400 with Zod error
  - POST /api/testimonials (honeypot filled) → 201 same success message, NO DB row created
  - POST /api/testimonials (curl UA) → 403 (middleware bot block)
  - Admin login → 200 + ak_admin cookie
  - GET /api/admin/testimonials?status=pending (with session) → 200 with full record incl. email
  - PATCH /api/admin/testimonials/[id] {status:'approved',featured:true} → 200 with updated testimonial
  - GET /api/testimonials after approve+feature → 200 with the testimonial now public
  - GET /api/admin/testimonials (no session) → 401
  - GET /admin/testimonials (no session) → 307 redirect to /admin/login
  - GET /testimonials/submit → 200 (all form fields render)
  - GET /testimonials → 200 (new "Share your experience" section renders)
- Test data cleaned up via direct DB script after testing.

## Design System Compliance
- #050505 bg, #c9a96e gold accent, #f0eee9/#9a9a9a/#7a7a7a text
- Playfair Display serif headlines, Cinzel editorial labels
- Borderless underline inputs with gold focus underline (booking.tsx style)
- Text-link buttons (no boxed) — gold underline on hover
- Dark cards on admin, monospace IDs, status dots
- NO blue/indigo colors used
- Mobile-first responsive (grid breakpoints, mobile safe-area aware)
- Sticky footer pattern (min-h-screen flex flex-col, mt-auto on footer)

## Key Implementation Decisions
1. **Server component for admin/testimonials/page.tsx** — direct Prisma query (no fetch roundtrip), tabs as Link components (server-rendered navigation), `searchParams` prop drives active tab. Client TestimonialActions calls `router.refresh()` to re-run the server query after mutations.
2. **Strict PATCH schema** — `.strict()` rejects unknown fields; only the fields the admin explicitly sends are written. Nullable fields (email, pattern, etc.) accept empty string → null transform.
3. **TestimonialActions conditionally renders buttons** — already-approved hides Approve, already-rejected hides Reject, featured shows "Unfeature" + filled gold star.
4. **Submit page uses native select** for pattern dropdown (styled to match dark theme via `appearance-none` + per-option dark backgrounds) — simpler than shadcn Select for a single optional field.
5. **Admin notification email** includes the full quote, submitter email, pattern tag, and a direct link to /admin/testimonials — non-blocking (Promise.allSettled-style) so submission success doesn't depend on email delivery.
6. **Public GET filter is status='approved' AND featured=true** — moderator must explicitly approve AND feature for a submission to appear publicly. Approving alone keeps it in /admin but not on /testimonials.
