import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { checkRateLimit, getClientIp } from '@/lib/security';
import { buildChatSystemPrompt } from '@/lib/ai/chat-system-prompt';

/**
 * POST /api/ai/chat
 *
 * Member-only AI chatbot endpoint — "Ask AstroKalki".
 *
 * Auth-gated via NextAuth (database session). Accepts:
 *   { message: string, conversationId?: string }
 *
 * Flow:
 *   1. Auth gate — return 401 if no session.
 *   2. Rate limit — 20 messages per hour per user (keyed by email).
 *   3. Validate body — message must be 1..4000 chars; conversationId optional.
 *   4. If no conversationId: create a new ChatConversation with the title
 *      derived from the first 50 chars of the first message.
 *   5. Load the last 20 messages of the conversation from the DB.
 *   6. Build messages array: [system prompt as assistant role, ...history,
 *      new user message].
 *   7. Call ZAI LLM with thinking disabled.
 *   8. Persist the user message and the assistant response to the DB.
 *   9. Return { response, conversationId }.
 *
 * NOTE on role mapping: the ZAI SDK requires the system prompt to be
 * delivered as a single `assistant`-role message (NOT `system`), and
 * thinking must be disabled. See /src/lib/zai.ts.
 *
 * The endpoint is on the middleware's public-POST-API whitelist (under
 * /api/ai/chat), so the bot UA block + CSRF Origin check apply. The 4KB
 * body cap is enforced by middleware — chat messages are short, so this
 * is fine; longer messages get truncated at the validation step.
 */

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_ASSISTANT_RESPONSE_CHARS = 4000;

/** Per-user rate limit: 20 messages per hour. Keyed by email (not IP). */
const CHAT_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  max: 20,
} as const;

interface ChatRequestBody {
  message?: unknown;
  conversationId?: unknown;
}

interface DbChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

/**
 * Trim + sanity-check the user message. Returns null if invalid.
 */
function sanitizeMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_MESSAGE_CHARS) return trimmed.slice(0, MAX_MESSAGE_CHARS);
  return trimmed;
}

/**
 * Generate a human-readable title from the first user message.
 * Caps at 50 chars and appends an ellipsis if truncated.
 */
function titleFromMessage(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 50).trimEnd() + '…';
}

/**
 * Convert DB rows to the ZAI messages array shape.
 *
 * The first message is always the system prompt (as `assistant` per SDK
 * requirement). History messages use their original roles (`user`/`assistant`).
 */
function buildMessagesArray(
  systemPrompt: string,
  history: DbChatMessage[],
  newUserMessage: string
): Array<{ role: 'assistant' | 'user'; content: string }> {
  const messages: Array<{ role: 'assistant' | 'user'; content: string }> = [
    { role: 'assistant', content: systemPrompt },
  ];

  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      // Defensive: skip empty / over-long messages in history
      const content = msg.content?.trim();
      if (!content) continue;
      messages.push({
        role: msg.role,
        content: content.slice(0, MAX_MESSAGE_CHARS),
      });
    }
  }

  messages.push({ role: 'user', content: newUserMessage });
  return messages;
}

export async function POST(request: NextRequest) {
  // ─── 1. Auth gate ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required to chat with AstroKalki AI.' },
      { status: 401 }
    );
  }
  const email = session.user.email;

  // ─── 2. Rate limit (20/hour per user, keyed by email) ──────────────────
  // We also stamp the IP into the key as a defence-in-depth measure: if a
  // single IP is rotating accounts to flood the endpoint, the IP half of
  // the key will saturate first and surface the abuse in logs.
  const ip = getClientIp(request);
  const rlKey = `ai-chat:${email}:${ip}`;
  const rl = checkRateLimit(rlKey, CHAT_RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          "You've reached the hourly chat limit. The work continues when you return.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // ─── 3. Parse + validate body ──────────────────────────────────────────
  let raw: ChatRequestBody;
  try {
    const text = await request.text();
    if (text.length > 8 * 1024) {
      // 8KB safety net — middleware caps at 4KB by default for /api/ai/chat,
      // but be defensive. The gateway may rewrite Content-Length.
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userMessage = sanitizeMessage(raw.message);
  if (!userMessage) {
    return NextResponse.json(
      { error: 'Message is required (1–4000 characters).' },
      { status: 400 }
    );
  }

  const conversationIdRaw = raw.conversationId;
  const conversationId =
    typeof conversationIdRaw === 'string' && conversationIdRaw.length > 0
      ? conversationIdRaw.trim().slice(0, 100)
      : null;

  // ─── 4. Conversation: load existing or create new ──────────────────────
  let conversation: { id: string; email: string; title: string };

  try {
    if (conversationId) {
      const existing = await db.chatConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, email: true, title: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Conversation not found.' },
          { status: 404 }
        );
      }
      // Ownership check — the conversation must belong to this member.
      if (existing.email !== email) {
        return NextResponse.json(
          { error: 'Conversation not found.' },
          { status: 404 }
        );
      }
      conversation = existing;
    } else {
      const created = await db.chatConversation.create({
        data: {
          email,
          title: titleFromMessage(userMessage),
        },
        select: { id: true, email: true, title: true },
      });
      conversation = created;
    }
  } catch (err) {
    console.error('[ai/chat] conversation lookup/create failed:', err);
    return NextResponse.json(
      { error: 'Could not load conversation. Please try again.' },
      { status: 500 }
    );
  }

  // ─── 5. Load conversation history (last 20 messages) ───────────────────
  let history: DbChatMessage[] = [];
  try {
    history = await db.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: MAX_HISTORY_MESSAGES,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error('[ai/chat] history load failed:', err);
    // Non-fatal — proceed with empty history. The user message + system
    // prompt are enough to produce a coherent response.
    history = [];
  }

  // ─── 6. Build messages array ───────────────────────────────────────────
  const systemPrompt = buildChatSystemPrompt();
  const messages = buildMessagesArray(systemPrompt, history, userMessage);

  // ─── 7. Call ZAI LLM ───────────────────────────────────────────────────
  let assistantResponse: string;
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw || typeof raw !== 'string') {
      throw new Error('Empty completion from ZAI');
    }
    assistantResponse = raw.trim().slice(0, MAX_ASSISTANT_RESPONSE_CHARS);
  } catch (err) {
    console.error('[ai/chat] ZAI completion failed:', err);
    return NextResponse.json(
      {
        error:
          'The pattern is not coming into focus right now. Try again in a moment.',
      },
      { status: 502 }
    );
  }

  // ─── 8. Persist user message + assistant response ──────────────────────
  try {
    await db.$transaction([
      db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: userMessage,
        },
        select: { id: true },
      }),
      db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantResponse,
        },
        select: { id: true },
      }),
      // Touch updatedAt so the conversation bubbles to the top of the
      // sidebar list on the next /conversations fetch.
      db.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
        select: { id: true },
      }),
    ]);
  } catch (err) {
    console.error('[ai/chat] persistence failed:', err);
    // We still return the response — the member got their answer. The next
    // message in this conversation just won't see the prior context, which
    // is degraded but not broken.
    return NextResponse.json(
      {
        response: assistantResponse,
        conversationId: conversation.id,
        warning: 'Response delivered, but could not save to history.',
      },
      { status: 200 }
    );
  }

  // ─── 9. Return ─────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      response: assistantResponse,
      conversationId: conversation.id,
    },
    { status: 200 }
  );
}
