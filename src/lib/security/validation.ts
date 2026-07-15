/**
 * Zod input schemas for all AstroKalki public APIs.
 *
 * Why centralised?
 *   - One place to audit the contract for every endpoint.
 *   - Reused by both the API route (server) and the form component (client).
 *   - Easy to extend with stricter rules (e.g. disposable-email blocklist).
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                 */
/* -------------------------------------------------------------------------- */

/** Email validation that mirrors WHATWG RFC 5322 reasonable subset. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Email too short')
  .max(254, 'Email too long')
  .email('Invalid email format')
  .refine((e) => !e.endsWith('.con'), 'Did you mean .com?')
  .refine((e) => !e.endsWith('.cm'), 'Did you mean .com?');

/** Reasonable name — letters, spaces, hyphens, apostrophes, dots. 2–80 chars. */
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name too short')
  .max(80, 'Name too long')
  .regex(
    /^[\p{L}\p{M}'’\-.\s]+$/u,
    'Name may only contain letters, spaces, hyphens, and apostrophes'
  );

/** Free-text message — capped to keep DB + email payloads sane. */
export const messageSchema = z
  .string()
  .trim()
  .max(2000, 'Message too long (2000 chars max)')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Phone — permissive; we just want to keep out non-phone-shaped junk. */
export const phoneSchema = z
  .string()
  .trim()
  .max(30, 'Phone too long')
  .regex(/^[0-9+()\-\s]+$/, 'Phone contains invalid characters')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Generic short string — for source, referral, etc. */
export const shortStringSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Honeypot — must be empty for the request to be valid. */
export const honeypotSchema = z
  .string()
  .max(0, 'Honeypot must be empty')
  .optional()
  .or(z.literal('').transform(() => undefined));

/* -------------------------------------------------------------------------- */
/*  Endpoint-specific schemas                                                  */
/* -------------------------------------------------------------------------- */

/** POST /api/newsletter */
export const newsletterInputSchema = z.object({
  email: emailSchema,
  source: shortStringSchema,
  // Honeypot — bots fill this, humans don't see it.
  website: honeypotSchema,
});

/** POST /api/bookings */
export const bookingInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  // Accept both number (30) and string ("30") — clients send either.
  duration: z.union([
    z.literal(30), z.literal(60), z.literal(90),
    z.literal('30'), z.literal('60'), z.literal('90'),
  ]).transform((v) => Number(v)),
  price: z
    .string()
    .max(50, 'Price label too long'),
  // Accept either array or pre-stringified JSON (legacy client behavior).
  contexts: z
    .union([
      z.array(z.string().max(100)).max(10, 'Too many focus areas'),
      z.string().max(2000).transform((s, ctx) => {
        try {
          const parsed = JSON.parse(s);
          if (!Array.isArray(parsed)) {
            ctx.addIssue({ code: 'custom', message: 'contexts must be an array' });
            return z.NEVER;
          }
          return parsed as string[];
        } catch {
          ctx.addIssue({ code: 'custom', message: 'contexts is not valid JSON' });
          return z.NEVER;
        }
      }),
    ])
    .optional(),
  birthDate: z
    .string()
    .max(40)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  birthTime: z
    .string()
    .max(40)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  birthPlace: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  message: messageSchema,
  referredBy: shortStringSchema,
  // Honeypot
  website: honeypotSchema,
});

/** POST /api/micro-reading
 * Contract (matches existing /src/components/astrokalki/micro-reading.tsx):
 *   { email, month (string name), patterns (array), frustration (string) }
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const microReadingInputSchema = z.object({
  email: emailSchema,
  month: z.enum(MONTH_NAMES, {
    message: 'Invalid birth month',
  }),
  patterns: z
    .array(z.string().min(2).max(100))
    .min(1, 'At least one pattern must be selected')
    .max(10, 'Too many patterns'),
  frustration: z.string().min(2).max(200),
  // Honeypot
  website: honeypotSchema,
});

/** POST /api/micro-reading/partial
 * Contract: { email, step (number), partialData (object) }
 */
export const microReadingPartialInputSchema = z.object({
  email: emailSchema,
  step: z.number().int().min(1).max(20),
  partialData: z.record(z.string(), z.unknown()).optional(),
  // Honeypot
  website: honeypotSchema,
});

/**
 * POST /api/testimonials
 *
 * Public submission contract (M2-b moderation flow). Submissions land with
 * status='pending' and are surfaced to /admin/testimonials for moderation.
 * The `email` is used only for moderation reply (never displayed publicly),
 * and `pattern` is an optional taxonomy tag matching the existing pillar
 * article keys.
 */
export const TESTIMONIAL_PATTERNS = [
  'abandonment-loop',
  'control-pattern',
  'people-pleasing',
  'emotional-numbness',
  'overthinking',
  'self-doubt',
  'other',
] as const;

export const testimonialInputSchema = z.object({
  quote: z
    .string()
    .trim()
    .min(10, 'Testimonial too short (min 10 chars)')
    .max(2000, 'Testimonial too long (max 2000 chars)'),
  context: z
    .string()
    .trim()
    .min(3, 'Context too short')
    .max(100, 'Context too long (max 100 chars)'),
  initials: z
    .string()
    .trim()
    .min(2, 'Initials too short')
    .max(20, 'Initials too long (max 20 chars)'),
  email: emailSchema,
  pattern: z
    .enum(TESTIMONIAL_PATTERNS, { message: 'Invalid pattern' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // Honeypot — bots fill this, humans don't see it
  website: honeypotSchema,
});

/** POST /api/admin/login */
export const adminLoginInputSchema = z.object({
  password: z.string().min(1).max(200),
  // Honeypot
  website: honeypotSchema,
});

/* -------------------------------------------------------------------------- */
/*  Helper                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Parses and validates input against a Zod schema.
 * Returns `{ success: true, data }` on success or
 * `{ success: false, error }` with a human-readable first error message.
 */
export function validateInput<T>(
  schema: z.ZodType<T>,
  raw: unknown
):
  | { success: true; data: T }
  | { success: false; error: string; issues: string[] } {
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  const error = issues[0] || 'Invalid input';
  return { success: false, error, issues };
}
