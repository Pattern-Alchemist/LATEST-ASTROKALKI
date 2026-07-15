import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/community/circles
 * Fetch all pattern circles with member counts
 */
export async function GET() {
  try {
    const circles = await db.patternCircle.findMany({
      include: {
        _count: {
          select: { members: true, posts: true },
        },
      },
      orderBy: { memberCount: 'desc' },
    });

    return NextResponse.json({ circles });
  } catch (error) {
    console.error('[community/circles] Error fetching circles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch circles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/circles
 * Create a new pattern circle (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, pattern, primaryColor } = body;

    if (!name || !slug || !pattern) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const circle = await db.patternCircle.create({
      data: {
        name,
        slug,
        description: description || '',
        pattern,
        primaryColor: primaryColor || '#c9a96e',
      },
    });

    return NextResponse.json(circle, { status: 201 });
  } catch (error) {
    console.error('[community/circles] Error creating circle:', error);
    return NextResponse.json(
      { error: 'Failed to create circle' },
      { status: 500 }
    );
  }
}
