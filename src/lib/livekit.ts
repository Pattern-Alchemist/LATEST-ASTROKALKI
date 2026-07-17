import { AccessToken } from 'livekit-server-sdk';
import { Logger } from './logger';

const logger = new Logger();

/**
 * Generate a LiveKit JWT token for a user to join a room.
 *
 * Tokens are typically valid for 24 hours by default.
 * Each token is user-specific and can have granular permissions.
 */
export function generateLiveKitToken(
  roomName: string,
  userName: string,
  userRole: 'participant' | 'presenter' | 'host' | 'admin' = 'participant',
  requestId?: string
): string {
  const actualRequestId = requestId || logger.getRequestId();

  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    logger.error('livekit_credentials_missing', {
      requestId: actualRequestId,
    });
    throw new Error('LiveKit credentials not configured');
  }

  try {
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    // Set token identity
    token.identity = userName;

    // Grant permissions based on role
    const canPublishAudio =
      userRole === 'host' ||
      userRole === 'presenter' ||
      userRole === 'admin' ||
      userRole === 'participant';
    const canPublishVideo =
      userRole === 'host' ||
      userRole === 'presenter' ||
      userRole === 'admin' ||
      userRole === 'participant';
    const canPublishData = true; // All roles can send chat/data
    const canRecordSelf = userRole === 'host' || userRole === 'admin';

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: canPublishAudio || canPublishVideo,
      canPublishAudio,
      canPublishVideo,
      canPublishData,
      canRecordSelf,
      canSubscribe: true,
      // Metadata for room state
      metadata: JSON.stringify({
        role: userRole,
        joinedAt: new Date().toISOString(),
      }),
    });

    // Token expires in 24 hours by default
    token.ttl = 24 * 60 * 60;

    const jwt = token.toJwt();

    logger.info('livekit_token_generated', {
      roomName,
      userName,
      userRole,
      requestId: actualRequestId,
    });

    return jwt;
  } catch (error) {
    logger.error('livekit_token_generation_failed', {
      error: error instanceof Error ? error.message : String(error),
      roomName,
      userName,
      requestId: actualRequestId,
    });
    throw error;
  }
}

/**
 * Generate a LiveKit room name from a booking ID.
 * Room names must be unique and contain only alphanumeric, dash, and underscore.
 */
export function generateRoomName(bookingId: string): string {
  // Replace invalid chars with underscore
  const sanitized = bookingId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `room_${sanitized}`;
}

/**
 * Generate the full LiveKit room URL for joining.
 *
 * Requires LIVEKIT_URL environment variable (e.g., https://livekit.example.com)
 */
export function generateRoomUrl(
  roomName: string,
  token: string,
  requestId?: string
): string {
  const actualRequestId = requestId || logger.getRequestId();

  if (!process.env.LIVEKIT_URL) {
    logger.error('livekit_url_missing', {
      requestId: actualRequestId,
    });
    throw new Error('LiveKit URL not configured');
  }

  const baseUrl = process.env.LIVEKIT_URL;
  const params = new URLSearchParams({
    url: baseUrl,
    token,
    room: roomName,
  });

  return `${baseUrl}/join?${params.toString()}`;
}

/**
 * Validate LiveKit configuration on startup.
 */
export function validateLiveKitConfig(): boolean {
  const required = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.warn('livekit_config_incomplete', {
      missing,
    });
    return false;
  }

  logger.info('livekit_config_valid');
  return true;
}
