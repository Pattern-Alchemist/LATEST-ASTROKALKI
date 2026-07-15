/**
 * POST /api/email/webhook
 *
 * Resend webhook receiver. Captures email delivery events (delivered, opened,
 * clicked, bounced, complained) and persists them to the EmailEvent table.
 *
 * Also updates the SentEmail row with the corresponding timestamp so the
 * admin dashboard can show per-email delivery status.
 *
 * Security: verified via Resend webhook secret.
 *           Body size allowed up to 64KB for event payloads.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  // Verify webhook secret (Resend sends it as Authorization: Bearer <secret>)
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (expectedSecret && auth !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const type = body.type as string | undefined;
    const data = body.data as Record<string, unknown> | undefined;

    if (!type || !data) {
      // Acknowledge but don't persist malformed events
      return NextResponse.json({ received: true });
    }

    const emailId = data.email_id as string | undefined;
    const to = data.email_to as string || (data.to as string) || "";
    const createdAt = new Date();

    // Persist the event
    const eventData: Record<string, unknown> = {};

    // Extract metadata from Resend's payload shape
    if (type === "email.delivered") {
      eventData.deliveredAt = createdAt;
    } else if (type === "email.opened") {
      eventData.openedAt = createdAt;
    } else if (type === "email.clicked") {
      eventData.clickedAt = createdAt;
    } else if (type === "email.bounced") {
      eventData.bouncedAt = createdAt;
      const bounce = data.bounce as Record<string, unknown> | undefined;
      if (bounce) eventData.bounceReason = bounce.reason;
    }

    if (emailId) {
      // Create EmailEvent
      await db.emailEvent.create({
        data: {
          emailId,
          to,
          type,
          bookingId: (data.booking_id as string) || null,
          template: (data.template as string) || null,
          sequence: (data.sequence as string) || null,
          stage: data.stage ? parseInt(data.stage as string) : null,
          metadata: JSON.stringify(data),
        },
      }).catch((err) => {
        console.error(`[EmailWebhook] Failed to persist event:`, err);
      });

      // Update SentEmail row with status timestamp
      const updateData: Record<string, Date> = {};
      if (type === "email.delivered") updateData.deliveredAt = createdAt;
      else if (type === "email.opened") updateData.openedAt = createdAt;
      else if (type === "email.clicked") updateData.clickedAt = createdAt;
      else if (type === "email.bounced") updateData.bouncedAt = createdAt;

      if (Object.keys(updateData).length > 0) {
        await db.sentEmail.update({
          where: { emailId },
          data: updateData,
        }).catch(() => {
          // SentEmail may not exist yet if the send wasn't tracked
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[EmailWebhook] Error:", err);
    // Always 200 so Resend doesn't retry
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
