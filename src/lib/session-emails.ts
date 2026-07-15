/**
 * Shared session-email orchestration helpers.
 *
 * Both the booking-creation flow (/api/bookings, /api/slots/[id]) and the
 * admin completion flow (/api/admin/bookings/[id]) need to dispatch prep
 * and recap emails. Rather than re-implementing the SessionRecap upsert +
 * render + send + stamp pipeline in each caller, this module exposes two
 * idempotent helpers:
 *
 *   - dispatchPrepEmail(bookingId)   → sends prep, stamps prepSentAt
 *   - dispatchRecapEmail(bookingId)  → generates prompts, sends recap,
 *                                       stamps recapSentAt + integrationPrompts
 *
 * Both helpers are safe to call repeatedly: if the email was already sent,
 * they no-op (return { skipped: true }) unless `force: true` is passed.
 */

import { db } from "@/lib/db";
import { sendEmail, notifyAdmin } from "@/lib/email";
import {
  renderPrepEmail,
  type PrepEmailBooking,
} from "@/lib/email/session-prep";
import {
  renderRecapEmail,
  type RecapEmailBooking,
} from "@/lib/email/session-recap";
import { generateIntegrationPrompts } from "@/lib/ai/integration-prompts";

interface DispatchResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  delivered?: "smtp" | "console" | "resend";
  messageId?: string;
  recapId?: string;
}

/**
 * Send the pre-session "what to prepare" email.
 *
 * Idempotent: if a SessionRecap row already has prepSentAt set, this no-ops
 * (unless `force: true`).
 */
export async function dispatchPrepEmail(
  bookingId: string,
  opts: { force?: boolean } = {}
): Promise<DispatchResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, reason: "Booking not found" };
  }

  // Skip cancelled bookings — no point sending prep to a cancelled session.
  if (booking.status === "cancelled") {
    return { ok: false, reason: "Booking is cancelled" };
  }

  // Upsert the SessionRecap row.
  const recap = await db.sessionRecap.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      email: booking.email,
    },
    update: {},
  });

  if (recap.prepSentAt && !opts.force) {
    return { ok: true, skipped: true, reason: "Prep email already sent" };
  }

  const prepBooking: PrepEmailBooking = {
    id: booking.id,
    name: booking.name,
    email: booking.email,
    duration: booking.duration,
    contexts: booking.contexts,
    scheduledAt: booking.scheduledAt,
  };

  try {
    const { subject, html, text } = await renderPrepEmail(prepBooking);
    const result = await sendEmail({
      to: booking.email,
      subject,
      html,
      text,
    });

    await db.sessionRecap.update({
      where: { bookingId: booking.id },
      data: { prepSentAt: new Date() },
    });

    return {
      ok: true,
      delivered: result.delivered,
      messageId: result.messageId,
      recapId: recap.id,
    };
  } catch (error) {
    console.error(`[session-emails] prep dispatch failed for ${bookingId}:`, error);
    return { ok: false, reason: "Send failed" };
  }
}

/**
 * Send the post-session recap email with AI-generated integration prompts.
 *
 * Idempotent: if recapSentAt is already set, no-ops (unless `force: true`).
 * Even on force, we re-generate prompts only if integrationPrompts is null
 * (to avoid burning LLM tokens on a re-send).
 */
export async function dispatchRecapEmail(
  bookingId: string,
  opts: { force?: boolean } = {}
): Promise<DispatchResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, reason: "Booking not found" };
  }

  // Upsert the SessionRecap row.
  const recap = await db.sessionRecap.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      email: booking.email,
    },
    update: {},
  });

  if (recap.recapSentAt && !opts.force) {
    return { ok: true, skipped: true, reason: "Recap email already sent" };
  }

  // Generate integration prompts (or reuse cached).
  let prompts: string[];
  let promptsJson: string;

  if (recap.integrationPrompts && !opts.force) {
    try {
      const parsed = JSON.parse(recap.integrationPrompts);
      if (Array.isArray(parsed) && parsed.length === 5) {
        prompts = parsed;
        promptsJson = recap.integrationPrompts;
      } else {
        prompts = await generateIntegrationPrompts({
          contexts: booking.contexts,
          duration: booking.duration,
          message: booking.message,
          name: booking.name.split(" ")[0],
        });
        promptsJson = JSON.stringify(prompts);
      }
    } catch {
      prompts = await generateIntegrationPrompts({
        contexts: booking.contexts,
        duration: booking.duration,
        message: booking.message,
        name: booking.name.split(" ")[0],
      });
      promptsJson = JSON.stringify(prompts);
    }
  } else {
    prompts = await generateIntegrationPrompts({
      contexts: booking.contexts,
      duration: booking.duration,
      message: booking.message,
      name: booking.name.split(" ")[0],
    });
    promptsJson = JSON.stringify(prompts);
  }

  const recapBooking: RecapEmailBooking = {
    id: booking.id,
    name: booking.name,
    email: booking.email,
    duration: booking.duration,
    scheduledAt: booking.scheduledAt,
  };

  try {
    const { subject, html, text } = await renderRecapEmail(recapBooking, prompts);
    const result = await sendEmail({
      to: booking.email,
      subject,
      html,
      text,
    });

    await db.sessionRecap.update({
      where: { bookingId: booking.id },
      data: {
        recapSentAt: new Date(),
        integrationPrompts: promptsJson,
      },
    });

    // Soft admin notification — useful for the practitioner to know the
    // recap went out + what prompts were sent (so they can reference them
    // in a follow-up if needed).
    await notifyAdmin({
      subject: `[AstroKalki] Recap sent — ${booking.name}`,
      text: [
        `Recap email dispatched for booking ${booking.id}.`,
        ``,
        `Client:   ${booking.name} <${booking.email}>`,
        `Duration: ${booking.duration} min`,
        `Sent at:  ${new Date().toISOString()}`,
        ``,
        `Integration prompts sent:`,
        ...prompts.map((p, i) => `  ${i + 1}. ${p}`),
      ].join("\n"),
      html: `
        <p>Recap email dispatched for booking <code>${booking.id}</code>.</p>
        <p>
          Client: ${booking.name} &lt;${booking.email}&gt;<br/>
          Duration: ${booking.duration} min<br/>
          Sent at: ${new Date().toISOString()}
        </p>
        <p>Integration prompts sent:</p>
        <ol>
          ${prompts.map((p) => `<li>${p}</li>`).join("")}
        </ol>
      `,
    }).catch(() => null);

    return {
      ok: true,
      delivered: result.delivered,
      messageId: result.messageId,
      recapId: recap.id,
    };
  } catch (error) {
    console.error(`[session-emails] recap dispatch failed for ${bookingId}:`, error);
    return { ok: false, reason: "Send failed" };
  }
}
