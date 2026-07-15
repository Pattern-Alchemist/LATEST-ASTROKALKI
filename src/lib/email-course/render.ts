/**
 * Render a course day's markdown body into:
 *   - subject  (email subject line, with day prefix for days 2–5)
 *   - html     (inline-styled HTML using the AstroKalki dark + gold template)
 *   - text     (plain-text version for mail clients that don't render HTML)
 *
 * The HTML matches the visual language of /src/lib/email-templates.ts:
 *   - background #070707, text #f0eee9
 *   - gold accent #a58a54 / #c9a96e
 *   - Georgia serif body, italic gold headlines
 *   - one CTA per email (bordered gold button)
 *   - per-recipient signed unsubscribe link in the footer
 *
 * All styles are inline because most email clients strip <style> blocks and
 * ignore external CSS. The wrapper here mirrors EMAIL_WRAPPER in
 * email-templates.ts.
 */

import { COURSE_EMAILS, getCourseEmail, type CourseEmail } from "./content";
import { buildUnsubscribeUrl } from "@/lib/email-templates";

// ─── Minimal inline-styled markdown → HTML ─────────────────────────────────
//
// Handles the subset of markdown we actually use in the course bodies:
//   # H1, ## H2
//   **bold**, *italic*
//   --- (horizontal rule)
//   paragraphs
// We do NOT need lists, blockquotes, or links for the email body — the
// course content is intentionally prose-only with one CTA.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  // Escape first, then re-apply inline markdown
  let out = escapeHtml(text);
  // Bold **...**
  out = out.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="color:#f0eee9;font-weight:400;">$1</strong>'
  );
  // Italic *...* (avoid matching the ** already consumed)
  out = out.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em style=\"font-style:italic;color:#cfcabf;\">$2</em>");
  return out;
}

function renderMarkdownBody(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw;

    if (line.trim() === "") {
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      out.push(
        '<hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;"/>'
      );
      continue;
    }

    // H1 — used as the email's opening headline
    if (line.startsWith("# ")) {
      out.push(
        `<h1 style="font-size:26px;font-weight:300;letter-spacing:-0.02em;line-height:1.25;margin:0 0 28px;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;">${renderInline(
          line.slice(2)
        )}</h1>`
      );
      continue;
    }

    // H2 — section divider
    if (line.startsWith("## ")) {
      out.push(
        `<h2 style="font-size:18px;font-weight:400;letter-spacing:0.01em;line-height:1.3;margin:32px 0 12px;color:#a58a54;font-family:Georgia,'Times New Roman',serif;">${renderInline(
          line.slice(3)
        )}</h2>`
      );
      continue;
    }

    // Paragraph
    out.push(
      `<p style="font-size:15px;line-height:1.85;color:#cfcabf;font-weight:300;margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;">${renderInline(
        line
      )}</p>`
    );
  }

  return out.join("\n");
}

// ─── Plain-text version ─────────────────────────────────────────────────────
//
// Strip markdown to plain prose for the text/plain part of the email. Some
// recipients (and most spam filters) prefer a real text body alongside the
// HTML.

function renderTextBody(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    if (trimmed === "") {
      // preserve paragraph breaks
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    if (trimmed === "---") {
      out.push("");
      out.push("— — —");
      out.push("");
      continue;
    }
    if (trimmed.startsWith("# ")) {
      out.push("");
      out.push(trimmed.slice(2).toUpperCase());
      out.push("");
      continue;
    }
    if (trimmed.startsWith("## ")) {
      out.push("");
      out.push(trimmed.slice(3));
      out.push("");
      continue;
    }
    // strip bold/italic markers
    const cleaned = trimmed
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1$2");
    out.push(cleaned);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── HTML wrapper (matches EMAIL_WRAPPER in email-templates.ts) ─────────────

function wrapHtml(
  day: number,
  email: CourseEmail,
  bodyHtml: string,
  footerNote: string,
  recipientEmail: string
): string {
  const dayLabel = `Day ${day} of 5 — Pattern Recognition Foundations`;
  const preheader = email.preheader;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#070707;">
  <!-- Preheader (hidden when read) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070707;">${escapeHtml(preheader)}</div>
  <div style="background:#070707;color:#f0eee9;font-family:Georgia,'Times New Roman',serif;padding:48px 24px;max-width:560px;margin:0 auto;">
    <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a58a54;margin:0 0 24px;">AstroKalki</p>
    <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#5a5a5a;margin:0 0 32px;font-weight:300;">${escapeHtml(dayLabel)}</p>
    ${bodyHtml}
    <p style="margin-top:36px;">
      <a href="${escapeHtml(email.ctaUrl)}" style="display:inline-block;border:1px solid #a58a54;color:#a58a54;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;padding:14px 28px;text-decoration:none;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(email.ctaText)} →</a>
    </p>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:40px 0 24px;"/>
    <p style="font-size:12px;color:#5a5a5a;margin:0;font-weight:300;line-height:1.7;">${footerNote}</p>
    <p style="font-size:13px;color:#a58a54;margin-top:16px;font-style:italic;">— AstroKalki</p>
    <p style="font-size:10px;color:#3a3a3a;margin-top:24px;font-weight:300;">Sent to ${escapeHtml(recipientEmail)} as part of the free 5-day Pattern Recognition Foundations course.</p>
  </div>
</body>
</html>`;
}

// ─── Footer note builders (mirror email-templates.ts) ───────────────────────

async function buildFooterNoteHtml(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">Manage your email preferences</a> or <a href="${href}" style="color:#5a5a5a;text-decoration:underline;">unsubscribe instantly</a>.`;
  } catch {
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

async function buildFooterText(email: string): Promise<string> {
  try {
    const href = await buildUnsubscribeUrl(email);
    return `We respect your inbox. Manage your email preferences:\n${href}`;
  } catch {
    return `We respect your inbox. Reply to this email with "unsubscribe" to opt out.`;
  }
}

// ─── Public render API ──────────────────────────────────────────────────────

export interface RenderedCourseEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render a specific course day for a specific recipient.
 *
 * @param day   1–5
 * @param email recipient email address (used for the per-recipient
 *              unsubscribe link)
 * @returns     { subject, html, text } or null if the day is out of range
 */
export async function renderCourseEmail(
  day: number,
  email: string
): Promise<RenderedCourseEmail | null> {
  const courseEmail = getCourseEmail(day);
  if (!courseEmail) return null;

  const bodyHtml = renderMarkdownBody(courseEmail.body);
  const bodyText = renderTextBody(courseEmail.body);
  const footerNote = await buildFooterNoteHtml(email);
  const footerText = await buildFooterText(email);

  const subject =
    day === 1
      ? courseEmail.subject
      : `Day ${day}: ${courseEmail.subject}`;

  const html = wrapHtml(day, courseEmail, bodyHtml, footerNote, email);

  const text = [
    `AstroKalki — Pattern Recognition Foundations`,
    `Day ${day} of 5`,
    ``,
    bodyText,
    ``,
    `${courseEmail.ctaText}: ${courseEmail.ctaUrl}`,
    ``,
    `— AstroKalki`,
    ``,
    `Sent to ${email} as part of the free 5-day Pattern Recognition Foundations course.`,
    ``,
    footerText,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Convenience: list all days (used by admin tooling if ever needed).
 */
export function listCourseDays(): CourseEmail[] {
  return COURSE_EMAILS;
}
