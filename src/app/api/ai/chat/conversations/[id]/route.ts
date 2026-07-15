import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/ai/chat/conversations/[id]
 * DELETE /api/ai/chat/conversations/[id]
 *
 * Auth-gated. Both verbs operate on a single ChatConversation owned by the
 * signed-in member.
 *
 *   GET    → returns the full conversation with all messages (oldest first),
 *            so the client can hydrate the chat panel without a second round-
 *            trip per message.
 *
 *   DELETE → soft-kills the conversation and its messages (the schema uses
 *            onDelete: Cascade on ChatMessage, so deleting the conversation
 *            drops its messages atomically). Returns 204 on success.
 *
 * Both verbs enforce ownership: a conversation whose email does not match
 * the session email is reported as 404 (not 403) — never confirm to a
 * caller that another member's resource exists.
 *
 * NOTE: DELETE is a write but is not currently on the middleware's
 * public-POST-API whitelist (which only matches POST). It is auth-gated
 * here, and the session cookie (SameSite=Lax) + Origin check elsewhere
 * cover CSRF. If we ever loosen the CSRF posture, the middleware list
 * should be extended to include DELETE /api/ai/chat/conversations.
 */

const MAX_MESSAGES_PER_CONVERSATION = 500;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  // ─── 1. Auth gate ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const email = session.user.email;

  const { id: conversationId } = await context.params;

  // ─── 2. Load conversation + messages ───────────────────────────────────
  try {
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        email: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: MAX_MESSAGES_PER_CONVERSATION,
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation || conversation.email !== email) {
      // 404 — never confirm another member's resource exists.
      return NextResponse.json(
        { error: 'Conversation not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          createdAt:
            conversation.createdAt instanceof Date
              ? conversation.createdAt.toISOString()
              : String(conversation.createdAt),
          updatedAt:
            conversation.updatedAt instanceof Date
              ? conversation.updatedAt.toISOString()
              : String(conversation.updatedAt),
          messages: conversation.messages.map((m) => ({
            id: m.id,
            role:
              m.role === 'user' || m.role === 'assistant'
                ? (m.role as 'user' | 'assistant')
                : 'assistant', // defensive
            content: m.content,
            createdAt:
              m.createdAt instanceof Date
                ? m.createdAt.toISOString()
                : String(m.createdAt),
          })),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[ai/chat/conversations/[id]] GET failed:', err);
    return NextResponse.json(
      { error: 'Could not load conversation.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  // ─── 1. Auth gate ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const email = session.user.email;

  const { id: conversationId } = await context.params;

  // ─── 2. Ownership check, then delete ───────────────────────────────────
  try {
    const existing = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, email: true },
    });

    if (!existing || existing.email !== email) {
      return NextResponse.json(
        { error: 'Conversation not found.' },
        { status: 404 }
      );
    }

    // Cascade on ChatMessage deletes the messages atomically.
    await db.chatConversation.delete({ where: { id: conversationId } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[ai/chat/conversations/[id]] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Could not delete conversation.' },
      { status: 500 }
    );
  }
}
