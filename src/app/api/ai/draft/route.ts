import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getZAI } from '@/lib/zai';
import {
  checkRateLimit,
  getClientIp,
  isSessionValid,
  ADMIN_COOKIE_NAME,
  isHoneypotTriggered,
} from '@/lib/security';
import { getAllAtlasSlugs } from '@/lib/content/patterns/atlas';
import {
  buildWritingPrompt,
  buildJsonOnlyRetryPrompt,
  extractDraftJson,
  stripBannedWords,
  type ArticleDraft,
} from '@/lib/ai/writing-prompt';

/**
 * POST /api/ai/draft
 *
 * Admin-only AI writing assistant endpoint. Generates a structured long-form
 * article draft in the AstroKalki voice following the AI-search-optimization
 * structure every existing cluster article uses.
 *
 * Accepts:
 *   { topic: string, keyPoints?: string[], type?: 'article'|'pillar', pattern?: string, cluster?: string, honeypot?: string }
 *
 * Returns:
 *   { ok: true, draft: ArticleDraft, durationMs: number }
 *
 * Guards (defense-in-depth, in order):
 *   1. Admin session gate — checked in-route via isSessionValid + the
 *      `ak_admin` cookie. The middleware whitelists /api/ai/draft as a
 *      public-POST endpoint (UA block + Origin check + body cap), NOT as
 *      an /api/admin/* path, so we perform the admin-session check
 *      ourselves. This is the only LLM-burning endpoint without a member
 *      gate; it must be admin-only.
 *   2. Honeypot field — silent 200 OK if filled (looks like a bot).
 *   3. Rate limit — 10 drafts per hour per admin IP. Drafting is expensive.
 *   4. Zod schema — topic required (3..400 chars), keyPoints optional array
 *      of strings (max 12, each max 400 chars), cluster optional string
 *      matching one of the 5 cluster slugs.
 *
 * LLM call:
 *   - System prompt delivered as a single `assistant`-role message per the
 *     ZAI SDK requirement (see /src/lib/zai.ts).
 *   - thinking: { type: 'disabled' } — drafting is a structured-output task,
 *     not a reasoning task.
 *
 * Response parsing:
 *   - The LLM is instructed to return ONLY a JSON object. We defensively
 *     strip code fences + extract the first {...} span. If parsing fails,
 *     return a 502 with an honest error message — the admin can retry.
 *   - Each draft field is run through `stripBannedWords` as a defense-in-depth
 *     pass against the brand's voice rules.
 */

/** Per-admin rate limit: 10 drafts/hour. Drafting is expensive. */
const DRAFT_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 10,
} as const;

const CLUSTER_SLUGS = [
  'relationship-patterns',
  'self-sabotage',
  'identity-purpose',
  'astrology-psychology',
  'psychological-observations',
] as const;

/** Snapshot of the 10 Atlas pattern slugs — used to validate the `pattern` body field. */
const ATLAS_SLUGS = getAllAtlasSlugs();

const BodySchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, 'Topic must be at least 3 characters')
    .max(400, 'Topic must be 400 characters or fewer'),
  keyPoints: z
    .array(z.string().trim().min(1).max(400))
    .max(12, 'At most 12 key points')
    .optional()
    .default([]),
  type: z.enum(['article', 'pillar']).optional().default('article'),
  pattern: z
    .string()
    .trim()
    .refine((s) => s === '' || ATLAS_SLUGS.includes(s), {
      message: 'Unknown Atlas pattern slug',
    })
    .optional()
    .transform((s) => (s ? s : undefined)),
  cluster: z.enum(CLUSTER_SLUGS).optional(),
  // Honeypot — must be empty. Filled = bot.
  honeypot: z.string().optional(),
});

/** Defensive parsing of the LLM response into the ArticleDraft shape. */
function parseDraft(rawJson: string): ArticleDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title : '';
  const excerpt = typeof obj.excerpt === 'string' ? obj.excerpt : '';
  const category = typeof obj.category === 'string' ? obj.category : '';
  const conciseAnswer =
    typeof obj.conciseAnswer === 'string' ? obj.conciseAnswer : '';
  const authorBio = typeof obj.authorBio === 'string' ? obj.authorBio : '';
  const relatedService =
    typeof obj.relatedService === 'string' ? obj.relatedService : '';

  const keyTakeaways = Array.isArray(obj.keyTakeaways)
    ? (obj.keyTakeaways as unknown[])
        .map((k) => (typeof k === 'string' ? k : ''))
        .filter((k) => k.length > 0)
    : [];

  const body = typeof obj.body === 'string' ? obj.body : '';

  const faqs = Array.isArray(obj.faqs)
    ? (obj.faqs as unknown[])
        .map((f) => {
          if (!f || typeof f !== 'object') return null;
          const fa = f as Record<string, unknown>;
          const q = typeof fa.q === 'string' ? fa.q : '';
          const a = typeof fa.a === 'string' ? fa.a : '';
          return q && a ? { q, a } : null;
        })
        .filter((f): f is { q: string; a: string } => Boolean(f))
    : [];

  const references = Array.isArray(obj.references)
    ? (obj.references as unknown[])
        .map((r) => {
          if (!r || typeof r !== 'object') return null;
          const ref = r as Record<string, unknown>;
          const title = typeof ref.title === 'string' ? ref.title : '';
          if (!title) return null;
          return {
            title,
            author: typeof ref.author === 'string' ? ref.author : undefined,
            year:
              typeof ref.year === 'number'
                ? ref.year
                : typeof ref.year === 'string' && /^\d{4}$/.test(ref.year)
                  ? parseInt(ref.year, 10)
                  : undefined,
            source: typeof ref.source === 'string' ? ref.source : undefined,
            url: typeof ref.url === 'string' ? ref.url : undefined,
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
    : [];

  const relatedArticles = Array.isArray(obj.relatedArticles)
    ? (obj.relatedArticles as unknown[])
        .map((s) => (typeof s === 'string' ? s : ''))
        .filter((s) => s.length > 0)
        .slice(0, 5)
    : [];

  // Minimum-viable sanity check — title + body + conciseAnswer are required.
  if (!title || !conciseAnswer || !body || body.length < 200) return null;

  // Apply banned-words scrub to all free-text fields. The LLM is instructed
  // not to use them, but defense-in-depth.
  return {
    title: stripBannedWords(title),
    excerpt: stripBannedWords(excerpt),
    category,
    conciseAnswer: stripBannedWords(conciseAnswer),
    keyTakeaways: keyTakeaways.map(stripBannedWords),
    body: stripBannedWords(body),
    faqs: faqs.map((f) => ({
      q: stripBannedWords(f.q),
      a: stripBannedWords(f.a),
    })),
    references,
    authorBio: stripBannedWords(authorBio),
    relatedService,
    relatedArticles,
  };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  // ─── 0. Admin session gate ─────────────────────────────────────────────
  // The middleware whitelists /api/ai/draft as a public-POST endpoint (UA
  // block + Origin check + body cap), NOT as an /api/admin/* path. So we
  // perform the admin-session check ourselves here using the same cookie +
  // verifier the middleware uses for /api/admin/*. Without this, the route
  // would be callable by anyone with a valid Origin header — and LLM drafts
  // are expensive.
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const sessionOk = await isSessionValid(sessionCookie).catch(() => false);
  if (!sessionOk) {
    return NextResponse.json(
      { error: 'Unauthorized — admin session required.' },
      { status: 401 }
    );
  }

  // ─── 1. Parse body ─────────────────────────────────────────────────────
  let raw: unknown;
  try {
    const text = await request.text();
    // 4KB cap is enforced by middleware; this is just defensive.
    if (text.length > 8 * 1024) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  // ─── 2. Honeypot ───────────────────────────────────────────────────────
  // If the hidden honeypot field was filled, this is a bot. Return a fake
  // success so it doesn't try a different strategy.
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json({
      ok: true,
      draft: null,
      note: 'Draft queued.',
    });
  }

  // ─── 3. Zod validation ─────────────────────────────────────────────────
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request.',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }
  const { topic, keyPoints, cluster, type, pattern } = parsed.data;

  // ─── 4. Rate limit — 10 drafts per hour per admin IP ───────────────────
  const ip = getClientIp(request);
  const rlKey = `ai-draft:${ip}`;
  const rl = checkRateLimit(rlKey, DRAFT_RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          "You've reached the hourly draft limit. The work continues when you return.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // ─── 5. Build prompt ───────────────────────────────────────────────────
  const prompt = buildWritingPrompt(topic, keyPoints, {
    type,
    cluster,
    pattern,
  });

  // ─── 6. Call ZAI LLM ───────────────────────────────────────────────────
  // Two-pass strategy: call once with the full prompt; if the response fails
  // JSON parsing, retry ONCE with a short "return valid JSON only" nudge.
  // The model occasionally wraps the JSON in a ```json fence or prepends a
  // chatty sentence despite the instructions — one nudge almost always
  // recovers it. We never retry more than once (defense against runaway
  // LLM spend).
  const userTurn = {
    role: 'user' as const,
    content: `Write the ${type} draft now. Topic: "${topic.trim()}".${pattern ? ` Atlas pattern: ${pattern}.` : ''} Return only the JSON object.`,
  };

  let rawResponse = '';
  let retried = false;
  for (let pass = 0; pass < 2; pass++) {
    let content = '';
    try {
      const zai = await getZAI();
      type ChatMsg = { role: 'assistant' | 'user'; content: string };
      const messages: ChatMsg[] =
        pass === 0
          ? [
              // NOTE: the ZAI SDK requires the system prompt to be a single
              // `assistant`-role message, NOT a `system`-role message. See
              // /src/lib/zai.ts and the chat route for prior precedent.
              { role: 'assistant', content: prompt },
              userTurn,
            ]
          : [
              { role: 'assistant', content: prompt },
              userTurn,
              // Include the previous (failed) assistant turn so the model
              // can see what it produced and correct it.
              { role: 'assistant', content: rawResponse },
              { role: 'user', content: buildJsonOnlyRetryPrompt() },
            ];
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
      content =
        (completion as { choices?: Array<{ message?: { content?: string } }> })
          ?.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      console.error(`[ai/draft] ZAI completion failed (pass ${pass + 1}):`, err);
      if (pass === 0) {
        // Network / API error — no point retrying the JSON-only path.
        return NextResponse.json(
          {
            error:
              'The draft did not come through. Try again in a moment — the model is occasionally slow on long-form generation.',
          },
          { status: 502 }
        );
      }
      return NextResponse.json(
        {
          error:
            'The draft did not come through after a retry. Try again in a moment.',
        },
        { status: 502 }
      );
    }
    if (!content || typeof content !== 'string') {
      if (pass === 0) continue;
      return NextResponse.json(
        { error: 'Empty completion from ZAI after retry.' },
        { status: 502 }
      );
    }
    rawResponse = content;

    // Try to parse JSON immediately — break out of the loop on success.
    const jsonText = extractDraftJson(rawResponse);
    if (jsonText) {
      const draft = parseDraft(jsonText);
      if (draft) {
        return NextResponse.json({
          ok: true,
          draft,
          durationMs: Date.now() - startedAt,
          retried,
        });
      }
    }
    // Parsing failed — if this was pass 0, retry with the JSON-only nudge.
    if (pass === 0) {
      console.warn(
        '[ai/draft] JSON parse failed on first pass. Retrying with JSON-only nudge. First 300 chars:',
        rawResponse.slice(0, 300)
      );
      retried = true;
      continue;
    }
  }

  // Both passes failed to produce parseable JSON.
  console.error(
    '[ai/draft] Failed to parse draft JSON after retry. Last response first 500 chars:',
    rawResponse.slice(0, 500)
  );
  return NextResponse.json(
    {
      error:
        'The draft came back in an unexpected shape after a retry. Try regenerating with more specific key points — the model occasionally wraps the JSON in prose.',
      retried,
    },
    { status: 502 }
  );
}
