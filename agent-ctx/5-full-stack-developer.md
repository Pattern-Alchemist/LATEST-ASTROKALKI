# Task 5 — Strengthen Author Page (Philosophy, Media, FAQ)

## Task
Strengthen `/author/astrokalki` page as a true entity hub by adding three new sections (Philosophy, Media & appearances, Author FAQ) plus a FAQPage JSON-LD schema alongside the existing Person schema.

## Files Modified
1. **`src/app/author/astrokalki/page.tsx`** — Added:
   - `AUTHOR_FAQS` constant (6 Q&A pairs in the brand voice, used for both on-page FAQ and FAQPage JSON-LD)
   - `MEDIA_APPEARANCES` constant (3 honest placeholder items, clearly formatted as `[Format] Title — Platform, Year`)
   - `faqSchema` JSON-LD object rendered alongside the existing `personSchema` via a second `<script type="application/ld+json">` block
   - **Philosophy section** (placed after Methodology) — 4 second-person plain-language paragraphs covering: astrology as diagnostic instrument (not prediction engine), the pattern is the patient, the pattern is autonomic not cognitive, and the refusal
   - **Media & appearances section** (placed after Philosophy) — eyebrow, intro paragraph, 3-item list, media-inquiries paragraph
   - **Author FAQ section** (placed after Media) — H3 serif font-light questions, `text-[#cfcabf] text-base leading-[1.8] font-light` answers, matching the insights article page FAQ treatment

## Visual Language Used
- Eyebrow: `text-[10px] tracking-[0.4em] uppercase text-[#c9a96e]/60 ... font-light`
- Section title (Philosophy): `font-serif text-[#f0eee9] font-light tracking-[-0.015em]`
- Body paragraphs: `text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light`
- FAQ H3: `text-lg sm:text-xl font-serif text-[#f0eee9] font-light tracking-[-0.01em]`
- FAQ answer: `text-[#cfcabf] text-base leading-[1.8] font-light`
- All new sections use the existing `pt-10 border-t border-white/[0.06] mb-16` divider/spacing convention

## Section Order in Final Page
1. Bio (About)
2. What the work addresses
3. The methodology
4. **Philosophy** (NEW)
5. **Media & appearances** (NEW)
6. **Frequently asked questions** (NEW)
7. Published work
8. Sessions offered
9. Connect

## Verification
- `bun run lint`: No errors in author page file (10 pre-existing errors in `footer.tsx` and `insights.tsx` are unrelated)
- `curl http://localhost:3000/author/astrokalki`: HTTP 200, no compile errors in dev.log
- Verified rendered HTML contains all new content markers: `Philosophy`, `Media & appearances`, `Frequently asked questions`, `Is AstroKalki a real person`, `Kalki is the tenth`, `Pattern recognition and the birth chart`
- Verified both JSON-LD schemas render: `"@type":"Person"` and `"@type":"FAQPage"`
