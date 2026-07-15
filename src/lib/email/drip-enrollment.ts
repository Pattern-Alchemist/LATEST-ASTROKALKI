/**
 * Drip enrollment — wires subscribers / session-completers into
 * the correct drip campaign timelines.
 *
 * Why this module:
 *   The Newsletter model has dripStage + lastDripAt fields that a cron job
 *   (process-drips) reads to know who is due for their next email. This
 *   module stamps the initial values when someone subscribes or completes
 *   a session, so the cron processes them on its next run.
 *
 * Drip campaign types:
 *   - welcome: 3 emails (Day 0, Day 2, Day 5) — for newsletter subscribers
 *   - post-session: 3 emails (Day +1, Day +14, Day +28) — for session completers
 */

import { db } from "@/lib/db";

// ── Newsletter subscriber → welcome drip ────────────────────────────────────

/**
 * Initialize the welcome drip clock for a new newsletter subscriber.
 *
 * Call this AFTER creating the Newsletter row. Stamps lastDripAt = now
 * and dripStage = 0. The daily cron will find this row and, depending on
 * the time elapsed since lastDripAt, advance the dripStage and send the
 * corresponding email.
 *
 * Stages:
 *   0 => welcome sent (Day 0, immediate)
 *   1 => Day 2 ("One pattern. Read it slowly.")
 *   2 => Day 5 ("60 seconds. No chart. Just honesty.")
 *   3 => complete
 */
export async function enrollInWelcomeDrip(email: string): Promise<void> {
  try {
    await db.newsletter.update({
      where: { email },
      data: {
        dripStage: 0,
        lastDripAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[Drip] Failed to enroll ${email} in welcome drip:`, error);
  }
}

// ── Session completer → post-session drip ────────────────────────────────────

/**
 * Initialize the post-session integration drip for a client who just
 * completed a session.
 *
 * Call this AFTER marking a booking as "completed" and sending the
 * recap email. Stamps lastDripAt = now and dripStage = 10 (offset to
 * distinguish from welcome drip stages).
 *
 * Stages:
 *   10 => Day 1 reflection ("One pattern to sit with.")
 *   11 => Day 14 check-in ("Two weeks later.")
 *   12 => Day 28 check-in ("A month later.")
 *   13 => complete
 *
 * Returns false if the email isn't in the newsletter table (can't
 * track drips without a newsletter row).
 */
export async function enrollInPostSessionDrip(
  email: string
): Promise<boolean> {
  try {
    // Ensure the client exists in the newsletter table
    let subscriber = await db.newsletter.findUnique({
      where: { email },
    });

    if (!subscriber) {
      // Auto-create — they completed a session, they're in our ecosystem
      subscriber = await db.newsletter.create({
        data: {
          email,
          source: "session-completion",
          dripStage: 10,
          lastDripAt: new Date(),
          prefDrip: true,
          prefSessions: true,
        },
      });
    } else {
      // Update existing subscriber to start post-session drips
      // Don't overwrite if they're already further along
      if (subscriber.dripStage < 10) {
        await db.newsletter.update({
          where: { email },
          data: {
            dripStage: 10,
            lastDripAt: new Date(),
          },
        });
      }
    }

    return true;
  } catch (error) {
    console.error(
      `[Drip] Failed to enroll ${email} in post-session drip:`,
      error
    );
    return false;
  }
}

// ── Abandoned flow → recovery drip ──────────────────────────────────────────

/**
 * Initialize the abandoned-flow recovery clock.
 *
 * Sets lastDripAt = now, dripStage stays at 0 since this is a
 * standalone recovery flow, not part of the sequential drip.
 *
 * The abandoned recovery email is sent by AbandonedFlow logic
 * (see src/lib/email-templates.ts → sendAbandonedRecoveryEmail)
 * and is not managed by the daily drip cron.
 */
export async function enrollInRecoveryDrip(email: string): Promise<void> {
  try {
    await db.newsletter.upsert({
      where: { email },
      update: {
        lastDripAt: new Date(),
        // Don't regress dripStage if they're already further along
      },
      create: {
        email,
        source: "abandoned-flow-recovery",
        dripStage: 0,
        lastDripAt: new Date(),
        prefDrip: true,
        prefSessions: false,
        prefBlog: false,
      },
    });
  } catch (error) {
    console.error(`[Drip] Failed to enroll ${email} in recovery drip:`, error);
  }
}
