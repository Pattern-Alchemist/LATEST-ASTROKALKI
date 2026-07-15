import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/ai/chat/conversations
 *
 * Auth-gated. Returns the signed-in member's conversation list — id, title,
 * updatedAt, and a preview of the last message — for the sidebar of the
 * /ask-astrokalki page (and the embedded chat in /account).
 *
 * Response shape:
 *   {
 *     conversations: Array<{
 *       id: string,
 *       title: string,
 *       updatedAt: string,  // ISO
 *       lastMessage: string | null,  // truncated to 120 chars
 *       lastRole: 'user' | 'assistant' | null,
 *       messageCount: number,
 *     }>
 *   }
 *
 * Ordered by updatedAt DESC (most recent first). Capped at 50 conversations
 * per member — plenty for a personal chat history, bounded enough to keep
 * the sidebar snappy.
 *
 * NOTE: this is a GET — it is NOT on the middleware's public-POST-API
 * whitelist, so the bot UA block + CSRF check do not apply. Auth is the
 * only gate. That is intentional — read-only list endpoints don't need
 * the same CSRF defence that writes do.
 */

const MAX_CONVERSATIONS = 50;
const PREVIEW_LENGTH = 120;

export async function GET() {
  // ─── 1. Auth gate ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Sign in required.' },
      { status: 401 }
    );
  }
  const email = session.user.email;

  // ─── 2. Fetch the member's conversations, newest first ─────────────────
  try {
    const conversations = await db.chatConversation.findMany({
      where: { email },
      orderBy: { updatedAt: 'desc' },
      take: MAX_CONVERSATIONS,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            role: true,
            content: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });

    const shaped = conversations.map((c) => {
      const last = c.messages[0];
      const preview =
        last?.content?.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LENGTH) ??
        null;
      return {
        id: c.id,
        title: c.title,
        updatedAt:
          c.updatedAt instanceof Date
            ? c.updatedAt.toISOString()
            : String(c.updatedAt),
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : String(c.createdAt),
        lastMessage: preview,
        lastRole:
          last?.role === 'user' || last?.role === 'assistant'
            ? (last.role as 'user' | 'assistant')
            : null,
        messageCount: c._count.messages,
      };
    });

    return NextResponse.json({ conversations: shaped }, { status: 200 });
  } catch (err) {
    console.error('[ai/chat/conversations] list failed:', err);
    return NextResponse.json(
      { error: 'Could not load conversations.' },
      { status: 500 }
    );
  }
}
