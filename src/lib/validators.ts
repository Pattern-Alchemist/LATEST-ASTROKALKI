import { z } from 'zod';

/**
 * Slot query parameters for fetching available slots.
 */
export const slotsQuerySchema = z.object({
  duration: z.coerce
    .number()
    .int()
    .refine((val) => [30, 60, 90].includes(val), {
      message: 'Duration must be 30, 60, or 90 minutes',
    })
    .optional()
    .nullable(),
  startDate: z
    .string()
    .datetime()
    .describe('ISO 8601 datetime; defaults to now')
    .optional()
    .nullable(),
  endDate: z
    .string()
    .datetime()
    .describe('ISO 8601 datetime; defaults to now + 30 days')
    .optional()
    .nullable(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50),
}).transform((data) => ({
  ...data,
  duration: data.duration ?? undefined,
  startDate: data.startDate ?? undefined,
  endDate: data.endDate ?? undefined,
}));

export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

/**
 * Create booking request payload.
 */
export const createBookingSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be at most 255 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[+\d\s\-()]+$/.test(val), {
      message: 'Invalid phone number format',
    }),
  duration: z.coerce
    .number()
    .int()
    .refine((val) => [30, 60, 90].includes(val), {
      message: 'Duration must be 30, 60, or 90 minutes',
    }),
  slotId: z.string().optional().describe('Link to specific AvailabilitySlot'),
  birthDate: z.string().optional().describe('YYYY-MM-DD format'),
  birthTime: z.string().optional().describe('HH:MM format'),
  birthPlace: z.string().optional(),
  contexts: z.string().optional().describe('JSON array of emotional context strings'),
  message: z.string().max(1000).optional(),
  referredBy: z.string().optional(),
});

export type CreateBookingRequest = z.infer<typeof createBookingSchema>;

/**
 * Booking slot selection (for slot-based booking).
 */
export const bookSlotSchema = z.object({
  slotId: z
    .string()
    .min(1, 'Slot ID is required')
    .describe('AvailabilitySlot ID to book'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[+\d\s\-()]+$/.test(val)),
  message: z.string().max(1000).optional(),
});

export type BookSlotRequest = z.infer<typeof bookSlotSchema>;

/**
 * LiveKit token generation request.
 */
export const generateLiveKitTokenSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  userId: z
    .string()
    .optional()
    .describe('User ID for token identity; auto-detected if not provided'),
  userRole: z
    .enum(['participant', 'presenter', 'host', 'admin'])
    .default('participant')
    .describe('Role determines permissions in the room'),
});

export type GenerateLiveKitTokenRequest = z.infer<
  typeof generateLiveKitTokenSchema
>;

/**
 * Create LiveKit room request (admin/internal).
 */
export const createLiveKitRoomSchema = z.object({
  bookingId: z.string().min(1),
  roomName: z
    .string()
    .min(3, 'Room name must be at least 3 characters')
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Room name can only contain letters, numbers, - and _'),
  maxParticipants: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(2)
    .describe('Default: 2 (host + client)'),
});

export type CreateLiveKitRoomRequest = z.infer<typeof createLiveKitRoomSchema>;

/**
 * Admin availability slot creation/update.
 */
export const adminSlotSchema = z.object({
  start: z
    .string()
    .datetime('Start must be valid ISO 8601 datetime')
    .describe('Start time in ISO 8601 format'),
  end: z
    .string()
    .datetime('End must be valid ISO 8601 datetime')
    .describe('End time in ISO 8601 format'),
  duration: z.coerce
    .number()
    .int()
    .refine((val) => [30, 60, 90].includes(val))
    .optional()
    .describe('Calculated from start/end if not provided'),
  status: z
    .enum(['open', 'held', 'booked'])
    .default('open')
    .optional(),
});

export type AdminSlotRequest = z.infer<typeof adminSlotSchema>;

/**
 * Validate and parse request body safely.
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
