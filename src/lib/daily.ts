/**
 * Daily.co client for AstroKalki.
 *
 * Creates video/audio rooms via the Daily.co REST API.
 * Used to generate meeting links for booked sessions.
 *
 * Environment:
 *   DAILY_API_KEY  — Daily.co REST API key (from https://dashboard.daily.co/developers/api-keys)
 *   DAILY_DOMAIN   — Your Daily.co subdomain (e.g. "astrokalki" from astrokalki.daily.co)
 *
 * Free tier: 10,000 participant-minutes/month (~83 hours of 1-on-1 calls).
 * A single 60-min session with 2 participants = 120 participant-minutes.
 * That's ~83 sessions/month on the free tier.
 */

import { db } from "@/lib/db";

export interface DailyRoom {
  /** Room name (e.g. "session-abc123") */
  name: string;
  /** Full join URL (e.g. "https://astrokalki.daily.co/session-abc123") */
  url: string;
  /** Room privacy setting */
  privacy: "private" | "public";
  /** When the room was created */
  created: string;
  /** Room configuration properties */
  config: {
    maxParticipants: number;
    enableChat: boolean;
    enablePrejoinUI: boolean;
    startAudioOff: boolean;
    startVideoOff: boolean;
  };
}

export interface DailyRoomInput {
  /** Unique room identifier (auto-generated if not provided) */
  name?: string;
  /** Privacy setting (default: "private") */
  privacy?: "private" | "public";
  /** Maximum participants (default: 2 for 1-on-1 sessions) */
  maxParticipants?: number;
  /** Start with audio muted (default: false) */
  startAudioOff?: boolean;
  /** Start with video off (default: false — audio-only sessions set this to true) */
  startVideoOff?: boolean;
  /** Enable chat (default: true) */
  enableChat?: boolean;
  /** Enable prejoin UI (default: true) */
  enablePrejoinUI?: boolean;
  /** Room expiry in minutes from now (default: 1440 = 24 hours) */
  expiryMinutes?: number;
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not configured");
  return key;
}

function getDomain(): string {
  return process.env.DAILY_DOMAIN || "astrokalki";
}

const DAILY_API_BASE = "https://api.daily.co/v1";

// ─── Room creation ──────────────────────────────────────────────────────────

/**
 * Create a new Daily.co room for a session.
 *
 * Returns the room details including the join URL that can be sent to the client.
 * Rooms are private by default (require a signed token or the URL to join).
 */
export async function createDailyRoom(
  input: DailyRoomInput = {}
): Promise<DailyRoom> {
  const apiKey = getApiKey();
  const domain = getDomain();

  const roomName = input.name || `session-${crypto.randomUUID().slice(0, 8)}`;

  const response = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: input.privacy || "private",
      properties: {
        max_participants: input.maxParticipants || 2,
        enable_chat: input.enableChat ?? true,
        enable_prejoin_ui: input.enablePrejoinUI ?? true,
        start_audio_off: input.startAudioOff ?? false,
        start_video_off: input.startVideoOff ?? false,
        exp: input.expiryMinutes
          ? Math.floor(Date.now() / 1000) + input.expiryMinutes * 60
          : Math.floor(Date.now() / 1000) + 24 * 60 * 60, // default 24h
        // Auto-join the creator (admin) when they enter
        enable_hand_raise: false,
        enable_noise_cancellation: false,
        enable_screenshare: true,
        // Allow joining without an account (guest mode)
        enable_knocking: true,
        // Set the meeting title for display
        meeting_title: "AstroKalki Session",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Daily.co room creation failed: ${response.status} — ${errorText}`);
  }

  const data = await response.json();

  return {
    name: data.name,
    url: data.url,
    privacy: data.privacy,
    created: data.created_at,
    config: {
      maxParticipants: data.config?.max_participants || 2,
      enableChat: data.config?.enable_chat ?? true,
      enablePrejoinUI: data.config?.enable_prejoin_ui ?? true,
      startAudioOff: data.config?.start_audio_off ?? false,
      startVideoOff: data.config?.start_video_off ?? false,
    },
  };
}

/**
 * Generate a meeting URL for a booking without making an API call.
 * Useful when DAILY_API_KEY is not configured (dev fallback).
 */
export function getMeetingUrl(bookingId: string): string {
  const domain = getDomain();
  return `https://${domain}.daily.co/session-${bookingId.slice(0, 8)}`;
}

/**
 * Check if Daily.co is configured (has API key).
 */
export function isDailyConfigured(): boolean {
  return Boolean(process.env.DAILY_API_KEY);
}

// ─── Shared helper for booking room creation ────────────────────────────────

const ROOM_EXPIRY_MINUTES = 48 * 60; // 48 hours

/**
 * Ensure a Daily.co room exists for a booking.
 *
 * Creates a room via the Daily.co API (or a placeholder URL when the API key
 * is not configured), then persists the room URL and name on the booking record.
 *
 * Safe to call multiple times — if the booking already has a `roomUrl`, the
 * existing room is returned without making a new API call.
 *
 * Usage:
 *   // Await (blocking) — when the response needs roomUrl:
 *   const roomUrl = await ensureDailyRoom(booking.id);
 *
 *   // Fire-and-forget (non-blocking) — when the response can return without it:
 *   ensureDailyRoom(booking.id).catch(() => {});
 *
 * @param bookingId - Prisma Booking ID
 * @param logPrefix - Optional prefix for log messages (e.g. "[Stripe]")
 * @returns The room URL, or null if creation failed entirely
 */
export async function ensureDailyRoom(
  bookingId: string,
  logPrefix?: string
): Promise<string | null> {
  const prefix = logPrefix || "[Daily]";

  try {
    // Check if a room already exists
    const existing = await db.booking.findUnique({
      where: { id: bookingId },
      select: { roomUrl: true },
    });

    if (existing?.roomUrl) {
      return existing.roomUrl;
    }

    const roomName = `session-${bookingId.slice(0, 8)}`;
    let roomUrl: string;

    if (isDailyConfigured()) {
      const room = await createDailyRoom({
        name: roomName,
        maxParticipants: 2,
        enableChat: true,
        enablePrejoinUI: true,
        expiryMinutes: ROOM_EXPIRY_MINUTES,
      });
      roomUrl = room.url;
    } else {
      roomUrl = getMeetingUrl(bookingId);
    }

    // Only update if we got a URL
    if (roomUrl) {
      await db.booking.update({
        where: { id: bookingId },
        data: { roomName, roomUrl },
      });
      console.log(`${prefix} Daily.co room created for ${bookingId}: ${roomUrl}`);
    }

    return roomUrl;
  } catch (err) {
    console.error(`${prefix} Room creation failed for ${bookingId}:`, err);
    return null;
  }
}

