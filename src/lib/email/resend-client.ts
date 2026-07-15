/**
 * Resend email client for AstroKalki.
 *
 * Wraps the Resend SDK (https://resend.com/docs) with a clean interface
 * that matches the existing sendEmail signatures used across the codebase.
 *
 * Why Resend over SMTP/nodemailer:
 *   - Higher deliverability (dedicated IP, DKIM/SPF/DMARC by default)
 *   - Built-in open/click tracking
 *   - ReactEmail / JSX template support
 *   - No SMTP credentials to manage
 *
 * Environment:
 *   RESEND_API_KEY   — required for production sends
 *   EMAIL_FROM       — sender address (default: hello@astrokalki.com)
 *
 * Fallback behaviour:
 *   When RESEND_API_KEY is not set (dev / local), emails are logged to
 *   console and never dispatched. The promise is still resolved so the
 *   calling flow never breaks.
 */

import { Resend } from "resend";

/** Display name used as the sender label in email clients. */
const SENDER_NAME = "AstroKalki";

/**
 * Create a Resend instance configured with the API key from environment.
 * Returns null when the key is missing (dev fallback).
 */
function createResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/** Lazily-initialised singleton so we only create one Resend instance. */
let _client: Resend | null = null;
let _initialised = false;

function getClient(): Resend | null {
  if (!_initialised) {
    _client = createResendClient();
    _initialised = true;
  }
  return _client;
}

export interface ResendSendInput {
  to: string | string[];
  subject: string;
  /** The email body (HTML or plain text). If html is provided, text is optional. */
  html?: string;
  /** The email body as plain text. If html is also provided, both are sent. */
  text?: string;
  /** Optional reply-to address. */
  replyTo?: string;
  /** Optional sender override (defaults to hello@astrokalki.com). */
  from?: string;
  /** Optional tag for analytics/tracking. */
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendSendResult {
  delivered: "resend" | "console";
  id?: string;
  preview?: string;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || "hello@astrokalki.com";

/**
 * Send an email via Resend.
 *
 * Falls back to console logging when RESEND_API_KEY is not configured,
 * so development flows are never blocked.
 */
export async function sendViaResend(
  input: ResendSendInput
): Promise<ResendSendResult> {
  const client = getClient();
  const from = input.from || `${SENDER_NAME} <${DEFAULT_FROM}>`;
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!client) {
    // Graceful fallback — log to console
    const preview = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "[EMAIL — RESEND NOT CONFIGURED, logging only]",
      `From:    ${from}`,
      `To:      ${to.join(", ")}`,
      `Subject: ${input.subject}`,
      input.replyTo ? `ReplyTo: ${input.replyTo}` : null,
      "─────────── BODY ───────────",
      input.text || input.html?.replace(/<[^>]+>/g, "") || "(empty)",
      "─────────── END ───────────",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ]
      .filter(Boolean)
      .join("\n");

    console.log(preview);

    return { delivered: "console", preview };
  }

  try {
    const { data, error } = await (client.emails.send as any)({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      tags: input.tags,
    });

    if (error) {
      console.error("[Resend] Send failed:", error);
      return { delivered: "console", preview: `Error: ${error.message}` };
    }

    return {
      delivered: "resend",
      id: data?.id,
      preview: `Sent to ${to.join(", ")} via Resend (id=${data?.id})`,
    };
  } catch (err) {
    console.error("[Resend] Exception:", err);
    return { delivered: "console", preview: `Exception: ${String(err)}` };
  }
}

/**
 * Verify that the Resend API key is valid by making a lightweight API call.
 * Returns `true` if the client responds successfully.
 */
export async function verifyResendConnection(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    // Resend SDK doesn't have a dedicated ping — list api-keys as a proxy
    await client.apiKeys.list();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a sanitised preview of the Resend configuration status (for admin UI).
 */
export function getResendStatus(): {
  configured: boolean;
  sender: string;
} {
  return {
    configured: getClient() !== null,
    sender: DEFAULT_FROM,
  };
}
