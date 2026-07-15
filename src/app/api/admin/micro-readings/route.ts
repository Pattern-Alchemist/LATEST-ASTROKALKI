import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const [readings, total] = await Promise.all([
      db.microReading.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.microReading.count(),
    ]);

    return NextResponse.json({
      readings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin micro-readings list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch micro-readings' },
      { status: 500 }
    );
  }
}
