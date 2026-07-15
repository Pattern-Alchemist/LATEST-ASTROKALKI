import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Admin unsubscribe — DELETE removes (or marks opted-out) a newsletter
 * subscriber. Used by the admin dashboard's "Remove" button.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft-delete: mark opted-out so we keep audit trail but stop sending.
    await db.newsletter.update({
      where: { id },
      data: { optedOut: true, optedOutAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/newsletter] Delete error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * Admin reply-by-email — POST a custom message to a subscriber.
 * Body: { message: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, subject } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const subscriber = await db.newsletter.findUnique({ where: { id } });
    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }
    if (subscriber.optedOut) {
      return NextResponse.json(
        { error: "Subscriber has opted out — cannot send" },
        { status: 400 }
      );
    }

    // Import lazily so this route doesn't pull nodemailer into cold start
    // for unrelated admin requests.
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: subscriber.email,
      subject: subject || "A note from AstroKalki",
      text: message,
      html: `<div style="background:#070707;color:#f0eee9;font-family:Georgia,serif;padding:48px 24px;max-width:560px;margin:0 auto;">
        <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
        <div style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;white-space:pre-wrap;">${message.replace(/</g, "&lt;")}</div>
        <p style="font-size:13px;color:#a58a54;margin-top:32px;font-style:italic;">— AstroKalki</p>
      </div>`,
      replyTo: process.env.ADMIN_EMAIL || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/newsletter] Reply error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
