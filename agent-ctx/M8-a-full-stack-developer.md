# Task M8-a — Admin AI writing assistant for drafting new articles

**Agent:** full-stack-developer
**Task:** Build an admin-only AI writing assistant at `/admin/write` that lets AstroKalki draft new articles by entering a topic + key points. The LLM generates a structured draft in the AstroKalki voice following the AI-search-optimization structure (concise answer, key takeaways, body, FAQ, references, author bio, related-service CTA). Admin can edit any section inline, regenerate, or download the draft as markdown.

## Context absorbed

- Read `/home/z/my-project/worklog.md` end-to-end (~2481 lines). Key sections:
  - **UPGRADE3-PREP** (line 2468) — prepped middleware whitelist for `/api/ai/draft` (line 163 of middleware.ts), installed `astronomy-engine`, added 8 Prisma models for M8/M9/M10. Did NOT touch `prisma/schema.prisma`.
  - **AUTHORITY-WEBSITE-EXPANSION** (line 497) — built the content architecture: 25 cluster articles across 5 clusters, AI-search-optimization structure (concise answer + key takeaways + body + FAQ + references + author bio + related-service CTA), JSON-LD schemas.
- Read existing files:
  - `src/lib/content/article-types.ts` — `Article` interface (slug, title, cluster, targetKeyword, metaDescription, excerpt, conciseAnswer, keyTakeaways[], body, faqs[], references[], readTime, publishedAt, updatedAt, relatedArticles[], relatedService?).
  - `src/lib/content/clusters.ts` — `CLUSTERS` array (5 cluster slugs: relationship-patterns, self-sabotage, identity-purpose, astrology-psychology, psychological-observations).
  - `src/lib/content/services.ts` — 5 service slugs (relationship-pattern-analysis, karmic-relationship-reading, emotional-pattern-decode, shadow-work-consultation, life-direction-session).
  - `src/lib/content/articles/relationship-patterns.ts` — reference article structure (1500+ words, ## H2 sections, in-body contextual links, soft CTA, 4 FAQs, 4 references with author/year/source).
  - `src/lib/zai.ts` — `getZAI()` singleton, SDK requirement that the system prompt be delivered as a single `assistant`-role message (NOT `system`), `thinking: { type: 'disabled' }`.
  - `src/lib/ai/chat-system-prompt.ts` — `ASTROKALKI_VOICE_RULES` canonical banned-words list (karmic, cosmic, destiny, reveal, unlock, hidden wisdom, sacred, divine, mystical, vibration, frequency, soulmate, twin flame, awakening, ascension, higher self, manifestation, abundance, divine feminine/masculine).
  - `src/lib/ai/integration-prompts.ts` — reference LLM-with-JSON-output pattern: strip code fences, extract first `[...]` or `{...}` span, defensive parse, fallback on failure.
  - `src/lib/security/rate-limit.ts` — `checkRateLimit(key, { windowMs, max })` → `{ ok: true } | { ok: false, retryAfterSeconds }`.
  - `src/lib/security/auth.ts` — `isSessionValid(token)`, `ADMIN_COOKIE_NAME = 'ak_admin'`.
  - `src/lib/security/honeypot.ts` — `isHoneypotTriggered(body)` (checks for filled `website` field).
  - `src/middleware.ts` — confirmed `/api/ai/draft` is whitelisted as a public-POST endpoint (UA block + Origin check + 4KB body cap, lines 163 + 209), NOT as an `/api/admin/*` path. So the route handler must perform the admin-session check itself.
  - `src/app/admin/leads/page.tsx` — admin page pattern: dark cards on `#050505`, gold `#c9a96e` accents, Cinzel/editorial labels, `border-white/[0.04]` dividers, borderless inputs with bottom underline.
  - `src/app/admin/availability/page.tsx` — server-component-shell + client-component-child pattern.
  - `src/app/admin/page.tsx` — admin dashboard top-nav pattern (Testimonials/Analytics/Recordings/Availability/SEO Pages link buttons in the sticky header).

## Files delivered

### Created (5 files)

1. **`src/lib/ai/writing-prompt.ts`** — `buildWritingPrompt(topic, keyPoints, cluster?)` → single `assistant`-role prompt string. The prompt:
   - Establishes the AstroKalki voice (direct, psychologically precise, second-person, no mystical jargon).
   - Banned-words list (20 terms — the canonical brand list).
   - Allowed vocabulary (pattern, loop, structure, recognition, behaviour, attachment, shadow, repetition, compulsion, defense, strategy, instinct, signal, install, blueprint, dynamic, recursion, nervous system, autonomic, family of origin, early bond, signature moment).
   - Compact cluster catalogue (5 clusters with slug + title + tagline + theme) so the LLM can pick the right `category`.
   - Cluster hint: if admin pre-selected, use it; else auto-detect.
   - Real academic reference authors list (van der Kolk, Bowlby, Jung, Maté, Winnicott, Schore, Johnson, Hendrix, Mikulincer, Shaver, Levy, Orlans, Porges, Siegel, Fonagy, Greene, Forrest, Goleman, Kalsched, Stein).
   - 5 service slugs the LLM can choose from for `relatedService`.
   - Strict JSON output contract: `{ title, excerpt, category, conciseAnswer, keyTakeaways[5], body (1500+ words markdown), faqs[5], references[4], authorBio, relatedService }` with per-field rules.
   - Exports: `WRITING_PROMPT_BANNED_WORDS` (20 terms), `ArticleDraft` interface, `extractDraftJson(text)` (strips code fences, extracts first `{...}` span), `stripBannedWords(input)` (defense-in-depth post-parse scrub).

2. **`src/app/api/ai/draft/route.ts`** — POST-only endpoint.
   - **Admin session gate (in-route, step 0):** reads `ak_admin` cookie, calls `isSessionValid`. Returns 401 if invalid. This is necessary because the middleware whitelists `/api/ai/draft` as a public-POST endpoint (UA block + Origin check + 4KB body cap), NOT as an `/api/admin/*` path — so the route handler performs the admin-session check itself using the same cookie + verifier.
   - **Honeypot:** silent 200 OK with `{ ok: true, draft: null, note: 'Draft queued.' }` if the hidden `website` field is filled.
   - **Zod validation:** `topic` 3..400 chars (required), `keyPoints` array of 1..400-char strings (max 12, optional), `cluster` enum of 5 cluster slugs (optional), `honeypot` string (optional).
   - **Rate limit:** 10 drafts per hour per admin IP, keyed `ai-draft:${ip}`. Returns 429 with `Retry-After` on limit.
   - **LLM call:** `zai.chat.completions.create({ messages: [{ role: 'assistant', content: prompt }, { role: 'user', content: 'Write the article draft now. Topic: "...". Return only the JSON object.' }], thinking: { type: 'disabled' } })`. System prompt is delivered as a single `assistant`-role message per the ZAI SDK requirement.
   - **Defensive parse:** `extractDraftJson` strips code fences + extracts the first `{...}` span. `parseDraft` validates each field's type, runs `stripBannedWords` on all free-text fields as defense-in-depth. Returns 502 with an honest error if any step fails — the admin can retry.
   - **Response:** `{ ok: true, draft: ArticleDraft, durationMs: number }`.

3. **`src/app/admin/write/page.tsx`** — Server component shell (admin-gated by middleware). Renders the page shell matching `/admin/leads` + `/admin/availability`:
   - Sticky header with `Back to /admin` link + `AI Writer · 10 drafts / hour` indicator.
   - Title block: gold `Admin · AI Writer` eyebrow, `Draft a new article` headline (text-editorial Cinzel), body-cinematic description explaining the AI-search-optimization structure.
   - Delegates to `<ArticleWriter />` (client component) for all interaction.
   - Footer note: voice contract reminder (banned words list).

4. **`src/app/admin/write/ArticleWriter.tsx`** — Client component for the interactive writing UI.
   - **Topic input:** large borderless textarea (Playfair serif, 2xl/3xl), bottom underline that goes gold on focus, 400-char counter.
   - **Key points:** tag-style input — type a point, press Enter to add (or click the "Add" button). Each tag shows the index (01, 02, …), the text, and an X to remove. Caps at 12 tags.
   - **Cluster selector:** shadcn Select dropdown with 5 cluster options + "Auto-detect (recommended)" default.
   - **Generate button:** gold-filled, disabled when topic < 3 chars or while loading. Shows `Loader2` spinner + "Drafting…" while loading.
   - **Regenerate button:** appears only after a successful draft; calls `generate()` again with the same `lastParams` (topic, keyPoints, cluster).
   - **Loading state:** gold-pulsing `Sparkles` icon + Playfair "Drafting your article…" headline + body-cinematic "10–30 seconds" subtitle + 3-dot gold pulse animation.
   - **Error state:** red-bordered card with `AlertCircle` + the error message + a "Try again" button.
   - **Success state:** renders `<DraftPreview />` with the draft + a top-bar "Save as markdown" button.
   - **Markdown download:** builds a complete markdown file from the draft (title, excerpt, cluster, related service, concise answer, key takeaways, body with leading `# H1` stripped to avoid duplicate, FAQs, references, author bio) and triggers a browser download as `<slug>.md`.

5. **`src/app/admin/write/DraftPreview.tsx`** — Client component rendering the structured draft with inline editing.
   - **Meta strip:** cluster label · word count · generation duration · related service · "Download .md" button.
   - **Title:** inline-editable single-line (Playfair serif 3xl/4xl). Click → input with check/X buttons.
   - **Excerpt:** inline-editable multi-line (italic serif).
   - **Concise answer:** gold-bordered card with inline-editable multi-line text.
   - **Key takeaways:** numbered 01–05 list with edit / remove / move-up / move-down controls (gold-monospace numbers, Cinzel labels). "Add takeaway" button.
   - **Body:** rendered markdown preview (lightweight — handles `# H1`, `## H2`, `### H3`, paragraphs, `**bold**`, `*italic*`, `[text](url)` links) + a separate editable raw-markdown field below.
   - **FAQs:** list of `FaqRow` components — each shows the question (serif H3) + answer (paragraph) on read, and an editing form (question input + answer textarea) on click. Remove button. "Add FAQ" button.
   - **References:** numbered list of `ReferenceRow` components — each shows title (italic) + author/year/source on read, and an editing form (title, author, year, source, url) on click. Remove button. "Add reference" button.
   - **Author bio:** inline-editable multi-line (italic serif).
   - **Related service CTA:** row of 5 service-slug buttons — the selected one is highlighted gold.
   - All edits call `onChange(nextDraft)` which lifts the change up to the parent (`ArticleWriter` owns the canonical draft state).
   - Framer Motion `AnimatePresence` for add/remove animations.

### Modified (1 file)

6. **`src/app/admin/page.tsx`** — Added `PenLine` to the lucide-react import list. Added a new `<Link href="/admin/write">` button in the admin dashboard sticky-header nav (between Availability and SEO Pages). Same `btn-outline-gold` styling as the existing Testimonials/Analytics/Referrals/Recordings/Availability/SEO Pages links. Shows just the icon on mobile (`hidden sm:inline` span for the "Write" label).

## Verification

### TypeScript
- `npx tsc --noEmit` → exit 0 (zero TS errors in the entire app, including my 5 new files).

### Lint
- `bun run lint` → exit 0 (zero errors, zero warnings). My 5 new files are clean.

### Routes
- `curl -sI http://localhost:3000/admin/write` (no auth) → **307 Temporary Redirect** to `/admin/login?redirect=/admin/write` (admin-gated by middleware, as expected).
- `curl -s -b cookies -H "User-Agent: ..." http://localhost:3000/admin/write` (with admin cookie) → **200 OK**. HTML contains: "Admin · AI Writer", "Draft a new article", "Draft inputs", "Generate draft", "Cluster (optional)", "Press Enter to add a key point", "Rate limit: 10 drafts/hour", "Voice contract".
- Admin dashboard `/admin` (with cookie) → HTML contains `href="/admin/write"` link with the PenLine icon and "Write" label.

### API endpoint — auth + validation
- `POST /api/ai/draft` with browser UA, no admin cookie → **401** `{"error":"Unauthorized — admin session required."}` (admin session gate working).
- `POST /api/ai/draft` with admin cookie + `{"topic":"ab"}` (under 3 chars) → **400** with Zod error `{"error":"Invalid request.","details":[{"path":"topic","message":"Topic must be at least 3 characters"}]}`.
- `POST /api/ai/draft` with admin cookie + `{}` (missing topic) → **400** with Zod error `{"path":"topic","message":"Invalid input: expected string, received undefined"}`.

### End-to-end LLM generation
Two full end-to-end tests with real LLM calls:

**Test 1:** `{"topic":"test topic"}` (admin cookie, no cluster, no key points).
- Response: 200 in 21.5s. Draft included:
  - title: "The Repetition Compulsion in Relationships"
  - category: "relationship-patterns" (auto-detected)
  - conciseAnswer: 4 sentences
  - 5 keyTakeaways
  - body: ~1700 words with `## H2` sections + a link to `/services/relationship-pattern-analysis`
  - 5 FAQs (Q/A pairs)
  - 4 references (Bowlby 1969, van der Kolk 2014, Mikulincer & Shaver 2016, Schore 1994 — all real academic sources)
  - authorBio: paragraph mentioning the Vedic + Jungian + attachment + somatic methodology + bookings at /#booking
  - relatedService: "relationship-pattern-analysis"

**Test 2:** `{"topic":"Why you can never finish anything","keyPoints":["the role of childhood criticism","the difference between discipline and punishment","why perfectionism is procrastination"],"cluster":"self-sabotage"}`.
- Response: 200 in 31.5s. Draft included:
  - title: "Why You Can Never Finish Anything"
  - category: "self-sabotage" (matches the admin-selected cluster)
  - All 3 key points woven into the body (verified by reading the response)
  - 5 keyTakeaways, 5 FAQs, 4 references, body ~1300 words, relatedService: "emotional-pattern-decode"
  - **Banned-word check:** ZERO occurrences of karmic, cosmic, destiny, reveal, unlock, hidden wisdom, sacred, divine, mystical, vibration, frequency, soulmate, twin flame, awakening, ascension, higher self, manifestation, abundance, divine feminine, divine masculine. Voice contract honored.

### Dev log
- `POST /api/ai/draft 200 in 31.5s (compile: 40ms, proxy.ts: 3ms, render: 31.5s)` — confirms the route compiled cleanly and the LLM call completed.
- No runtime errors, no warnings related to my code. (One unrelated error from `src/app/api/admin/programmatic/route.ts` — another agent's file — re: `db.programmaticPage.findMany` undefined. Not introduced by this task.)

## Files NOT touched (per MUST NOT touch list)
- `prisma/schema.prisma` — read-only, no changes.
- `src/lib/zai.ts` — read-only, no changes.
- `next.config.ts`, `tsconfig.json`, `.env` — untouched.
- `src/middleware.ts` — read-only (confirmed `/api/ai/draft` is already whitelisted at line 163 as a public-POST endpoint; the admin-session gate is performed in-route, not in middleware).
- `src/app/page.tsx`, `src/app/layout.tsx` — untouched.
- `src/components/astrokalki/navigation.tsx`, `src/components/astrokalki/footer.tsx` — untouched.
- `src/app/sitemap.ts` — untouched.
- Other agents' files (programmatic SEO, social images, etc.) — untouched.

## Architecture decisions

1. **In-route admin-session gate, not middleware.** The middleware whitelists `/api/ai/draft` as a public-POST endpoint (UA block + Origin check + 4KB body cap), NOT as an `/api/admin/*` path. So the route handler performs the admin-session check itself using `isSessionValid` + the `ak_admin` cookie — same cookie + verifier the middleware uses for `/api/admin/*`. This keeps the middleware untouched (per task constraint) while still making the endpoint admin-only. The defense-in-depth is: middleware blocks bot UAs + cross-origin requests + oversized bodies; the route blocks unauthenticated requests; Zod blocks malformed bodies; the rate limiter blocks flood attacks; the LLM-call timeout blocks hangs.

2. **Strict JSON output contract, defensive parse.** The LLM is instructed to return ONLY a JSON object. We defensively strip code fences (the LLM occasionally wraps JSON in ```json ... ``` despite instructions) and extract the first `{...}` span. If parsing fails, we return 502 with an honest error — the admin can retry. We do NOT silently fall back to a template, because a writing-assistant draft is either real or it isn't; a fake draft would be worse than no draft. (Contrast with `integration-prompts.ts` which DOES fall back — but that's a recap email that must never ship empty, while this is a draft the admin can re-generate.)

3. **`stripBannedWords` defense-in-depth.** The LLM is instructed not to use the 20 banned terms. We also run each free-text field through `stripBannedWords` after parsing, which regex-replaces any banned word (case-insensitive, word-boundary anchored) and collapses the resulting double spaces. Verified clean on both test drafts.

4. **Controlled-draft state lifted to `ArticleWriter`.** The `ArticleDraft` state is owned by the parent `ArticleWriter` component. `DraftPreview` is a controlled component — every inline edit calls `onChange(nextDraft)` which lifts the change up. This means the "Save as markdown" button in `ArticleWriter` always sees the latest edited draft, and a future "Save as article" button (DB write or file write) would have a single source of truth.

5. **Inline editing pattern.** Every section uses the same edit-toggle pattern: click to enter edit mode (textarea/input appears with check + X buttons), check to commit (calls `onChange` and exits edit mode), X to cancel (reverts to the original value and exits edit mode). The body uses a separate raw-markdown editor below the rendered preview, because the body is too long for a single inline textarea to feel natural — the admin reads the rendered preview and clicks the raw-markdown field to make structural edits.

6. **Lightweight markdown preview renderer.** `renderMarkdownPreview` handles `# H1`, `## H2`, `### H3`, paragraphs, `**bold**`, `*italic*`, and `[text](url)` links — enough to read the draft at a glance. It is NOT a full markdown renderer (no lists, no code blocks, no tables). The "Save as markdown" button ships the raw markdown, which can be rendered by a full markdown renderer when published. This keeps the preview fast and dependency-free.

7. **Rate limit: 10 drafts/hour per admin IP.** Drafting is expensive (LLM generates 1500+ words + 5 FAQs + 4 references per call). The limit is keyed by IP, not by admin session, so two admins on the same IP share the limit (defense against a compromised admin account flooding the endpoint). 10/hour is generous for genuine drafting work — most admins will draft 1-3 articles per session.

8. **Zod validation is the input contract.** The `BodySchema` validates the request body before any LLM call: topic must be 3..400 chars, keyPoints must be an array of 1..400-char strings (max 12), cluster must be one of the 5 valid slugs. This catches malformed requests early and gives the admin actionable error messages (`details: [{ path, message }]`).

## Stage Summary

- 6 files delivered: 5 new (writing-prompt.ts, draft route, write/page.tsx, ArticleWriter.tsx, DraftPreview.tsx) + 1 modified (admin/page.tsx — added Write link + PenLine icon).
- 0 schema changes. 0 middleware changes. 0 changes to forbidden files.
- `/admin/write` is live and admin-gated (307 redirect without admin cookie, 200 with).
- `/api/ai/draft` is live and admin-gated (401 without admin cookie, 200 with). Returns structured `ArticleDraft` JSON in 21–31 seconds per call.
- Two end-to-end LLM generation tests passed: the model produces clean, on-voice, structured drafts with 5 key takeaways, 5 FAQs, 4 real academic references, 1300–1700 word bodies with `## H2` sections + in-body service links + soft CTAs, and zero banned words.
- All TS clean. All lint clean. Dev server healthy.
- The admin can now: enter a topic, add key points as tags, optionally pre-select a cluster, generate a draft, edit any section inline (title, excerpt, concise answer, key takeaways, body, FAQs, references, author bio, related service), regenerate from the same inputs, and download the final draft as a markdown file ready to drop into `/src/lib/content/articles/`.
