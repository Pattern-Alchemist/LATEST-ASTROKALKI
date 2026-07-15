/**
 * Resend webhook configuration helper for AstroKalki.
 *
 * Uses the Resend SDK to manage webhook endpoints programmatically.
 * Supports listing existing webhooks, creating new ones, and removing stale entries.
 *
 * Environment:
 *   RESEND_API_KEY — required for webhook management
 *
 * Usage:
 *   - Admin dashboard: show configured webhooks, add/remove endpoints
 *   - Setup script: programmatically register the webhook URL on deploy
 *   - Health check: verify webhook is configured and pointing to the right URL
 */

import { Resend } from "resend";

// ─── Resend client ────────────────────────────────────────────────

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// ─── Types ────────────────────────────────────────────────────────

export interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

export interface SetupResult {
  success: boolean;
  webhook?: WebhookInfo;
  error?: string;
}

// ─── Event lists ──────────────────────────────────────────────────

/** All Resend email events for comprehensive tracking */
export const ALL_EMAIL_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
] as const;

/** Post-session journey events (subset for focused tracking) */
export const JOURNEY_EVENTS = [
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
] as const;

// ─── Core functions ───────────────────────────────────────────────

/**
 * List all configured webhooks in Resend.
 */
export async function listWebhooks(): Promise<WebhookInfo[]> {
  const client = getResendClient();
  if (!client) {
    console.warn("[WebhookSetup] RESEND_API_KEY not configured");
    return [];
  }

  try {
    const result = await client.webhooks.list();
    const data = (result as any).data;
    const error = (result as any).error;
    if (error) {
      console.error("[WebhookSetup] Failed to list webhooks:", error);
      return [];
    }

    const list = Array.isArray(data) ? data : [];
    return list.map((wh: any) => ({
      id: wh.id,
      url: wh.url,
      events: wh.events || [],
      createdAt: wh.created_at || "",
    }));
  } catch (err) {
    console.error("[WebhookSetup] Exception listing webhooks:", err);
    return [];
  }
}

/**
 * Create a new webhook endpoint in Resend.
 *
 * @param url - The full URL to receive webhook events (e.g., https://astrokalki.com/api/resend/webhook)
 * @param events - Array of event types to subscribe to (defaults to all email events)
 */
export async function createWebhook(
  url: string,
  events: readonly string[] = ALL_EMAIL_EVENTS
): Promise<SetupResult> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    // Note: using `as any` due to Resend SDK type limitations for webhook events
    const result = await client.webhooks.create({
      url,
      events: [...events] as any,
    } as any);

    const data = (result as any).data;
    const error = (result as any).error;

    if (error) {
      console.error("[WebhookSetup] Failed to create webhook:", error);
      return { success: false, error: error.message };
    }

    const webhook: WebhookInfo = {
      id: data?.id || "",
      url,
      events: [...events],
      createdAt: new Date().toISOString(),
    };

    console.log(`[WebhookSetup] ✅ Created webhook: ${webhook.id} → ${url}`);
    return { success: true, webhook };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WebhookSetup] Exception creating webhook:", err);
    return { success: false, error: message };
  }
}

/**
 * Remove a webhook endpoint from Resend by ID.
 */
export async function removeWebhook(webhookId: string): Promise<SetupResult> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const result = await client.webhooks.remove(webhookId);
    const error = (result as any).error;

    if (error) {
      console.error("[WebhookSetup] Failed to remove webhook:", error);
      return { success: false, error: error.message };
    }

    console.log(`[WebhookSetup] ✅ Removed webhook: ${webhookId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WebhookSetup] Exception removing webhook:", err);
    return { success: false, error: message };
  }
}

// ─── High-level setup helpers ─────────────────────────────────────

/**
 * Ensure a webhook is configured for the given URL.
 * - If a webhook with the same URL already exists, returns it (no-op)
 * - If webhooks exist with different URLs, optionally remove stale ones
 * - Creates a new webhook if none matches
 */
export async function ensureWebhook(
  targetUrl: string,
  options: {
    events?: readonly string[];
    removeStale?: boolean;
  } = {}
): Promise<SetupResult> {
  const events = options.events || ALL_EMAIL_EVENTS;
  const existing = await listWebhooks();

  // Check if target URL is already configured
  const matching = existing.find((wh) => wh.url === targetUrl);
  if (matching) {
    console.log(`[WebhookSetup] Webhook already configured: ${matching.id}`);
    return { success: true, webhook: matching };
  }

  // Remove stale webhooks if requested
  if (options.removeStale && existing.length > 0) {
    for (const stale of existing) {
      console.log(`[WebhookSetup] Removing stale webhook: ${stale.id} (${stale.url})`);
      await removeWebhook(stale.id);
    }
  }

  // Create new webhook
  return createWebhook(targetUrl, events);
}

/**
 * Get a health summary of webhook configuration (for admin dashboard).
 */
export async function getWebhookHealth(): Promise<{
  configured: boolean;
  webhookCount: number;
  webhooks: WebhookInfo[];
  targetUrl: string | null;
  hasCorrectUrl: boolean;
}> {
  const webhooks = await listWebhooks();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const targetUrl = `${siteUrl}/api/resend/webhook`;

  const hasCorrectUrl = webhooks.some((wh) => wh.url === targetUrl);

  return {
    configured: webhooks.length > 0,
    webhookCount: webhooks.length,
    webhooks,
    targetUrl,
    hasCorrectUrl,
  };
}
