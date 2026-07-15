/**
 * A/B testing session ID management.
 *
 * Visitors are assigned a stable, anonymous session ID via a long-lived
 * httpOnly cookie named `ak_sid`. The cookie is set the first time a
 * visitor hits the /api/experiment/assign endpoint (which is called on
 * every page that renders an <AbVariant/>), and is read on every
 * subsequent request — both for assignment and for conversion tracking.
 *
 * Why a cookie (and not localStorage)?
 *   - The cookie is sent automatically with every same-site request,
 *     including the very first one. localStorage would require an extra
 *     round-trip (load → read → send in body) and would not be available
 *     to the assignment endpoint on a visitor's first page load.
 *   - httpOnly means client-side JS (and therefore any XSS) cannot read
 *     or steal the session ID — it is opaque to the page.
 *
 * Why 1 year?
 *   - A/B test conversion windows can be long (a visitor might read a
 *     hero variant today and book a session two weeks from now). A
 *     1-year cookie keeps the assignment stable across that window so
 *     the same visitor always sees the same variant — the prerequisite
 *     for valid conversion attribution.
 *
 * The session ID itself is a UUIDv4 (crypto.randomUUID) — collision-free
 * without a database round-trip, and unlinkable to any other identifier
 * (email, IP, fingerprint) on its own.
 */

import { NextRequest, NextResponse } from 'next/server';

/** Cookie name. Public constant so route handlers + middleware agree. */
export const SESSION_COOKIE_NAME = 'ak_sid';

/** 1 year in seconds. Matches the cookie maxAge below. */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, // JS cannot read this — XSS cannot steal it
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // CSRF resistance, but allow top-level navigations
  path: '/',
  maxAge: SESSION_COOKIE_MAX_AGE,
} as const;

/**
 * Read the visitor's existing session ID from the cookie, or generate a
 * new one if none exists. Does NOT set the cookie — that's the caller's
 * responsibility (via {@link setSessionCookie}) because only the route
 * handler returning the response knows when it's safe to write headers.
 *
 * Works in both the Edge runtime (middleware) and the Node.js runtime
 * (route handlers) because `crypto.randomUUID` is globally available in
 * both since Node 19 / Next 13.3.
 */
export function getOrCreateSessionId(request: NextRequest): string {
  const existing = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (existing && existing.length >= 8 && existing.length <= 128) {
    // Sanity-check the length — anything absurd is treated as "no cookie"
    // and re-issued. This keeps a malicious 10KB cookie from being
    // persisted as a session ID.
    return existing;
  }
  // crypto.randomUUID is available globally in Node ≥19 and in Edge.
  return crypto.randomUUID();
}

/**
 * Set the session cookie on a response. Safe to call even if the cookie
 * already exists on the client — the maxAge simply refreshes, which
 * keeps long-term visitors from having their assignment silently
 * expire mid-experiment.
 */
export function setSessionCookie(
  response: NextResponse,
  sessionId: string
): void {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
}
