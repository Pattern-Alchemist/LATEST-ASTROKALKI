import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/forum/questions
 * Fetch forum questions with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'recent'; // recent, popular, unanswered

    const skip = (page - 1) * limit;

    const where: any = { isModerated: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sort === 'popular') {
      orderBy.upvotes = 'desc';
    } else if (sort === 'unanswered') {
      where.isAnswered = false;
      orderBy.createdAt = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const questions = await db.forumQuestion.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { answers: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    const total = await db.forumQuestion.count({ where });

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[forum/questions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forum/questions
 * Create a new forum question
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, authorEmail, title, content, tags } = body;

    if (!categoryId || !authorEmail || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const question = await db.forumQuestion.create({
      data: {
        categoryId,
        authorEmail,
        title,
        content,
        tags: tags || '',
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('[forum/questions] Error creating:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
