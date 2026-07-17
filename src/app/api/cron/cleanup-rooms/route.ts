import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/cron/cleanup-rooms
 *
 * Cron job (runs hourly) to clean up old LiveKit rooms.
 * Marks rooms as deleted 1 hour after their associated booking ends.
 *
 * Requires CRON_SECRET header for authorization (configured in vercel.json).
 */
export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const logger = new Logger(requestId);

  logger.info('cleanup_rooms_cron_started');

  // Verify cron secret
  const cronSecret = request.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn('unauthorized_cron_request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Find bookings that are completed and their scheduled end time is > 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get all rooms associated with completed bookings that ended > 1 hour ago
    const roomsToDelete = await prisma.liveKitRoom.findMany({
      where: {
        deletedAt: null, // Not already deleted
        booking: {
          status: 'completed',
          scheduledAt: {
            lte: oneHourAgo,
          },
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            scheduledAt: true,
            email: true,
          },
        },
      },
    });

    logger.info('found_rooms_to_delete', {
      count: roomsToDelete.length,
    });

    if (roomsToDelete.length === 0) {
      logger.info('no_rooms_to_cleanup');
      return NextResponse.json(
        { message: 'No rooms to clean up', deleted: 0 },
        { status: 200 }
      );
    }

    // Mark rooms as deleted
    const deleteResult = await prisma.liveKitRoom.updateMany({
      where: {
        id: {
          in: roomsToDelete.map((r) => r.id),
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    logger.info('rooms_deleted', {
      count: deleteResult.count,
      roomIds: roomsToDelete.map((r) => r.id),
    });

    // TODO: Call LiveKit API to actually delete the rooms if using LiveKit Cloud
    // const liveKitClient = new LiveKitClient(...);
    // for (const room of roomsToDelete) {
    //   await liveKitClient.deleteRoom(room.roomName);
    // }

    return NextResponse.json(
      {
        message: 'Cleanup completed',
        deleted: deleteResult.count,
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('cleanup_rooms_cron_failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Cleanup failed',
        requestId,
      },
      { status: 500 }
    );
  }
}
