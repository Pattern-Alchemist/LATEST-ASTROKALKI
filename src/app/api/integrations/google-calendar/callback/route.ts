import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exchangeCodeForTokens, refreshAccessToken } from '@/lib/google-calendar';

/**
 * Google Calendar OAuth 2.0 callback handler
 * User authorizes AstroKalki to add events to their calendar
 * This endpoint receives the auth code and exchanges it for tokens
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // for CSRF protection
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?calendar-denied=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXTAUTH_URL || 'https://astrokalki.com'}/api/integrations/google-calendar/callback`;
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success) {
      const errorMsg = (tokenResult as any)?.error || 'Unknown error';
      return NextResponse.redirect(
        new URL(`/dashboard?calendar-error=${encodeURIComponent(errorMsg)}`, request.url)
      );
    }

    // Get user email from state param (sent during auth URL generation)
    // In production, validate this is the current user
    const userEmail = state || 'unknown@example.com';

    // Save credentials to database
    await db.googleCalendarCredentials.upsert({
      where: { email: userEmail },
      update: {
        accessToken: tokenResult.accessToken!,
        refreshToken: tokenResult.refreshToken,
        expiryDate: tokenResult.expiryDate ? new Date(tokenResult.expiryDate) : null,
        lastUsedAt: new Date(),
      },
      create: {
        email: userEmail,
        accessToken: tokenResult.accessToken!,
        refreshToken: tokenResult.refreshToken,
        expiryDate: tokenResult.expiryDate ? new Date(tokenResult.expiryDate) : null,
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard?calendar-connected=true', request.url)
    );
  } catch (error) {
    console.error('[Google Calendar Callback] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Google Calendar' },
      { status: 500 }
    );
  }
}
