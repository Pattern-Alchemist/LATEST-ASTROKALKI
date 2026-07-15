import { processPendingEmails } from '@/lib/email/scheduler';

/**
 * Cron Job: Process Pending Emails
 * 
 * Called hourly by Vercel cron (see vercel.json)
 * Processes email queue and sends scheduled emails
 * 
 * Requires CRON_SECRET to be set in environment
 */

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await processPendingEmails();

    return Response.json({
      success: true,
      message: 'Email scheduler processed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Email Scheduler] Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
