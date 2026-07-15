import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Google Analytics 4 event tracking API
 * POST /api/analytics/events
 * 
 * Tracks user interactions for funnel analysis and ROI measurement
 */

export async function POST(request: NextRequest) {
  try {
    const { eventName, eventData, sessionId, userId } = await request.json();

    if (!eventName || !sessionId) {
      return NextResponse.json(
        { error: 'Event name and session ID required' },
        { status: 400 }
      );
    }

    // Validate event against allowed events
    const allowedEvents = [
      'lead_magnet_view',
      'lead_magnet_download',
      'email_course_signup',
      'quiz_start',
      'quiz_complete',
      'birth_chart_generated',
      'pattern_analyzer_used',
      'compatibility_calculator_used',
      'insight_article_view',
      'article_read_complete',
      'audio_narration_played',
      'session_booking_page_view',
      'session_booked',
      'session_completed',
      'account_created',
      'profile_completed',
      'journal_entry_created',
      'progress_viewed',
      'voice_input_used',
      'chart_image_upload',
    ];

    if (!allowedEvents.includes(eventName)) {
      console.warn(`Unknown event: ${eventName}`);
    }

    // Store event in database
    await db.analyticsEvent.create({
      data: {
        event: eventName,
        page: eventData?.page || request.headers.get('referer') || '/',
        sessionId,
        data: JSON.stringify({
          ...eventData,
          userId,
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent'),
        }),
      },
    });

    // Send to Google Analytics 4 (batch in production)
    if (process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET) {
      sendToGA4(eventName, eventData, sessionId);
    }

    return NextResponse.json(
      { success: true, message: 'Event tracked' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

/**
 * Send event to Google Analytics 4
 */
async function sendToGA4(
  eventName: string,
  eventData: Record<string, any> = {},
  sessionId: string
) {
  try {
    const payload = {
      client_id: sessionId,
      events: [
        {
          name: eventName,
          params: {
            ...eventData,
            session_id: sessionId,
            timestamp_micros: (Date.now() * 1000).toString(),
          },
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      console.error('[GA4] Send failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[GA4] Error:', error);
  }
}

/**
 * GET /api/analytics/events - Get analytics summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Get events from database
    const events = await db.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate funnel metrics
    const eventCounts: Record<string, number> = {};
    events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });

    // Funnel stages
    const funnel = {
      leads: eventCounts['lead_magnet_view'] || 0,
      leadsCaptured: eventCounts['lead_magnet_download'] || 0,
      emailCourseSignups: eventCounts['email_course_signup'] || 0,
      toolsUsed: (eventCounts['birth_chart_generated'] || 0) + (eventCounts['pattern_analyzer_used'] || 0),
      bookingPageViews: eventCounts['session_booking_page_view'] || 0,
      bookingsCompleted: eventCounts['session_completed'] || 0,
    };

    // Calculate conversion rates
    const conversionRates = {
      leadCapture: funnel.leads > 0 ? (funnel.leadsCaptured / funnel.leads * 100).toFixed(1) : 0,
      emailCourse: funnel.leadsCaptured > 0 ? (funnel.emailCourseSignups / funnel.leadsCaptured * 100).toFixed(1) : 0,
      booking: funnel.bookingPageViews > 0 ? (funnel.bookingsCompleted / funnel.bookingPageViews * 100).toFixed(1) : 0,
    };

    return NextResponse.json(
      {
        period,
        startDate,
        endDate,
        totalEvents: events.length,
        eventBreakdown: eventCounts,
        funnel,
        conversionRates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
