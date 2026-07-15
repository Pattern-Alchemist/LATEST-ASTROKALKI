/**
 * Email Templates
 * 
 * Pre-designed HTML email templates for all communications
 */

/**
 * Email Templates
 *
 * Pre-designed HTML email templates for all communications.
 * Rendered inline (no external dependencies).
 *
 * All templates use the AstroKalki brand style:
 *   - Dark bg #070707, gold #a58a54 / #c9a96e, Georgia serif
 *   - 560px max-width, editorial spacing
 *   - Second-person ("you"), never first-person plural ("we")
 *   - Psychological specificity, not mystical abstraction
 *   - One idea per email. Long paragraphs are forbidden.
 *   - Every email ends with one CTA — never multiple.
 */

import { buildUnsubscribeUrl } from "@/lib/email-templates";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://astrokalki.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function buildFooterNote(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">Manage your email preferences</a> or <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">unsubscribe instantly</a>.`;
  } catch {
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

/**
 * Brand email wrapper used by every template.
 */
function wrapBody(bodyHtml: string, footerNote: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>AstroKalki</title>
</head>
<body style="margin:0;padding:0;background:#070707;">
  <div style="background:#070707;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/>
    <p style="font-size:12px;color:#5a5a5a;margin:0;font-weight:300;line-height:1.7;">${footerNote}</p>
    <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
  </div>
</body>
</html>`;
}

export const emailTemplates = {
  // ── Lead Magnet Confirmation ────────────────────────────────────────────
  leadMagnetConfirmation: (userName: string, magnetTitle: string, downloadLink: string) => ({
    subject: `Your ${magnetTitle} is ready`,
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #f0eee9; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #333;">
            <tr>
              <td style="padding: 40px; text-align: center;">
                <h2 style="color: #c9a96e; margin: 0 0 20px 0;">Your Pattern Guide Awaits</h2>
                <p style="color: #888; margin: 0 0 30px 0;">Hi ${userName},</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px;">
                <p style="line-height: 1.6; color: #bbb; margin: 0 0 20px 0;">
                  Your <strong style="color: #c9a96e;">${magnetTitle}</strong> is ready to download. This resource reveals the patterns you've been living through — but couldn&apos;t see because you were inside them.
                </p>
                <p style="line-height: 1.6; color: #bbb; margin: 0 0 30px 0;">
                  Once you see the pattern, you can finally break it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 30px 40px; text-align: center;">
                <a href="${downloadLink}" style="display: inline-block; background: #c9a96e; color: #0a0a0a; padding: 12px 32px; text-decoration: none; font-weight: 600; letter-spacing: 0.05em; border-radius: 2px;">
                  Download Now
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 40px 40px; border-top: 1px solid #333; margin-top: 20px;">
                <p style="color: #666; font-size: 12px; margin: 20px 0 0 0;">
                  This is the beginning. In your inbox tomorrow: the 5-day Pattern Recognition course. Every email builds on this one.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),

  // ── Email Course Day 1 ─────────────────────────────────────────────────
  emailCourseDay1: (userName: string) => ({
    subject: 'Day 1: The Pattern You Keep Living',
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #f0eee9; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #333;">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);">
                <p style="color: #c9a96e; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; margin: 0 0 20px 0;">Day 1 of 5</p>
                <h2 style="color: #f0eee9; margin: 0; font-size: 28px; line-height: 1.2;">The Pattern You Keep Living</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <p style="line-height: 1.8; color: #ccc; margin: 0 0 20px 0;">
                  Hi ${userName},
                </p>
                <p style="line-height: 1.8; color: #ccc; margin: 0 0 20px 0;">
                  You have a pattern.
                </p>
                <p style="line-height: 1.8; color: #ccc; margin: 0 0 20px 0;">
                  The same crisis. Different face. Same choice. Different name. Same outcome. The pattern is so consistent, it cannot be luck. It is the architecture beneath your life.
                </p>
                <p style="line-height: 1.8; color: #ccc; margin: 0 0 20px 0;">
                  <strong style="color: #c9a96e;">Your astrology chart doesn&apos;t predict this pattern.</strong> It reveals it.
                </p>
                <p style="line-height: 1.8; color: #ccc; margin: 0 0 30px 0;">
                  Tomorrow, we decode what the pattern wants from you.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 40px 40px; text-align: center;">
                <a href="https://astrokalki.com/ask-astrokalki" style="display: inline-block; background: #c9a96e; color: #0a0a0a; padding: 12px 32px; text-decoration: none; font-weight: 600; letter-spacing: 0.05em; border-radius: 2px;">
                  Ask AstroKalki
                </a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),

  // ── Session Confirmation ───────────────────────────────────────────────
  sessionConfirmation: (userName: string, sessionType: string, datetime: string, meetLink: string) => ({
    subject: `Your ${sessionType} Session is Confirmed`,
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #f0eee9; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #333;">
            <tr>
              <td style="padding: 40px; text-align: center;">
                <h2 style="color: #c9a96e; margin: 0 0 20px 0;">Session Confirmed</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px;">
                <p style="color: #bbb; margin: 0 0 15px 0;">
                  <strong>Session Type:</strong> ${sessionType}
                </p>
                <p style="color: #bbb; margin: 0 0 15px 0;">
                  <strong>Date & Time:</strong> ${datetime}
                </p>
                <p style="color: #bbb; margin: 0 0 30px 0;">
                  <strong>Your birth details are saved.</strong> Come ready with the question you've been avoiding.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 30px 40px; text-align: center;">
                <a href="${meetLink}" style="display: inline-block; background: #c9a96e; color: #0a0a0a; padding: 12px 32px; text-decoration: none; font-weight: 600; letter-spacing: 0.05em; border-radius: 2px;">
                  Join Session
                </a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),

  // ── Post-Session Recap ─────────────────────────────────────────────────
  postSessionRecap: (userName: string, recap: string) => ({
    subject: 'Your Session Patterns — Now What?',
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #f0eee9; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #333;">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);">
                <h2 style="color: #f0eee9; margin: 0; font-size: 24px; line-height: 1.2;">What We Saw Today</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px; color: #ccc; line-height: 1.8;">
                ${recap}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 40px 40px; text-align: center;">
                <a href="https://astrokalki.com/journal" style="display: inline-block; background: #c9a96e; color: #0a0a0a; padding: 12px 32px; text-decoration: none; font-weight: 600; letter-spacing: 0.05em; border-radius: 2px;">
                  Start Your Journal
                </a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),

  // ── Post-Session Journey Templates ────────────────────────────────────
  // These use journey-email-content.ts as single source of truth for body text
  // and wrapBody for consistent brand styling.
  journeySessionThankyou: async (userName: string, portalUrl: string) => ({
    subject: "Your session — what comes next",
    html: wrapBody(`
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">Your session — what comes next</h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">Thank you for completing your session. Your patterns are worth understanding — and the work you've started here matters.</p>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">Your portal is ready, where you can revisit your session details, track your journey, and connect with notes from your reading.</p>
      <div style="margin-top:32px;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">Open Your Portal</a></div>
    `, await buildFooterNote(userName)),
    text: `Your session — what comes next\n\nThank you for completing your session. Your patterns are worth understanding — and the work you've started here matters.\n\nYour portal is ready: ${portalUrl}\n\n— AstroKalki`,
  }),

  journeyReflectionPrompt: async (userName: string, portalUrl: string) => ({
    subject: "One pattern to sit with this week",
    html: wrapBody(`
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">One pattern to sit with this week</h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">It's been a couple of days since your session. Sometimes the patterns we discussed become clearer with a bit of distance.</p>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">Take a moment to reflect — what's one thing that shifted, even slightly? You can add a reflection note in your portal to track your progress.</p>
      <div style="margin-top:32px;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">Add a Reflection</a></div>
    `, await buildFooterNote(userName)),
    text: `One pattern to sit with this week\n\nIt's been a couple of days since your session. Sometimes the patterns we discussed become clearer with a bit of distance.\n\nAdd a reflection: ${portalUrl}\n\n— AstroKalki`,
  }),

  journeyNextStepGuidance: async (userName: string, portalUrl: string) => ({
    subject: "Continuing your pattern work",
    html: wrapBody(`
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">Continuing your pattern work</h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">You've had some time to sit with your patterns. If you're ready to go deeper, your portal has everything you need to book your next session.</p>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">There's no rush — the patterns will wait for you.</p>
      <div style="margin-top:32px;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">Open Your Portal</a></div>
    `, await buildFooterNote(userName)),
    text: `Continuing your pattern work\n\nYou've had some time to sit with your patterns. If you're ready to go deeper, your portal has everything you need.\n\nOpen your portal: ${portalUrl}\n\n— AstroKalki`,
  }),

  journeyBundleOffer: async (userName: string, portalUrl: string) => ({
    subject: "Continue your journey — session packs",
    html: wrapBody(`
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">Continue your journey — session packs</h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">If you've found value in your session, a session pack lets you continue the work at a pace that fits your life.</p>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">Bundles are available in your portal, with sessions valid for up to 3 months.</p>
      <div style="margin-top:32px;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">View Session Packs</a></div>
    `, await buildFooterNote(userName)),
    text: `Continue your journey — session packs\n\nIf you've found value in your session, a session pack lets you continue the work.\n\nView packs: ${portalUrl}\n\n— AstroKalki`,
  }),

  journeyInactiveRecovery: async (userName: string, portalUrl: string) => ({
    subject: "We're thinking of you",
    html: wrapBody(`
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">We're thinking of you</h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">It's been a while since your last session. Your patterns are still there, and your portal is always available when you're ready to continue.</p>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">No pressure — just a reminder that the door is open.</p>
      <div style="margin-top:32px;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">Open Your Portal</a></div>
    `, await buildFooterNote(userName)),
    text: `We're thinking of you\n\nIt's been a while since your last session. Your portal is always available when you're ready.\n\nOpen your portal: ${portalUrl}\n\n— AstroKalki`,
  }),

  journeyBundleReminder: async (userName: string, portalUrl: string) => ({
    subject: "Your session pack is waiting",
    html: wrapBody(`
      <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1.2;margin:0 0 24px;">Your session pack is waiting</h1>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;">You have a session pack with remaining sessions. Each session builds on the last — the patterns become clearer with continuity.</p>
      <p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin-top:16px;">When you're ready, your portal has everything you need to book your next session.</p>
      <div style="margin-top:32px;"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#070707;text-decoration:none;font-size:14px;letter-spacing:0.05em;border-radius:4px;">Book Next Session</a></div>
    `, await buildFooterNote(userName)),
    text: `Your session pack is waiting\n\nYou have a session pack with remaining sessions. Each session builds on the last.\n\nBook your next session: ${portalUrl}\n\n— AstroKalki`,
  }),

  // ── Generic Newsletter ─────────────────────────────────────────────────
  newsletter: (subject: string, content: string) => ({
    subject,
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #f0eee9; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #333;">
            <tr>
              <td style="padding: 40px; border-bottom: 1px solid #333;">
                <h1 style="color: #c9a96e; margin: 0; font-size: 24px;">${subject}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px; color: #ccc; line-height: 1.8;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding: 40px; text-align: center; border-top: 1px solid #333; color: #666; font-size: 12px;">
                <p style="margin: 0;">
                  <a href="https://astrokalki.com/unsubscribe" style="color: #c9a96e; text-decoration: none;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),
};
