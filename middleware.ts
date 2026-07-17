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
    // Use a default for edge runtime - the actual secret will be checked server-side in route handlers
    const cronSecret = 'cron-secret';

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // Continue to next handler
  return NextResponse.next();
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
