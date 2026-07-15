import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_EVENTS = [
  'section_view',
  'button_click',
  'booking_start',
  'booking_step',
  'booking_complete',
  'micro_reading',
  'newsletter_signup',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { event, data, page, sessionId } = body;

    if (!event || !sessionId) {
      return NextResponse.json(
        { error: 'Event and sessionId are required' },
        { status: 400 }
      );
    }

    if (!VALID_EVENTS.includes(event)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${VALID_EVENTS.join(', ')}` },
        { status: 400 }
      );
    }

    await db.analyticsEvent.create({
      data: {
        event,
        data: JSON.stringify(data || {}),
        page: page || '/',
        sessionId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Return success anyway — analytics should never break the user experience
    return NextResponse.json({ success: true });
  }
}
