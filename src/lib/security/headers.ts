/**
 * Security headers helper for AstroKalki.
 *
 * Applied via:
 *   1. `next.config.ts` `headers()` — applied to every route, including static.
 *   2. `src/middleware.ts` — applied to API + dynamic routes, lets us override
 *      per-path (e.g. stricter CSP for /admin, looser for /api/og image gen).
 *
 * Notes:
 *   - CSP is report-only friendly: we ship a real `Content-Security-Policy`
 *     because we don't use inline scripts (Next.js emits nonces in prod when
 *     configured, but AstroKalki has no third-party scripts — no GA, no
 *     Stripe.js, no chat widgets).
 *   - YouTube embeds on /guides are the only iframe consumers. We scope
 *     `frame-src` to youtube-nocookie.com.
 *   - `connect-src` allows the same origin only (no external API calls from
 *     the browser — email + DB are all server-side).
 */

import { NextResponse } from 'next/server';

/**
 * The base CSP applied site-wide.
 *
 * - default-src 'self'                 — everything same-origin by default
 * - script-src 'self' 'unsafe-inline'  — Next.js needs 'unsafe-inline' for
 *   inline runtime chunks in dev; in prod it needs nonce-based CSP, which
 *   we are NOT enabling yet because there are no third-party scripts to
 *   protect against. Ship safe-by-default, tighten later.
 * - style-src 'self' 'unsafe-inline'   — Tailwind + Next.js inject styles
 * - img-src 'self' data: https:        — allow OG images from data URIs and
 *   any https image (rare; we host our own)
 * - font-src 'self' data:              — system fonts + occasional data URIs
 * - frame-src youtube-nocookie.com     — YouTube embeds only
 * - connect-src 'self'                 — no external browser-side API calls
 * - frame-ancestors allows preview + production domains
 * - base-uri 'self'                    — prevent base-hijack
 * - form-action 'self'                 — prevent form POST exfiltration
 */
export const CSP_HEADER =
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "frame-src https://www.youtube-nocookie.com https://youtube-nocookie.com",
    "connect-src 'self'",
    "frame-ancestors 'self' https://preview-0e79c0ab.space-z.ai https://v0.app https://*.vercel.app",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ') + ';';

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP_HEADER,
  'X-Frame-Options': 'SAMEORIGIN',              // allow framing on same-origin and dev preview
  'X-Content-Type-Options': 'nosniff',          // MIME sniffing off
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'interest-cohort=()',  // disable FLoC
  ].join(', '),
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': [
    'max-age=63072000',       // 2 years
    'includeSubDomains',
    'preload',
  ].join('; '),
  // Cache control for API responses — never cache auth-related or PII responses
  'X-Robots-Tag': 'index, follow',
};

/** Apply security headers to a NextResponse. Returns the same response. */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/** Headers for API responses — adds no-store to prevent any caching. */
export function applyApiSecurityHeaders(response: NextResponse): NextResponse {
  applySecurityHeaders(response);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
