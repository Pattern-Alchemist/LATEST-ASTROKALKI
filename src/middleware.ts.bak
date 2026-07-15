/**
 * AstroKalki global middleware.
 *
 * Responsibilities:
 *   1. Apply security headers to every response (CSP, HSTS, X-Frame-Options, etc.).
 *   2. Guard /admin pages — redirect to /admin/login if no valid session.
 *   3. Guard /api/admin/* — return 401 if no valid session.
 *   4. Block obvious bot patterns (suspicious User-Agents) on POST endpoints.
 *   5. Enforce a body-size cap on POST requests to /api/* (4KB — generous for
 *      our forms, impossible for an exfil payload).
 *
 * What this middleware does NOT do:
 *   - Rate limiting — that lives in the route handlers themselves so they
 *     can use specific rate-limit presets per endpoint.
 *   - Input validation — that's the route handler's job (Zod schemas in
 *      /src/lib/security/validation.ts).
 *   - CSRF tokens — SameSite=Lax cookies + Origin header check (below)
 *      give us CSRF protection for cookie-authenticated requests.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { SECURITY_HEADERS, isSessionValid, ADMIN_COOKIE_NAME } from '@/lib/security';

/* -------------------------------------------------------------------------- */
/*  Config — which paths does this middleware run on?                          */
/* -------------------------------------------------------------------------- */

export const config = {
  // Run on everything except Next.js internals + static asset fingerprints.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|ico|svg|css|js|woff|woff2|ttf|otf)).*)',
  ],
};

/* -------------------------------------------------------------------------- */
/*  Bot detection — cheap, fast, false-positive-averse                         */
/* -------------------------------------------------------------------------- */

const SUSPICIOUS_UA_PATTERNS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-httpx/i,
  /scrapy/i,
  /httpclient/i,
  /go-http-client/i,
  /libwww/i,
  /lwp-/i,
  /nikto/i,
  /sqlmap/i,
  /masscan/i,
  /nmap/i,
  /acunetix/i,
  /nessus/i,
  /burp/i,
  /zap/i,
  /semrushbot/i,    // aggressive SEO scraper — let robots.txt handle it for GET, block POSTs
  /ahrefsbot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
];

function isSuspiciousUserAgent(ua: string | null): boolean {
  if (!ua || ua.trim() === '') return true;  // no UA at all on POST = bot
  return SUSPICIOUS_UA_PATTERNS.some((p) => p.test(ua));
}

/* -------------------------------------------------------------------------- */
/*  Body size cap                                                              */
/* -------------------------------------------------------------------------- */

const MAX_POST_BODY_BYTES = 4 * 1024; // 4 KB — generous for our forms

/* -------------------------------------------------------------------------- */
/*  CSRF — Origin header check for cookie-authenticated requests               */
/*  (AstroKalki has no cookie-auth on public POSTs yet, but /api/admin/*       */
/*  IS cookie-authed — so we must defend it.)                                  */
/* -------------------------------------------------------------------------- */

function isOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients (curl) don't send Origin — auth will catch them

  const allowed = [
    'https://preview-0e79c0ab.space-z.ai',
    'https://astrokalki.com',
    'https://www.astrokalki.com',
  ];
  if (process.env.NODE_ENV !== 'production') {
    allowed.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return allowed.includes(origin);
}

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                 */
/* -------------------------------------------------------------------------- */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  /* ---------------------------------------------------------------------- */
  /*  1. Admin page guard — /admin/* (but NOT /admin/login)                 */
  /* ---------------------------------------------------------------------- */
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await isSessionValid(session))) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  2. Admin API guard — /api/admin/* (except /api/admin/login)           */
  /* ---------------------------------------------------------------------- */
  if (
    pathname.startsWith('/api/admin') &&
    pathname !== '/api/admin/login'
  ) {
    const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await isSessionValid(session))) {
      const res = NextResponse.json(
        { error: 'Unauthorized — admin session required' },
        { status: 401 }
      );
      // Apply security headers even on 401s
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
      return res;
    }

    // CSRF — admin APIs are cookie-authed, so Origin matters
    if (!isOriginAllowed(request)) {
      const res = NextResponse.json(
        { error: 'Forbidden — invalid origin' },
        { status: 403 }
      );
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
      return res;
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  3. Public POST API guards — bot detection + body size + CSRF          */
  /* ---------------------------------------------------------------------- */
  const isPublicPostApi =
    method === 'POST' &&
    (pathname.startsWith('/api/newsletter') ||
      pathname.startsWith('/api/bookings') ||
      pathname.startsWith('/api/micro-reading') ||
      pathname.startsWith('/api/testimonials') ||
      pathname.startsWith('/api/referrals') ||
      pathname.startsWith('/api/slots') ||
      pathname.startsWith('/api/preferences') ||
      pathname.startsWith('/api/ai/chat') ||
      pathname.startsWith('/api/ai/chart') ||
      pathname.startsWith('/api/ai/voice-reading') ||
      pathname.startsWith('/api/ai/portrait') ||
      pathname.startsWith('/api/ai/draft') ||
      pathname.startsWith('/api/ai/social-image') ||
      pathname.startsWith('/api/journal') ||
      pathname.startsWith('/api/email-course') ||
      pathname.startsWith('/api/tts') ||
      pathname.startsWith('/api/birth-chart') ||
      pathname.startsWith('/api/experiment') ||
      pathname.startsWith('/api/reviews'));

  // Paths that bypass all public-POST guards (verified via signature instead)
  const isSignatureVerifiedPost =
    method === 'POST' &&
    (pathname.startsWith('/api/stripe/webhook') ||
      pathname.startsWith('/api/auth/'));

  if (isPublicPostApi) {
    // 3a. Bot User-Agent check
    if (isSuspiciousUserAgent(request.headers.get('user-agent'))) {
      const res = NextResponse.json(
        { error: 'Request blocked' },
        { status: 403 }
      );
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
      return res;
    }

    // 3b. Origin check (CSRF defense — even though these APIs don't currently
    // read cookies, future-proofing: if we add "remember me" later, this is
    // already in place.)
    if (!isOriginAllowed(request)) {
      const res = NextResponse.json(
        { error: 'Forbidden — invalid origin' },
        { status: 403 }
      );
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
      return res;
    }

    // 3c. Content-Length body size cap.
    // We can't read the body here in middleware (Next.js streams it), but we
    // CAN check the Content-Length header. If it's missing or absurdly large,
    // reject early. Route handlers also enforce this on the parsed body.
    // Allow larger payloads for AI endpoints (base64 images/audio) and Stripe webhooks.
    const isLargePayloadPath =
      pathname.startsWith('/api/stripe/webhook') ||
      pathname.startsWith('/api/ai/chart') ||
      pathname.startsWith('/api/ai/voice-reading') ||
      pathname.startsWith('/api/ai/portrait');
    const maxBody = isLargePayloadPath ? 10 * 1024 * 1024 : MAX_POST_BODY_BYTES; // 10MB for AI, 4KB otherwise
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > maxBody) {
      const res = NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
      return res;
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  4. Apply security headers to every response                           */
  /* ---------------------------------------------------------------------- */
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // For API responses, prevent caching
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}
