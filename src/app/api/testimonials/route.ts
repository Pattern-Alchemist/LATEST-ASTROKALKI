import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { notifyAdmin } from '@/lib/email';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  validateInput,
  testimonialInputSchema,
  isHoneypotTriggered,
  honeypotSuccessResponse,
} from '@/lib/security';

/**
 * Testimonials API.
 *
 * GET  — public, returns only status='approved' AND featured=true, ordered
 *        for the editorial testimonials grid on /testimonials. Includes a
 *        `verified` boolean per testimonial indicating whether a
 *        VerifiedReview record links it to a completed booking (drives
 *        the gold "Verified Session" badge).
 *
 * POST — public submission. Creates a Testimonial row with status='pending'
 *        — the admin still moderates every submission. If an optional
 *        `bookingId` is provided, AFTER creating the testimonial we call
 *        the internal /api/reviews/verify endpoint:
 *          - If the booking exists + is status='completed' + the
 *            submitter's email matches the booking's email, a VerifiedReview
 *            record is created linking the testimonial to the booking.
 *            This drives the "Verified Session" badge in the admin
 *            moderation UI (and on /testimonials once approved+featured).
 *            The testimonial is STILL 'pending' — admin moderation is
 *            always required. Verified testimonials just have more trust
 *            signal attached.
 *          - If verification fails for any reason, the testimonial lands
 *            as 'pending' with no VerifiedReview row — same as a regular
 *            anonymous submission.
 *        The response includes a `verified: boolean` flag so the submit
 *        form can render the appropriate success message.
 *
 * Rate-limited, Zod-validated, honeypot-guarded, body-capped (4 KB enforced
 * by middleware + handler).
 */

/**
 * Optional booking-reference field. We validate it separately rather than
 * extending testimonialInputSchema in /lib/security/validation.ts — that
 * file is shared security infrastructure, and the bookingId is only
 * consumed by this route + the auto-verify flow.
 */
const bookingIdSchema = z
  .string()
  .trim()
  .min(1, 'Booking reference cannot be empty if provided')
  .max(100, 'Booking reference too long')
  .optional()
  .or(z.literal('').transform(() => undefined));

export async function GET() {
  try {
    const testimonials = await db.testimonial.findMany({
      where: { status: 'approved', featured: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // ─── Fetch VerifiedReview records for these testimonials ───────
    // There's no Prisma @relation between Testimonial and VerifiedReview
    // (the schema was designed that way to keep Testimonial untouched),
    // so we fetch the verified links separately and map them onto the
    // testimonial objects.
    const ids = testimonials.map((t) => t.id);
    const verifiedReviews = ids.length
      ? await db.verifiedReview.findMany({
          where: { testimonialId: { in: ids } },
          select: { testimonialId: true, bookingId: true, verifiedAt: true },
        })
      : [];
    const verifiedByTestimonial = new Map(
      verifiedReviews.map((v) => [v.testimonialId, v])
    );

    const withVerified = testimonials.map((t) => {
      const v = verifiedByTestimonial.get(t.id) as any;
      return {
        ...t,
        verified: Boolean(v),
        verifiedBookingId: v ? (v?.bookingId ?? null) : null,
        verifiedAt: v ? (v?.verifiedAt ?? null) : null,
      };
    });

    return NextResponse.json({ testimonials: withVerified });
  } catch (error) {
    console.error('Testimonials fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // ─── Rate limit — 3 submissions per IP per hour ──────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`tm:${ip}`, RATE_LIMITS.testimonials);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Too many submissions. Please try again in ${rl.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  // ─── Parse body with 4 KB cap ────────────────────────────────────────
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json(
        { error: 'Submission too large' },
        { status: 413 }
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ─── Honeypot — silently succeed for bots ────────────────────────────
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(honeypotSuccessResponse('testimonials'), {
      status: 201,
    });
  }

  // ─── Validate ────────────────────────────────────────────────────────
  const parsed = validateInput(testimonialInputSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { quote, context, initials, email, pattern } = parsed.data;

  // ─── Optional booking reference for auto-verification ────────────────
  // If provided, AFTER creating the testimonial we call /api/reviews/verify
  // to (potentially) create a VerifiedReview record linking the testimonial
  // to the booking. The testimonial is created with status='pending'
  // REGARDLESS — admin moderation is always required. Verified testimonials
  // just get the "Verified Session" badge in the admin UI to help the
  // moderator trust the submission.
  const rawObj = (raw ?? null) as Record<string, unknown> | null;
  const bookingIdRaw = rawObj?.bookingId;
  const bookingIdParse = bookingIdSchema.safeParse(bookingIdRaw);
  const bookingId = bookingIdParse.success ? bookingIdParse.data : undefined;

  try {
    // ─── Create the testimonial — always status='pending' ────────
    // Per task spec: "The testimonial is created with status 'pending'
    // regardless (admin still moderates)". The bookingId (if provided)
    // is verified AFTER the testimonial exists — the VerifiedReview row
    // is what carries the verification signal, not the testimonial status.
    const testimonial = await db.testimonial.create({
      data: {
        quote,
        context,
        initials,
        email,
        pattern: pattern || null,
        status: 'pending',
        featured: false,
        order: 0,
      },
    });

    // ─── Auto-verify flow (optional, non-blocking) ───────────────
    // If bookingId was provided, call /api/reviews/verify with the new
    // testimonialId + bookingId. The verify endpoint:
    //   - checks the booking exists + is 'completed' + email matches
    //   - creates a VerifiedReview row linking testimonial ↔ booking
    //   - returns { verified: true } or { verified: false, reason }
    // We call it via internal fetch (relative URL — runs in the same
    // Next.js process, no network roundtrip). The verify endpoint is
    // rate-limited + idempotent, so this is safe.
    let verified = false;
    let verifyReason: string | null = null;

    if (bookingId) {
      try {
        // Build the internal URL. Origin doesn't matter for an internal
        // fetch in Next.js — the route handler resolves the path. We
        // use http://localhost:3000 so Next.js routes the fetch through
        // the Next server (rather than treating it as an external call).
        const verifyRes = await fetch(
          'http://localhost:3000/api/reviews/verify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testimonialId: testimonial.id,
              bookingId,
            }),
          }
        );

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json().catch(() => ({}));
          verified = Boolean(verifyData.verified);
          if (!verified && verifyData.reason) {
            verifyReason = String(verifyData.reason);
          }
        } else {
          verifyReason = `Verify endpoint returned ${verifyRes.status}`;
        }
      } catch (verifyErr) {
        // Don't fail the submission if the verify call errors — the
        // testimonial is already saved as 'pending'. Log + continue.
        console.error(
          '[testimonials] /api/reviews/verify call failed (non-blocking):',
          verifyErr
        );
        verifyReason = 'Verify call failed';
      }
    }

    // ─── Admin notification ───────────────────────────────────────
    // Non-blocking — failures are logged but never break the submission.
    const preview =
      quote.length > 240 ? `${quote.slice(0, 240)}…` : quote;

    const verifyLine = verified
      ? `Verified: linked to booking ${bookingId}`
      : bookingId
        ? `Verified: not verified (${verifyReason || 'verification failed'})`
        : null;

    await notifyAdmin({
      subject: verified
        ? `[AstroKalki] New VERIFIED testimonial — ${initials}`
        : `[AstroKalki] New testimonial awaiting moderation — ${initials}`,
      text: [
        verified
          ? `A new testimonial was submitted with a verified booking reference. The testimonial is still pending moderation, but a VerifiedReview record links it to a completed session — look for the "Verified Session" badge in the moderation queue.`
          : `A new testimonial was submitted and is awaiting review.`,
        ``,
        `From:    ${initials}`,
        `Email:   ${email || '(not provided)'}`,
        `Context: ${context}`,
        pattern ? `Pattern: ${pattern}` : null,
        verifyLine,
        `Status:  pending`,
        `Submitted: ${testimonial.createdAt.toISOString()}`,
        `ID:       ${testimonial.id}`,
        ``,
        `─────────── QUOTE ───────────`,
        quote,
        `─────────── END ───────────`,
        ``,
        `Moderate at https://astrokalki.com/admin/testimonials`,
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
        <div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
          <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki · Moderation</p>
          <h1 style="font-size:24px;font-weight:300;letter-spacing:-0.02em;line-height:1.3;margin:0 0 20px;">${verified ? 'A new VERIFIED testimonial is awaiting review.' : 'A new testimonial is awaiting review.'}</h1>
          <p style="font-size:14px;line-height:1.8;color:#9a9a9a;font-weight:300;">
            From <strong style="color:#cfcabf;">${initials}</strong>${email ? ` &lt;${email}&gt;` : ''} · ${context}${pattern ? ` · ${pattern}` : ''}
          </p>
          ${verifyLine ? `<p style="font-size:12px;color:${verified ? '#c9a96e' : '#7a7a7a'};margin:8px 0;letter-spacing:0.05em;">${verifyLine.replace(/</g, '&lt;')}</p>` : ''}
          <blockquote style="font-style:italic;color:#cfcabf;font-size:15px;line-height:1.8;border-left:2px solid #c9a96e;padding-left:20px;margin:32px 0;">
            ${preview.replace(/</g, '&lt;')}
          </blockquote>
          <p style="font-size:13px;color:#7a7a7a;margin-top:32px;font-weight:300;">
            Moderate at <a href="https://astrokalki.com/admin/testimonials" style="color:#c9a96e;">astrokalki.com/admin/testimonials</a>
          </p>
          <p style="font-size:11px;color:#5a5a5a;margin-top:24px;font-weight:300;">ID: ${testimonial.id}</p>
        </div>
      `,
    });

    return NextResponse.json(
      {
        message: verified
          ? 'Thank you. Your verified testimonial is awaiting moderation.'
          : 'Thank you. Your testimonial is awaiting review.',
        verified,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Testimonial submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit testimonial' },
      { status: 500 }
    );
  }
}
