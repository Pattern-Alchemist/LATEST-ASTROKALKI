/**
 * POST /api/resend/webhook
 *
 * Dedicated Resend webhook receiver for post-session journey observability.
 * Captures delivery, bounce, open, click, and complaint outcomes and persists
 * them to both EmailEvent/SentEmail tables AND PortalActivity for journey tracking.
 *
 * This route is the canonical Resend webhook endpoint. The existing /api/email/webhook
 * handles legacy email events — this route adds journey-aware observability.
 *
 * Security:
 *   - Verifies Resend webhook secret via Authorization header
 *   - Verifies webhook signature if RESEND_WEBHOOK_SIGNING_SECRET is set
 *   - Rejects payloads > 64KB
 *
 * Resend webhook docs: https://resend.com/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EMAIL_EVENT_TYPES } from "@/lib/bookings/constants";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Delivery
    delivery_status?: string;
    // Bounce
    bounce?: {
      type: string;
      message: string;
      reason: string;
    };
    // Click
    click?: {
      url: string;
      ip: string;
      timestamp: string;
    };
    // Tags (journey metadata)
    tags?: Array<{ name: string; value: string }>;
  };
}

// ─── Webhook signature verification ───────────────────────────────

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    // Guard against length mismatch which would throw RangeError
    if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ─── Route handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Verify authorization ─────────────────────────────────────
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (expectedSecret && auth !== expectedSecret) {
    console.warn("[ResendWebhook] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Verify signature (if signing secret configured) ──────────
  const signingSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  const rawBody = await request.text();
  const signature = request.headers.get("resend-signature");

  if (signingSecret && signature) {
    if (!verifyWebhookSignature(rawBody, signature, signingSecret)) {
      console.warn("[ResendWebhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ── 3. Parse payload ────────────────────────────────────────────
  let body: ResendWebhookEvent;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data, created_at } = body;

  if (!type || !data || !data.email_id) {
    return NextResponse.json({ received: true });
  }

  const emailId = data.email_id;
  const to = data.to?.[0] || "";
  const createdAt = new Date(created_at || Date.now());

  // ── 4. Extract journey metadata from tags ───────────────────────
  const tags = data.tags || [];
  const getTag = (name: string) =>
    tags.find((t) => t.name === name)?.value;

  const journeyStage = getTag("journey_stage");
  const template = getTag("template");
  const bookingId = getTag("bookingId");
  const sequence = getTag("sequence");
  const stageNum = getTag("stage");

  // ── 5. Persist to EmailEvent ────────────────────────────────────
  await db.emailEvent
    .create({
      data: {
        emailId,
        to,
        type,
        bookingId: bookingId || null,
        template: template || null,
        sequence: sequence || null,
        stage: stageNum ? parseInt(stageNum) : null,
        metadata: JSON.stringify({
          from: data.from,
          subject: data.subject,
          delivery_status: data.delivery_status,
          bounce: data.bounce,
          click: data.click,
          journey_stage: journeyStage,
          tags,
        }),
      },
    })
    .catch((err) => {
      console.error("[ResendWebhook] Failed to create EmailEvent:", err);
    });

  // ── 6. Update SentEmail timestamps ──────────────────────────────
  const updateData: Record<string, Date> = {};

  if (type === EMAIL_EVENT_TYPES.DELIVERED) {
    updateData.deliveredAt = createdAt;
  } else if (type === EMAIL_EVENT_TYPES.OPENED) {
    updateData.openedAt = createdAt;
  } else if (type === EMAIL_EVENT_TYPES.CLICKED) {
    updateData.clickedAt = createdAt;
  } else if (type === EMAIL_EVENT_TYPES.BOUNCED) {
    updateData.bouncedAt = createdAt;
  } else if (type === EMAIL_EVENT_TYPES.COMPLAINED) {
    // Spam complaint — log but don't update SentEmail (no dedicated field)
    console.warn(
      `[ResendWebhook] Complaint received for email ${emailId} from ${to}`
    );
  }

  if (Object.keys(updateData).length > 0) {
    await db.sentEmail
      .update({ where: { emailId }, data: updateData })
      .catch(() => {
        // SentEmail may not exist if the send wasn't tracked
      });
  }

  // ── 7. Record journey-specific PortalActivity ───────────────────
  if (journeyStage && bookingId) {
    const activityType = `journey.email.${type.replace("email.", "")}`;

    await db.portalActivity
      .create({
        data: {
          bookingId,
          eventType: activityType,
          eventSource: "resend-webhook",
          payloadJson: JSON.stringify({
            emailId,
            journeyStage,
            template,
            to,
            subject: data.subject,
            timestamp: createdAt.toISOString(),
            // Bounce/click specifics
            ...(data.bounce
              ? { bounceType: data.bounce.type, bounceReason: data.bounce.reason }
              : {}),
            ...(data.click ? { clickUrl: data.click.url } : {}),
          }),
        },
      })
      .catch((err) => {
        console.error(
          "[ResendWebhook] Failed to record journey activity:",
          err
        );
      });
  }

  // ── 8. Log observability metrics ────────────────────────────────
  const eventLabel = type.replace("email.", "");
  const logParts = [eventLabel, `email=${emailId}`, `to=${to}`];
  if (journeyStage) logParts.push(`journey=${journeyStage}`);
  if (template) logParts.push(`template=${template}`);
  if (type === EMAIL_EVENT_TYPES.COMPLAINED) logParts.push("⚠️ SPAM COMPLAINT");
  console.log(`[ResendWebhook] ${logParts.join(" ")}`);

  // Always 200 so Resend doesn't retry
  return NextResponse.json({ received: true }, { status: 200 });
}
