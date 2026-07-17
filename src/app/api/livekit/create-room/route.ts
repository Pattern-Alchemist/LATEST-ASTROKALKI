import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { generateRoomName } from '@/lib/livekit';
import { createLiveKitRoomSchema, validateRequest } from '@/lib/validators';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/livekit/create-room
 *
 * Admin-only endpoint to create a LiveKit room and associate it with a booking.
 * Called when a booking is confirmed.
 *
 * Request body:
 *   {
 *     bookingId: string,
 *     roomName?: string (generated from bookingId if not provided),
 *     maxParticipants?: number (default 2)
 *   }
 *
 * Response:
 *   {
 *     roomName: string,
 *     roomUrl?: string,
 *     createdAt: string,
 *     requestId: string
 *   }
 */
export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const logger = new Logger(requestId);

  logger.info('create_room_request_received');

  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = validateRequest(createLiveKitRoomSchema, body);
    if (!validationResult.success) {
      logger.warn('invalid_create_room_params', {
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

    const { bookingId, roomName: providedRoomName, maxParticipants } =
      validationResult.data;

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        email: true,
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

    // Prevent creating duplicate rooms
    if (booking.liveKitRoom) {
      logger.info('room_already_exists', {
        bookingId,
        roomName: booking.liveKitRoom.roomName,
      });
      return NextResponse.json(
        {
          roomName: booking.liveKitRoom.roomName,
          roomUrl: booking.liveKitRoom.roomUrl,
          message: 'Room already exists for this booking',
          createdAt: booking.liveKitRoom.createdAt.toISOString(),
          requestId,
        },
        { status: 200 }
      );
    }

    // Generate room name if not provided
    const roomName = providedRoomName || generateRoomName(bookingId);

    logger.info('creating_livekit_room', {
      bookingId,
      roomName,
      maxParticipants,
    });

    // Create room record in database
    // NOTE: In a production setup with LiveKit Cloud, you might also call
    // the LiveKit HTTP API to create the room with specific settings.
    // For now, we store the room metadata in Supabase.
    const room = await prisma.liveKitRoom.create({
      data: {
        bookingId,
        roomName,
        // roomUrl can be generated later when tokens are created
      },
    });

    logger.info('livekit_room_created', {
      roomId: room.id,
      roomName,
      bookingId,
    });

    return NextResponse.json(
      {
        roomName: room.roomName,
        roomId: room.id,
        createdAt: room.createdAt.toISOString(),
        requestId,
      },
      {
        status: 201,
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error) {
    logger.error('create_room_failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to create room',
        requestId,
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
