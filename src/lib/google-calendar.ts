/**
 * Google Calendar integration for AstroKalki bookings
 * 
 * Users can optionally provide their Google Calendar credentials to auto-add bookings.
 * This uses the OAuth 2.0 authorization code flow to get calendar access.
 * 
 * Uses the Google Calendar API v3 (free tier):
 * - No cost for basic calendar operations
 * - Supports recurring events, color coding, descriptions
 * - Can send notifications to user's calendar
 */

import { google } from 'googleapis';

const calendar = google.calendar('v3');

interface CreateEventParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  userEmail: string;
  colorId?: string; // 1-11 for different colors
  attendeeEmail?: string;
}

/**
 * Create an event in user's Google Calendar
 * Requires valid OAuth 2.0 access token for the calendar.events scope
 */
export async function createCalendarEvent(
  accessToken: string,
  params: CreateEventParams
) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    auth.setCredentials({ access_token: accessToken });

    const event = {
      summary: params.title,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      colorId: params.colorId || '7', // default: graphite
      organizer: {
        email: 'astrokalki@astrokalki.com',
        displayName: 'AstroKalki',
      },
      attendees: params.attendeeEmail
        ? [{ email: params.attendeeEmail, responseStatus: 'needsAction' }]
        : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 mins before
        ],
      },
      conferenceData: {
        // Optionally add Google Meet link
        createRequest: {
          requestId: `astrokalki-${Date.now()}`,
          conferenceSolutionKey: { key: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      auth,
      calendarId: 'primary',
      requestBody: event as any,
      conferenceDataVersion: 1,
    });

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
    };
  } catch (error) {
    console.error('[Google Calendar] Failed to create event:', {
      error: error instanceof Error ? error.message : String(error),
      userEmail: params.userEmail,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Google Calendar OAuth authorization URL for initial user consent
 */
export function getAuthorizationUrl(redirectUri: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent screen for offline token
  });

  return authUrl;
}

/**
 * Exchange authorization code for access/refresh tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    return {
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };
  } catch (error) {
    console.error('[Google Calendar] Token exchange failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
    };
  }
}

/**
 * Refresh an expired access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      success: true,
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date,
    };
  } catch (error) {
    console.error('[Google Calendar] Token refresh failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}
