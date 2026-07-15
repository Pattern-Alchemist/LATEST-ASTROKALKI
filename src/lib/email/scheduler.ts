/**
 * Email Scheduler
 * 
 * Handles drip campaigns, scheduled emails, and automations
 * Integrates with cron jobs (vercel.json)
 */

import { emailTemplates } from './templates';
import nodemailer from 'nodemailer';

export interface ScheduledEmail {
  id: string;
  email: string;
  type: 'lead_magnet' | 'course_day_1' | 'course_day_2' | 'course_day_3' | 'course_day_4' | 'course_day_5' | 'session_confirm' | 'session_recap' | 'newsletter';
  scheduledFor: Date;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  retries: number;
}

/**
 * Email Drip Campaign (5-day course)
 * 
 * Day 1: Welcome + pattern intro
 * Day 2: Shadow patterns
 * Day 3: Trauma bonds
 * Day 4: Self-sabotage
 * Day 5: The way out
 */
export const dripCampaign = {
  days: 5,

  getTemplateForDay: (day: number, userName: string) => {
    const templates: Record<number, any> = {
      1: emailTemplates.emailCourseDay1(userName),
      2: {
        subject: 'Day 2: Your Shadow — The Part You Deny',
        preview: 'The trait you hate in others is the trait you hate in yourself',
      },
      3: {
        subject: 'Day 3: Trauma Bonds — Why You Return',
        preview: 'The person you cannot leave is repeating the person you could not protect',
      },
      4: {
        subject: 'Day 4: Self-Sabotage — The Familiar Pain',
        preview: 'You are not broken. You are predictable.',
      },
      5: {
        subject: 'Day 5: The Pattern Ends Here',
        preview: 'How to become the one who knows and chooses differently',
      },
    };

    return templates[day] || null;
  },

  /**
   * Calculate next email date for course
   */
  calculateNextEmailDate: (dayEnrolled: number): Date => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + dayEnrolled);
    nextDate.setHours(9, 0, 0, 0); // 9 AM user's timezone
    return nextDate;
  },
};

/**
 * Email Queue (for database storage)
 * 
 * In production, this would be stored in a database
 * and processed by cron jobs
 */
export const emailQueue = {
  async addToQueue(email: ScheduledEmail): Promise<void> {
    // In production, save to database:
    // await db.emailQueue.create({ data: email })
    console.log(`[Email Queue] Added: ${email.email} - ${email.type}`);
  },

  async getNextBatch(limit: number = 100): Promise<ScheduledEmail[]> {
    // In production:
    // return await db.emailQueue.findMany({
    //   where: { status: 'pending', scheduledFor: { lte: new Date() } },
    //   take: limit,
    // })
    return [];
  },

  async markAsSent(emailId: string): Promise<void> {
    // In production:
    // await db.emailQueue.update({
    //   where: { id: emailId },
    //   data: { status: 'sent' },
    // })
    console.log(`[Email Queue] Sent: ${emailId}`);
  },

  async incrementRetry(emailId: string): Promise<void> {
    // In production:
    // await db.emailQueue.update({
    //   where: { id: emailId },
    //   data: { retries: { increment: 1 } },
    // })
    console.log(`[Email Queue] Retry: ${emailId}`);
  },
};

/**
 * Cron Job Handler
 * Called by Vercel cron (see vercel.json)
 * 
 * Should be called once per hour
 */
export async function processPendingEmails() {
  console.log('[Email Scheduler] Starting email processing...');

  try {
    const pendingEmails = await emailQueue.getNextBatch(100);

    if (pendingEmails.length === 0) {
      console.log('[Email Scheduler] No pending emails');
      return;
    }

    console.log(`[Email Scheduler] Processing ${pendingEmails.length} emails...`);

    for (const emailItem of pendingEmails) {
      try {
        // Send email based on type
        const result = await sendScheduledEmail(emailItem);

        if (result.success) {
          await emailQueue.markAsSent(emailItem.id);
          console.log(`[Email Scheduler] Sent: ${emailItem.email}`);
        } else {
          if (emailItem.retries < 3) {
            await emailQueue.incrementRetry(emailItem.id);
            console.log(`[Email Scheduler] Retry scheduled: ${emailItem.email}`);
          }
        }
      } catch (error) {
        console.error(`[Email Scheduler] Error sending to ${emailItem.email}:`, error);
        if (emailItem.retries < 3) {
          await emailQueue.incrementRetry(emailItem.id);
        }
      }
    }

    console.log('[Email Scheduler] Processing complete');
  } catch (error) {
    console.error('[Email Scheduler] Fatal error:', error);
  }
}

/**
 * Send a scheduled email
 */
async function sendScheduledEmail(
  emailItem: ScheduledEmail
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    let template;

    switch (emailItem.type) {
      case 'lead_magnet':
        template = emailTemplates.leadMagnetConfirmation(
          emailItem.data?.name || 'there',
          emailItem.data?.magnetTitle || 'Resource',
          emailItem.data?.downloadLink || ''
        );
        break;

      case 'course_day_1':
        template = emailTemplates.emailCourseDay1(emailItem.data?.name || 'there');
        break;

      case 'session_confirm':
        template = emailTemplates.sessionConfirmation(
          emailItem.data?.name || 'there',
          emailItem.data?.sessionType || 'Session',
          emailItem.data?.datetime || 'TBD',
          emailItem.data?.meetLink || ''
        );
        break;

      case 'session_recap':
        template = emailTemplates.postSessionRecap(
          emailItem.data?.name || 'there',
          emailItem.data?.recap || 'Session completed'
        );
        break;

      default:
        return { success: false, error: 'Unknown email type' };
    }

    if (!template) {
      return { success: false, error: 'Failed to generate template' };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'hello@astrokalki.com',
      to: emailItem.email,
      subject: template.subject,
      html: template.html,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Enroll user in drip campaign
 */
export async function enrollInDripCampaign(email: string, name: string): Promise<void> {
  // Schedule all 5 emails
  for (let day = 1; day <= dripCampaign.days; day++) {
    const scheduledDate = dripCampaign.calculateNextEmailDate(day);

    await emailQueue.addToQueue({
      id: `${email}-day-${day}-${Date.now()}`,
      email,
      type: `course_day_${day}` as any,
      scheduledFor: scheduledDate,
      data: { name, day },
      status: 'pending',
      retries: 0,
    });
  }

  console.log(`[Email Scheduler] Enrolled ${email} in 5-day drip campaign`);
}
