import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/birth-chart/[id] — fetch a saved chart by its ID.
 *
 * Public: anyone with a chart ID can fetch it (the ID is a CUID, so
 * it's effectively unguessable). The chart is returned as the parsed
 * chartData JSON + the SVG string.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== 'string' || id.length > 64) {
    return NextResponse.json(
      { error: 'Invalid chart ID' },
      { status: 400 }
    );
  }

  let row;
  try {
    row = await db.birthChart.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        lat: true,
        lng: true,
        tzOffset: true,
        chartData: true,
        svgChart: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error('[birth-chart/[id]] DB read failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch chart' },
      { status: 500 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: 'Chart not found' },
      { status: 404 }
    );
  }

  // Parse the stored chartData JSON for the client.
  let chartData: unknown = null;
  try {
    chartData = JSON.parse(row.chartData);
  } catch {
    // Malformed JSON — return null and let the client handle it.
  }

  return NextResponse.json({
    id: row.id,
    email: row.email,
    name: row.name,
    birthDate: row.birthDate,
    birthTime: row.birthTime,
    birthPlace: row.birthPlace,
    lat: row.lat,
    lng: row.lng,
    tzOffset: row.tzOffset,
    chartData,
    svgChart: row.svgChart,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  });
}
