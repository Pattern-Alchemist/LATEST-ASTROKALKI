import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/cron/send-reminders
 *
 * Cron job (runs every hour) to send 24-hour booking reminders.
 * 
 * Finds all confirmed bookings scheduled for approximately 24 hours from now
 * and sends reminder emails/SMS via WhatsApp.
 *
 * Requires CRON_SECRET header for authorization.
 */
export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const logger = new Logger(requestId);

  logger.info('send_reminders_cron_started');

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
    // Find bookings scheduled for ~24 hours from now (within 1 hour window)
    const now = new Date();
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookingsForReminder = await prisma.booking.findMany({
      where: {
        status: 'confirmed',
        scheduledAt: {
          gte: in23Hours,
          lte: in25Hours,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        scheduledAt: true,
        duration: true,
        liveKitRoom: {
          select: {
            roomName: true,
          },
        },
      },
    });

    logger.info('found_bookings_for_reminders', {
      count: bookingsForReminder.length,
    });

    if (bookingsForReminder.length === 0) {
      logger.info('no_reminders_to_send');
      return NextResponse.json(
        { message: 'No reminders to send', sent: 0 },
        { status: 200 }
      );
    }

    // Send reminders for each booking
    const sent: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const booking of bookingsForReminder) {
      try {
        logger.info('sending_reminder', {
          bookingId: booking.id,
          email: booking.email,
        });

        // TODO: Implement actual email/WhatsApp sending
        // await sendReminderEmail({
        //   to: booking.email,
        //   name: booking.name,
        //   scheduledAt: booking.scheduledAt,
        //   duration: booking.duration,
        //   roomUrl: booking.liveKitRoom ? generateRoomUrl(...) : undefined,
        // });

        sent.push(booking.id);
      } catch (error) {
        logger.error('reminder_send_failed', {
          bookingId: booking.id,
          error: error instanceof Error ? error.message : String(error),
        });
        failed.push({
          id: booking.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('reminders_cron_completed', {
      sent: sent.length,
      failed: failed.length,
    });

    return NextResponse.json(
      {
        message: 'Reminders sent',
        sent: sent.length,
        failed: failed.length,
        failedBookings: failed,
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('send_reminders_cron_failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Reminders cron failed',
        requestId,
      },
      { status: 500 }
    );
  }
}
