import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/config';

/**
 * Email Drip Campaign API
 * POST /api/email/drip - Enroll in email course
 * GET /api/email/drip - Process daily drip sends
 * 
 * Handles 5-day Pattern Recognition Email Course
 * Sends one email per day for 5 days
 */

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existing = await db.emailCourseEnrollment.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Already enrolled in email course' },
        { status: 200 }
      );
    }

    // Create enrollment
    const enrollment = await db.emailCourseEnrollment.create({
      data: {
        email,
        stage: 0, // Will send day 1 immediately
      },
    });

    // Also ensure email is in newsletter
    await db.newsletter.upsert({
      where: { email },
      update: { prefDrip: true },
      create: {
        email,
        source: 'email-course',
        prefDrip: true,
        prefSessions: true,
        prefBlog: true,
      },
    });

    // Send welcome email (day 0)
    await sendEmail({
      to: email,
      subject: 'Welcome to the 5-Day Pattern Recognition Email Course',
      template: 'email-course-welcome',
      data: {
        name: name || email.split('@')[0],
        courseTitle: '5-Day Pattern Recognition',
        firstLessonDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    });

    // Track event
    await db.analyticsEvent.create({
      data: {
        event: 'email_course_signup',
        page: '/email-course',
        sessionId: request.headers.get('x-session-id') || 'unknown',
        data: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Enrolled in 5-day email course',
        enrollment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Email Drip API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in email course' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/drip - Cron job to send daily emails
 * Called by Vercel cron: `/api/email/drip?token=...`
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron token
    const token = new URL(request.url).searchParams.get('token');
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let emailsSent = 0;

    // Find enrollments ready for next email
    const enrollments = await db.emailCourseEnrollment.findMany({
      where: {
        stage: { lt: 5 }, // Not yet complete (5-day course)
      },
    });

    const courseDuration = 5;
    const lessonTitles: Record<number, string> = {
      1: 'The Pattern You Keep Living',
      2: 'Your Shadow — The Part You Deny',
      3: 'Trauma Bonds — Why You Return',
      4: 'Self-Sabotage — The Familiar Pain',
      5: 'The Pattern Ends Here',
    };

    for (const enrollment of enrollments) {
      try {
        const day = enrollment.stage + 1;
        const lessonTitle = lessonTitles[day];

        if (!lessonTitle) continue;

        // Send lesson email
        await sendEmail({
          to: enrollment.email,
          subject: `Day ${day}: ${lessonTitle}`,
          template: 'email-course-lesson',
          data: {
            dayNumber: day,
            title: lessonTitle,
            content: '',
            totalDays: courseDuration,
          },
        });

        // Update stage
        await db.emailCourseEnrollment.update({
          where: { id: enrollment.id },
          data: {
            stage: day,
            lastSentAt: new Date(),
            completedAt: day === courseDuration ? new Date() : null,
          },
        });

        emailsSent++;
      } catch (error) {
        console.error(`Failed to send email to ${enrollment.email}:`, error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        emailsSent,
        message: `Sent ${emailsSent} drip campaign emails`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Email Drip Cron] Error:', error);
    return NextResponse.json(
      { error: 'Drip campaign job failed' },
      { status: 500 }
    );
  }
}
