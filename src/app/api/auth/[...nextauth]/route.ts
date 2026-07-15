import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * NextAuth route handler — mounts at /api/auth/[...nextauth].
 *
 * This single handler serves every NextAuth action: sign-in, sign-out,
 * callback (magic-link verification), session lookup, and CSRF token.
 *
 * The middleware (/src/middleware.ts) whitelists /api/auth/* from the public
 * POST guards (bot UA, body-size cap, CSRF Origin check) because NextAuth
 * has its own CSRF defense built in (signed CSRF token + SameSite cookies).
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
