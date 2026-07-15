/**
 * GET /api/email/preview?template=booking-confirmation&scheduled=1
 *
 * HTML email preview route — renders an email template with sample data and
 * returns the raw HTML with Content-Type: text/html so you can inspect it in
 * the browser exactly as an email client would render it.
 *
 * Query params:
 *   template   — template name (default: "booking-confirmation")
 *   scheduled  — set to "1" to show a variant with a scheduled time
 *   view       — set to "raw" for just the email HTML (no wrapper frame)
 *
 * Usage:
 *   /api/email/preview                              → booking confirmation (no time)
 *   /api/email/preview?template=booking-confirmation → same
 *   /api/email/preview?scheduled=1                  → with scheduled time
 *   /api/email/preview?view=raw                     → raw email HTML only
 */

import { NextRequest } from "next/server";
import { renderBookingConfirmation } from "@/lib/email/booking-confirmation";

// ─── Template registry ───────────────────────────────────────────────────────
// Add new templates here as the email system grows.

type TemplateRenderer = (
  params: Record<string, string>
) => Promise<{ subject: string; html: string; text: string }>;

const templates: Record<string, TemplateRenderer> = {
  "booking-confirmation": async (params) => {
    const hasScheduled = params.scheduled === "1";
    const sampleBooking = {
      id: "cm8abc123def456ghi789",
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      duration: 60,
      price: "₹1,999",
      scheduledAt: hasScheduled ? new Date("2026-07-20T15:00:00+05:30") : null,
    };
    return renderBookingConfirmation(sampleBooking);
  },
};

// ─── Preview wrapper HTML (simulates an email client view) ───────────────────

function previewWrapperHtml(opts: {
  subject: string;
  to: string;
  from: string;
  emailHtml: string;
}): string {
  const { subject, to, from, emailHtml } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Email Preview — ${subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #d0d0d0;
      min-height: 100vh;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0d0d0d;
      border-bottom: 1px solid #2a2a2a;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-label {
      font-size: 11px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #c9a96e;
      font-weight: 600;
    }
    .toolbar-nav {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .toolbar-nav a {
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 4px;
      text-decoration: none;
      color: #9a9a9a;
      border: 1px solid #2a2a2a;
      transition: all 0.15s;
    }
    .toolbar-nav a:hover {
      border-color: #c9a96e;
      color: #f0eee9;
    }
    .toolbar-nav a.active {
      background: #c9a96e;
      color: #0d0d0d;
      border-color: #c9a96e;
    }
    .toolbar-right {
      font-size: 11px;
      color: #5a5a5a;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .toolbar-right a {
      color: #7a7a7a;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .toolbar-right a:hover {
      color: #c9a96e;
    }
    /* ─── Email header mock (From / To / Subject banner) ─── */
    .email-header {
      max-width: 640px;
      margin: 0 auto;
      padding: 20px 24px 12px;
    }
    .email-header-row {
      display: flex;
      gap: 8px;
      font-size: 13px;
      line-height: 1.7;
    }
    .email-header-label {
      color: #5a5a5a;
      min-width: 64px;
      flex-shrink: 0;
    }
    .email-header-value {
      color: #b0b0b0;
      word-break: break-all;
    }
    .email-header-value.subject {
      color: #f0eee9;
      font-weight: 500;
    }
    .email-body {
      max-width: 640px;
      margin: 12px auto 48px;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    .email-body iframe {
      width: 100%;
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <!-- ─── Sticky toolbar ──────────────────────────────────────── -->
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="toolbar-label">📬 Email Preview</span>
      <nav class="toolbar-nav">
        <a href="/api/email/preview?template=booking-confirmation" id="nav-booking-confirmation" class="active">Booking Confirmation</a>
        <a href="/api/email/preview?template=booking-confirmation&scheduled=1" id="nav-scheduled">+ Scheduled</a>
      </nav>
    </div>
    <div class="toolbar-right">
      <a href="/api/email/preview?template=booking-confirmation&view=raw" target="_blank" rel="noopener">Raw HTML ↗</a>
      <span>|</span>
      <span>${subject.length > 50 ? subject.slice(0, 50) + "…" : subject}</span>
    </div>
  </div>

  <!-- ─── Email header (simulated envelope) ──────────────────── -->
  <div class="email-header">
    <div class="email-header-row">
      <span class="email-header-label">From</span>
      <span class="email-header-value">${from}</span>
    </div>
    <div class="email-header-row">
      <span class="email-header-label">To</span>
      <span class="email-header-value">${to}</span>
    </div>
    <div class="email-header-row">
      <span class="email-header-label">Subject</span>
      <span class="email-header-value subject">${subject}</span>
    </div>
  </div>

  <!-- ─── Email body in an iframe (preserves email CSS scope) ── -->
  <div class="email-body">
    <iframe
      srcdoc="${escapeIframeSrcDoc(emailHtml)}"
      title="Email preview"
      sandbox="allow-same-origin"
      onload="this.style.height=this.contentWindow.document.documentElement.scrollHeight + 'px'"
    ></iframe>
  </div>
  <script>
    // Highlight active nav link (order-independent query param comparison)
    (function() {
      var current = new URLSearchParams(location.search);
      document.querySelectorAll('.toolbar-nav a').forEach(function(a) {
        var aParams = new URLSearchParams(new URL(a.href).search);
        var match = true;
        // Check that every param on the link matches the current page
        aParams.forEach(function(v, k) {
          if (current.get(k) !== v) match = false;
        });
        if (match) {
          document.querySelectorAll('.toolbar-nav a').forEach(function(x) { x.classList.remove('active'); });
          a.classList.add('active');
        }
      });
    })();
  </script>
</body>
</html>`;
}

function escapeIframeSrcDoc(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "&#10;");
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") || "booking-confirmation";
  const view = searchParams.get("view") || "wrapper";

  const renderer = templates[template];
  if (!renderer) {
    return new Response(
      `Unknown template "${template}". Available: ${Object.keys(templates).join(", ")}`,
      { status: 404 }
    );
  }

  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "template" && key !== "view") {
      params[key] = value;
    }
  });

  const { subject, html } = await renderer(params);

  if (view === "raw") {
    // Return just the email HTML — useful for testing in Litmus/Email on Acid
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Default: wrap in a browser preview frame
  const from = process.env.EMAIL_FROM || "AstroKalki <hello@astrokalki.com>";
  const to = params.email || "priya.sharma@example.com";

  const wrapperHtml = previewWrapperHtml({
    subject,
    to,
    from,
    emailHtml: html,
  });

  return new Response(wrapperHtml, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
