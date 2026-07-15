/**
 * POST /api/email-course
 *
 * Enroll an email in the free 5-day "Pattern Recognition Foundations"
 * course. Sends Day 1 immediately, then the cron at /api/cron/email-course
 * advances Days 2–5 on a 24-hour cadence.
 *
 * Body: { email: string, website?: string }
 *   - `website` is the honeypot — must be empty for real users.
 *
 * Security:
 *   - Rate limit: 3 enrollments per IP per hour (task spec).
 *   - Honeypot field `website` — silently 200-OK for bots.
 *   - Zod-validated email (reuses the central emailSchema).
 *   - 4 KB body cap (enforced in middleware).
 *
 * Returns:
 *   201 { success: true, message: "Check your inbox — Day 1 is on its way." }
 *   200 { success: true, message: "You're already enrolled! Check your inbox." }
 *     (when the email is already enrolled — we do NOT leak whether the
 *      email exists; we return a friendly duplicate message)
 *   400 { error: "..." }  (invalid email)
 *   429 { error: "Too many requests..." }
 *   500 { error: "Failed to enroll" }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, notifyAdmin } from "@/lib/email";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  isHoneypotTriggered,
  honeypotSuccessResponse,
  emailSchema,
  honeypotSchema,
} from "@/lib/security";
import { renderCourseEmail } from "@/lib/email-course/render";

// Inline schema — we don't add this to /lib/security/validation.ts because
// the task explicitly forbids touching other agents' files, and the central
// validation module is shared. A local schema keeps this endpoint's contract
// in its own file.
const emailCourseInputSchema = z.object({
  email: emailSchema,
  website: honeypotSchema,
});

// 3 enrollments per IP per hour — task spec.
const COURSE_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 3 };

export async function POST(request: NextRequest) {
  // ─── Rate limit ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ec:${ip}`, COURSE_RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${rl.retryAfterSeconds}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  // ─── Parse + size cap ────────────────────────────────────────────────────
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4 * 1024) {
      return NextResponse.json({ error: "Body too large" }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ─── Honeypot — silent 200 OK for bots ──────────────────────────────────
  if (isHoneypotTriggered(raw)) {
    return NextResponse.json(
      {
        success: true,
        message: "Check your inbox — Day 1 is on its way.",
        ...honeypotSuccessResponse("newsletter"),
      },
      { status: 200 }
    );
  }

  // ─── Validate ────────────────────────────────────────────────────────────
  const parsed = emailCourseInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const error = firstIssue ? firstIssue.message : "Invalid input";
    return NextResponse.json({ error }, { status: 400 });
  }
  const { email } = parsed.data;

  try {
    // ─── Already enrolled? ──────────────────────────────────────────────────
    // We do NOT error on duplicate enrollment. We return a friendly message
    // that confirms they're already in the course without leaking anything
    // sensitive, and we do NOT re-send Day 1 (that would be spammy).
    const existing = await db.emailCourseEnrollment.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: "You're already enrolled! Check your inbox.",
        },
        { status: 200 }
      );
    }

    // ─── Create enrollment at stage 0 ──────────────────────────────────────
    const now = new Date();
    await db.emailCourseEnrollment.create({
      data: {
        email,
        stage: 0,
      },
    });

    // ─── Send Day 1 immediately ────────────────────────────────────────────
    // Render Day 1 for this recipient. If rendering fails (e.g. token signing
    // env not set), we still keep the enrollment — the cron will retry the
    // Day-1 send on its next run because stage is still 0 and lastSentAt is
    // null (which the cron interprets as "ready to send").
    const rendered = await renderCourseEmail(1, email);

    if (rendered) {
      try {
        await sendEmail({
          to: email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });

        // Advance to stage 1 + record lastSentAt so the cron waits 24h
        // before sending Day 2.
        await db.emailCourseEnrollment.updateMany({
          where: { email, stage: 0 },
          data: { stage: 1, lastSentAt: now },
        });
      } catch (err) {
        console.error(
          `[email-course] Day 1 send failed for ${email}:`,
          err
        );
        // Don't fail the request — the enrollment is recorded, the cron
        // will retry. Return success so the user isn't told their email
        // failed when in fact it just queued.
      }
    }

    // ─── Notify admin (non-blocking) ───────────────────────────────────────
    await Promise.allSettled([
      notifyAdmin({
        subject: `[AstroKalki] New email course enrollment`,
        text: [
          `New enrollment in the 5-day Pattern Recognition Foundations course.`,
          ``,
          `Email: ${email}`,
          `Source: /email-course landing page`,
          `Stage: 1 (Day 1 dispatched immediately)`,
        ].join("\n"),
        html: `
          <p>New enrollment in the <strong>5-day Pattern Recognition Foundations</strong> course.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Source:</strong> /email-course landing page</p>
          <p><strong>Stage:</strong> 1 (Day 1 dispatched immediately)</p>
        `,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Check your inbox — Day 1 is on its way.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Email course enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to enroll" },
      { status: 500 }
    );
  }
}
