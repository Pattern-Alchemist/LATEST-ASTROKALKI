/**
 * NextAuth configuration for AstroKalki member portal.
 *
 * Strategy: database sessions via Prisma adapter + magic-link email provider.
 *
 * Why magic-link email (not OAuth)?
 *   - The brand promise is "one email, one recognition" — magic-link matches
 *     the editorial, low-friction voice of the site.
 *   - No third-party identity provider dependency (Google/GitHub/etc). AstroKalki
 *     owns the relationship with the member.
 *   - SMTP is already configured via /src/lib/email.ts; we reuse the same
 *     transporter by calling sendEmail() from inside the NextAuth
 *     sendVerificationRequest callback. So we get the branded HTML template
 *     instead of NextAuth's default (unstyled) verification email.
 *
 * The verification request lands in the VerificationToken table (managed by the
 * Prisma adapter), and the user signs in by clicking the link. After successful
 * sign-in, a Session row is created (database strategy) and a signed cookie is
 * set on the browser.
 */

import { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  'http://localhost:3000';

/**
 * Custom verification-request sender.
 *
 * Replaces NextAuth's default (unstyled, plain-text) email with a branded
 * AstroKalki HTML template that matches the dark editorial design system.
 * Uses the existing sendEmail() helper so SMTP configuration is shared with
 * the rest of the app (/api/newsletter, /api/bookings, etc).
 */
async function sendVerificationRequest({
  identifier: email,
  url: magicLink,
  provider,
}: {
  identifier: string;
  url: string;
  provider: { from: string };
  token?: string;
}) {
  const from =
    provider.from ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    'AstroKalki <no-reply@astrokalki.com>';

  const subject = 'Your sign-in link — AstroKalki';

  const text = [
    'A sign-in request was made for your AstroKalki member account.',
    '',
    'Open this link to sign in (it expires in 24 hours):',
    magicLink,
    '',
    'If you did not request this link, you can safely ignore this email —',
    'no account changes were made.',
    '',
    '— AstroKalki',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Sign in — AstroKalki</title>
</head>
<body style="margin:0;padding:0;background:#070707;">
  <div style="background:#070707;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki · Member Portal</p>
    <h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 24px;">Your sign-in link.</h1>
    <p style="font-size:15px;line-height:1.85;color:#9a9a9a;font-weight:300;">
      A sign-in request was made for this email address. Open the link below to enter your member portal. The link expires in 24 hours and can only be used once.
    </p>
    <p style="margin:32px 0;">
      <a href="${magicLink}"
         style="display:inline-block;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#a58a54;border-bottom:1px solid #a58a54;padding-bottom:6px;text-decoration:none;">
        Sign in to AstroKalki →
      </a>
    </p>
    <p style="font-size:13px;line-height:1.8;color:#7a7a7a;font-weight:300;word-break:break-all;">
      If the button does not work, copy and paste this URL into your browser:
      <br/>
      <span style="color:#5a5a5a;">${magicLink}</span>
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/>
    <p style="font-size:12px;color:#5a5a5a;margin:0;font-weight:300;line-height:1.7;">
      If you did not request this link, you can safely ignore this email — no account changes were made.
    </p>
    <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
  </div>
</body>
</html>
  `.trim();

  try {
    await sendEmail({ to: email, subject, text, html, replyTo: from });
  } catch (err) {
    // Re-throw so NextAuth logs it — the user will see a generic error on the
    // sign-in page. The console-fallback in sendEmail() means even without SMTP
    // configured, the link is logged to dev.log and the test flow works.
    console.error('[auth] sendVerificationRequest failed:', err);
    throw new Error('Could not send sign-in email');
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    // Database sessions — persisted in the Session table, revocable by row
    // deletion. JWT strategy would also work but database sessions are a
    // better fit for a membership portal where we want server-side visibility
    // into who is signed in.
    strategy: 'database',
  },
  providers: [
    EmailProvider({
      // Pass SMTP server config so NextAuth's EmailProvider has what it needs
      // for its own internal transport fallback (we override sendVerificationRequest,
      // so this is mostly informational — but harmless and keeps the provider happy).
      server: {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT || 587),
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      from:
        process.env.EMAIL_FROM ||
        process.env.SMTP_USER ||
        'AstroKalki <no-reply@astrokalki.com>',
      sendVerificationRequest,
      // 24 hours — generous enough for a member to find the email in their
      // promotions tab, short enough to limit stale-link attacks.
      maxAge: 60 * 60 * 24,
    }),
  ],
  pages: {
    signIn: '/account',
    signOut: '/account',
    // We don't ship dedicated error/verify pages — /account handles both states.
    error: '/account',
    verifyRequest: '/account',
  },
  callbacks: {
    /**
     * Attach user.id to the session object so server components / route
     * handlers can read it via getServerSession(authOptions).user.id.
     */
    async session({ session, user }) {
      if (session.user) {
        // NextAuth v4 + Prisma adapter: `user` is the database User row.
        (session.user as { id?: string }).id = user.id;
        // Normalize email — already lowercased by the adapter, but be defensive.
        session.user.email = user.email;
        if (user.name) session.user.name = user.name;
      }
      return session;
    },
  },
};

/**
 * Helper: get the absolute URL for a path on this site.
 * Used by sign-in/sign-out redirects inside route handlers. NextAuth reads
 * NEXTAUTH_URL from env automatically — this helper is for our own use.
 */
export function siteUrl(path = ''): string {
  return `${SITE_URL.replace(/\/$/, '')}${path}`;
}
