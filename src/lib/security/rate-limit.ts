/**
 * In-memory rate limiter for AstroKalki public APIs.
 *
 * Why in-memory and not Redis?
 *   - Single-instance deployment (Next.js standalone server on this host).
 *   - Public APIs are low-volume (newsletter, bookings, micro-readings).
 *   - Avoids Redis as a new operational dependency.
 *
 * Trade-off: limits reset on server restart. Acceptable for this workload.
 *
 * Usage:
 *   const ok = checkRateLimit(`nl:${ip}`, { windowMs: 60_000, max: 5 });
 *   if (!ok) return 429;
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

// Periodic GC — drop expired buckets so the map doesn't grow forever.
// Runs every 5 minutes on access (lazy).
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGc = Date.now();

function gc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  lastGc = now;
}

export interface RateLimitConfig {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed within the window. */
  max: number;
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Mutates the bucket in place — caller should respond 429 immediately on false.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  gc(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { ok: true };
  }

  if (existing.count >= config.max) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true };
}

/**
 * Convenience presets for AstroKalki's public endpoints.
 * Calibrated to allow legitimate use while blocking spam waves.
 */
export const RATE_LIMITS = {
  /** Newsletter: 5 subscribes per IP per 10 min. Legitimate users subscribe once. */
  newsletter: { windowMs: 10 * 60 * 1000, max: 5 },
  /** Bookings: 3 per IP per hour. A real user submits one. */
  bookings: { windowMs: 60 * 60 * 1000, max: 3 },
  /** Micro-reading: 10 per IP per hour. Users retake the diagnostic. */
  microReading: { windowMs: 60 * 60 * 1000, max: 10 },
  /** Micro-reading partial (autosave): 30 per IP per hour. */
  microReadingPartial: { windowMs: 60 * 60 * 1000, max: 30 },
  /** Testimonials: 3 per IP per hour. */
  testimonials: { windowMs: 60 * 60 * 1000, max: 3 },
  /** Admin login: 5 attempts per IP per 15 min. Brute-force protection. */
  adminLogin: { windowMs: 15 * 60 * 1000, max: 5 },
  /** Generic API: 60 per IP per minute. */
  api: { windowMs: 60 * 1000, max: 60 },
} as const;

/**
 * Extract the caller's IP from a Next.js request.
 * Falls through X-Forwarded-For → X-Real-IP → NextRequest.ip → 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();

  // NextRequest exposes .ip — but the type isn't on the Request interface.
  const ip = (request as unknown as { ip?: string }).ip;
  if (typeof ip === 'string') return ip;

  return 'unknown';
}
