import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/forum/questions/[questionId]/answers
 * Fetch answers for a question, sorted by solution status and upvotes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const answers = await db.forumAnswer.findMany({
      where: {
        questionId: resolvedParams.questionId,
        isModerated: true,
      },
      orderBy: [
        { isMarkedSolution: 'desc' },
        { upvotes: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Increment view count
    await db.forumQuestion.update({
      where: { id: resolvedParams.questionId },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ answers });
  } catch (error) {
    console.error('[forum/answers] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch answers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum/questions/[questionId]/answers
 * Create a new answer to a question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { authorEmail, content } = body;

    if (!authorEmail || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify question exists
    const question = await db.forumQuestion.findUnique({
      where: { id: resolvedParams.questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const answer = await db.forumAnswer.create({
      data: {
        questionId: resolvedParams.questionId,
        authorEmail,
        content,
      },
    });

    return NextResponse.json(answer, { status: 201 });
  } catch (error) {
    console.error('[forum/answers] Error creating:', error);
    return NextResponse.json(
      { error: 'Failed to create answer' },
      { status: 500 }
    );
  }
}
