import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const insight = await db.insight.findUnique({
      where: { slug },
    });

    if (!insight || !insight.published) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('Insight fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insight' },
      { status: 500 }
    );
  }
}
