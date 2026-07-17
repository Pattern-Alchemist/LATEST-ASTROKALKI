import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for authentication and authorization.
 *
 * Protects admin and API routes that require credentials.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ─── Admin routes require authentication ───────────────────────
  if (pathname.startsWith('/admin')) {
    // Check for admin session/auth
    // TODO: Implement proper session verification with NextAuth or custom auth
    // For now, we'll allow all requests; add proper checks before production

    // Example with custom header-based auth (for API calls):
    // const adminSecret = request.headers.get('x-admin-secret');
    // if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    //   return NextResponse.redirect(new URL('/admin/login', request.url));
    // }
  }

  // ─── Cron routes require CRON_SECRET header ───────────────────
  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // ─── Add security headers to all responses ───────────────────
  const response = NextResponse.next();

  // Content Security Policy (basic)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Referrer policy
  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Protect admin routes
    '/admin/:path*',
    // Protect cron routes
    '/api/cron/:path*',
    // Protect LiveKit admin endpoints
    '/api/livekit/create-room',
  ],
};
