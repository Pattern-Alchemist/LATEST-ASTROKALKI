import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { generateLiveKitToken, generateRoomName } from '@/lib/livekit';
import { generateLiveKitTokenSchema, validateRequest } from '@/lib/validators';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/livekit/generate-token
 *
 * Auth-gated endpoint to generate a JWT token for joining a LiveKit room.
 * Used by both users and admins to join a call.
 *
 * Request body:
 *   {
 *     bookingId: string,
 *     userId?: string (auto-detected if not provided),
 *     userRole?: 'participant' | 'presenter' | 'host' | 'admin' (default 'participant')
 *   }
 *
 * Response:
 *   {
 *     token: string (JWT),
 *     roomName: string,
 *     userName: string,
 *     expiresIn: number (seconds),
 *     requestId: string
 *   }
 */
export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const logger = new Logger(requestId);

  logger.info('generate_token_request_received');

  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = validateRequest(generateLiveKitTokenSchema, body);
    if (!validationResult.success) {
      logger.warn('invalid_token_params', {
        errors: validationResult.errors.format(),
      });
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validationResult.errors.format(),
        },
        { status: 400 }
      );
    }

    const { bookingId, userId, userRole } = validationResult.data;

    logger.info('generating_token_for_booking', {
      bookingId,
      userRole,
    });

    // Fetch booking and associated room
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        liveKitRoom: true,
      },
    });

    if (!booking) {
      logger.warn('booking_not_found', { bookingId });
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get or create room
    let room = booking.liveKitRoom;
    if (!room) {
      logger.info('creating_room_for_token_generation', { bookingId });

      // Auto-create room if it doesn't exist
      const roomName = generateRoomName(bookingId);
      room = await prisma.liveKitRoom.create({
        data: {
          bookingId,
          roomName,
        },
      });
    }

    // Determine user identity and role
    const userName = userId || booking.email || `user_${bookingId}`;
    const role: 'participant' | 'presenter' | 'host' | 'admin' =
      userRole || 'participant';

    logger.info('generating_token', {
      roomName: room.roomName,
      userName,
      userRole: role,
    });

    // Generate JWT token
    const token = generateLiveKitToken(room.roomName, userName, role, requestId);

    logger.info('token_generated_successfully', {
      roomName: room.roomName,
      userName,
    });

    return NextResponse.json(
      {
        token,
        roomName: room.roomName,
        userName,
        userRole: role,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
        requestId,
      },
      {
        status: 200,
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error) {
    logger.error('generate_token_failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate token',
        requestId,
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
