import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/community/circles/[circleId]/posts
 * Fetch posts for a circle with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const posts = await db.circlePost.findMany({
      where: { circleId: resolvedParams.circleId },
      include: {
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 3, // Show 3 recent replies
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await db.circlePost.count({
      where: { circleId: resolvedParams.circleId },
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[circle/posts] Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/circles/[circleId]/posts
 * Create a new post in the circle
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { authorEmail, title, content } = body;

    if (!authorEmail || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is a member of the circle
    const member = await db.circleMember.findUnique({
      where: {
        circleId_email: {
          circleId: resolvedParams.circleId,
          email: authorEmail,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this circle' },
        { status: 403 }
      );
    }

    const post = await db.circlePost.create({
      data: {
        circleId: resolvedParams.circleId,
        authorEmail,
        title,
        content,
      },
      include: {
        replies: true,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('[circle/posts] Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
