import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: Record<string, unknown> = { published: true };
    if (category) {
      where.category = category;
    }

    const insights = await db.insight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        excerpt: true,
        readTime: true,
        published: true,
        featuredImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
