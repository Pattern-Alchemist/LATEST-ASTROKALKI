import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createCalendarEvent, refreshAccessToken } from '@/lib/google-calendar';

interface AddEventRequest {
  email: string;
  bookingId: string;
  title: string;
  description: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  duration: number; // minutes
  price: string;
}

/**
 * Add a booking event to user's Google Calendar
 * Called after successful booking creation
 * Non-blocking — failures don't impact booking creation
 */
export async function POST(request: NextRequest) {
  try {
    const body: AddEventRequest = await request.json();
    const {
      email,
      bookingId,
      title,
      description,
      startTime,
      endTime,
      duration,
      price,
    } = body;

    // Get stored Google Calendar credentials
    const credentials = await db.googleCalendarCredentials.findUnique({
      where: { email },
    });

    if (!credentials) {
      // User hasn't connected Google Calendar — this is fine, return success
      return NextResponse.json(
        { message: 'Google Calendar not connected for this user' },
        { status: 200 }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = credentials.accessToken;
    if (
      credentials.expiryDate &&
      credentials.expiryDate < new Date() &&
      credentials.refreshToken
    ) {
      const refreshResult = await refreshAccessToken(credentials.refreshToken);
      if (refreshResult.success) {
        // Update stored token
        await db.googleCalendarCredentials.update({
          where: { email },
          data: {
            accessToken: refreshResult.accessToken!,
            expiryDate: refreshResult.expiryDate
              ? new Date(refreshResult.expiryDate)
              : null,
          },
        });
        accessToken = refreshResult.accessToken!;
      } else {
        // Token refresh failed — log but don't fail the request
        console.warn(
          `[Google Calendar] Token refresh failed for ${email}: ${refreshResult.error}`
        );
        return NextResponse.json(
          { message: 'Token refresh failed, but booking was created' },
          { status: 200 }
        );
      }
    }

    // Create calendar event
    const eventResult = await createCalendarEvent(accessToken, {
      title: `AstroKalki Session — ${title}`,
      description: [
        description,
        '',
        `Duration: ${duration} minutes`,
        `Investment: ${price}`,
        ``,
        `Booking ID: ${bookingId}`,
        ``,
        `Zoom link and session details will be sent via WhatsApp.`,
      ].join('\n'),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      userEmail: email,
      colorId: '7', // Graphite color for AstroKalki
    });

    if (eventResult.success) {
      // Update last used timestamp
      await db.googleCalendarCredentials.update({
        where: { email },
        data: { lastUsedAt: new Date() },
      });

      console.log(`[Google Calendar] Event created for ${email}`, {
        eventId: eventResult.eventId,
        bookingId,
      });

      return NextResponse.json(
        {
          success: true,
          eventId: eventResult.eventId,
          eventLink: eventResult.eventLink,
          meetLink: eventResult.meetLink,
        },
        { status: 200 }
      );
    } else {
      // Calendar API error — log but don't fail booking
      console.error(`[Google Calendar] Failed to create event for ${email}:`, {
        error: eventResult.error,
        bookingId,
      });

      return NextResponse.json(
        { message: 'Event creation failed, but booking was created' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[Google Calendar Add Event]', error);
    // Return success to not block booking flow
    return NextResponse.json(
      { message: 'Unexpected error, but booking was created' },
      { status: 200 }
    );
  }
}
