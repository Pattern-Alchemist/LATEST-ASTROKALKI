import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/config';
import {
  isHoneypotTriggered,
  honeypotSuccessResponse,
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
} from '@/lib/security';

/**
 * API endpoint for lead magnet delivery and email capture
 * POST /api/lead-magnets
 * 
 * Captures email for lead magnets (Pattern Recognition Guide, Quizzes, etc.)
 * Enrolls in drip campaign and sends magnet via email
 *
 * Security:
 *   - Rate-limited: 5 requests per IP per 10 min (same as newsletter)
 *   - Honeypot field: silently dropped if filled (bot protection)
 *   - Body size cap: 4 KB (generous for a form, impossible for exfilt)
 */

export async function POST(request: NextRequest) {
  // Rate limit — 5 requests per IP per 10 min
  const ip = getClientIp(request);
  const rl = checkRateLimit(`lm:${ip}`, RATE_LIMITS.newsletter);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  // Parse body with size cap (4 KB)
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: 'Body too large' }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot — silently succeed for bots
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      honeypotSuccessResponse('lead-magnet'),
      { status: 200 }
    );
  }

  try {
    const body = raw as Record<string, unknown>;
    const email = body.email as string | undefined;
    const name = body.name as string | undefined;
    const leadMagnetType = body.leadMagnetType as string | undefined;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Validate lead magnet type
    const validTypes = ['pattern-guide', 'shadow-quiz', 'karmic-loop-quiz', 'checklist'];
    if (!validTypes.includes(leadMagnetType ?? '')) {
      return NextResponse.json(
        { error: 'Invalid lead magnet type' },
        { status: 400 }
      );
    }

    // Check if email already exists
    let newsletter = await db.newsletter.findUnique({ where: { email } });
    
    if (!newsletter) {
      // Create new newsletter subscriber
      newsletter = await db.newsletter.create({
        data: {
          email,
          source: leadMagnetType,
          dripStage: 0,
          prefDrip: true,
          prefSessions: true,
          prefBlog: true,
        },
      });
    }

    // Send lead magnet via email
    const leadMagnetData: Record<string, { title: string; subject: string; url: string }> = {
      'pattern-guide': {
        title: 'The Complete Pattern Recognition Guide',
        subject: 'Your AstroKalki Pattern Recognition Guide',
        url: 'https://astrokalki.com/downloads/pattern-guide.pdf',
      },
      'shadow-quiz': {
        title: 'Which Shadow Pattern Quiz',
        subject: 'Your Shadow Pattern Quiz Results',
        url: 'https://astrokalki.com/downloads/shadow-quiz.pdf',
      },
      'karmic-loop-quiz': {
        title: 'Karmic Loop Identifier Quiz',
        subject: 'Your Karmic Loop Results',
        url: 'https://astrokalki.com/downloads/karmic-loop-quiz.pdf',
      },
      'checklist': {
        title: 'Pattern Recognition Checklist',
        subject: 'Your Pattern Recognition Checklist',
        url: 'https://astrokalki.com/downloads/checklist.pdf',
      },
    };

    const magnet = leadMagnetData[leadMagnetType!];

    // Send email with lead magnet
    await sendEmail({
      to: email,
      subject: magnet.subject,
      template: 'lead-magnet-delivery',
      data: {
        name: name || email.split('@')[0],
        title: magnet.title,
        downloadUrl: magnet.url,
      },
    });

    // Track event
    await db.analyticsEvent.create({
      data: {
        event: 'lead_magnet_download',
        page: '/lead-magnets',
        sessionId: request.headers.get('x-session-id') || 'unknown',
        data: JSON.stringify({
          email,
          type: leadMagnetType,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Lead magnet sent to your email',
        downloadUrl: magnet.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Lead Magnet API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process lead magnet request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lead-magnets - List available lead magnets
 */
export async function GET() {
  const leadMagnets = [
    {
      id: 'pattern-guide',
      title: 'The Complete Pattern Recognition Guide',
      description: 'Understand the 7 karmic loops running your relationships and choices',
      pages: 24,
      format: 'PDF',
      downloadUrl: '/api/download/pattern-guide.pdf',
    },
    {
      id: 'shadow-quiz',
      title: 'Which Shadow Pattern Is Running Your Relationships?',
      description: 'Identify which disowned part of yourself you keep meeting in partners',
      questions: 15,
      time: '2 minutes',
      downloadUrl: '/api/download/shadow-quiz.pdf',
    },
    {
      id: 'karmic-loop-quiz',
      title: 'What Karmic Loop Are You Repeating?',
      description: 'Discover the inherited pattern or karma you&apos;re unconsciously cycling through',
      questions: 18,
      time: '3 minutes',
      downloadUrl: '/api/download/karmic-loop-quiz.pdf',
    },
    {
      id: 'checklist',
      title: 'Pattern Recognition Checklist',
      description: '20 signs that reveal the unconscious pattern beneath your repeating situations',
      items: 20,
      downloadUrl: '/api/download/checklist.pdf',
    },
  ];

  return NextResponse.json(leadMagnets, { status: 200 });
}
