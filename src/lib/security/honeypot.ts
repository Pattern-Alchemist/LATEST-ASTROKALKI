/**
 * Honeypot field helper for AstroKalki forms.
 *
 * Pattern: render a hidden input named `website` that real users never see
 * (visually hidden, also labelled "leave empty" for screen readers). Bots
 * that scrape the form and submit junk will typically fill every input —
 * including this one. Server-side, any non-empty value for the honeypot
 * field causes the request to be silently rejected with a 200 OK (to look
 * like success to the bot, so it doesn't retry with a different strategy).
 *
 * This is intentionally a *cheap* signal. It catches drive-by spam bots.
 * It will not stop targeted attackers. The rate limiter + Zod validation
 * are the real defenses.
 */

export const HONEYPOT_FIELD_NAME = 'website';

/**
 * Returns true if the honeypot field was filled — i.e. the request is from
 * a bot. Call this BEFORE doing any DB writes or sending emails.
 */
export function isHoneypotTriggered(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD_NAME];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Returns a fake-but-realistic success response so the bot thinks it won.
 * The shape matches each public endpoint's real success response.
 */
export function honeypotSuccessResponse(endpoint: 'newsletter' | 'bookings' | 'micro-reading' | 'testimonials' | 'lead-magnet') {
  const bodies: Record<typeof endpoint, Record<string, unknown>> = {
    newsletter: { message: 'Subscribed successfully', subscribed: true },
    bookings: {
      booking: { id: 'fake-id', status: 'pending', createdAt: new Date().toISOString() },
    },
    'micro-reading': { reading: { id: 'fake-id' }, pattern: 'The Rescuer Pattern' },
    testimonials: { message: 'Thank you. Your testimonial is awaiting review.' },
    'lead-magnet': { success: true, message: 'Your guide is on its way!', downloadUrl: 'https://astrokalki.com/downloads/pattern-guide.pdf' },
  };
  return bodies[endpoint];
}
