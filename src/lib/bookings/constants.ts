/**
 * Shared constants for booking lifecycle, analytics, and email events.
 *
 * Centralises string literals to prevent drift across routes and dashboards.
 */

// ── Booking event types (stored in BookingEvent.type) ──────────────────────
export const BOOKING_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: "payment_intent_succeeded",
  PAYMENT_INTENT_FAILED: "payment_intent_failed",
  BOOKING_CREATED: "booking_created",
  SLOT_MARKED_BOOKED: "slot_marked_booked",
  DAILY_ROOM_CREATED: "daily_room_created",
  CONFIRMATION_EMAIL_SENT: "confirmation_email_sent",
  CONFIRMATION_EMAIL_FAILED: "confirmation_email_failed",
  RESCHEDULED: "rescheduled",
  CANCELLED: "cancelled",
  REFUND_REQUESTED: "refund_requested",
  REFUNDED: "refunded",
} as const;

// ── Booking statuses ──────────────────────────────────────────────────────
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "refunded",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ── Email event types (stored in EmailEvent.type) ─────────────────────────
export const EMAIL_EVENT_TYPES = {
  DELIVERED: "email.delivered",
  OPENED: "email.opened",
  CLICKED: "email.clicked",
  BOUNCED: "email.bounced",
  COMPLAINED: "email.complained",
} as const;

// ── Analytics event taxonomy (Phase 15) ───────────────────────────────────
export const ANALYTICS_EVENTS = {
  LANDING_CTA_CLICKED: "landing_cta_clicked",
  BOOKING_STARTED: "booking_started",
  PAYMENT_METHOD_SELECTED: "payment_method_selected",
  PAYMENT_INTENT_CREATED: "payment_intent_created",
  PAYMENT_COMPLETED: "payment_completed",
  BOOKING_CONFIRMED: "booking_confirmed",
  ROOM_JOIN_CLICKED: "room_join_clicked",
  SESSION_COMPLETED: "session_completed",
  TESTIMONIAL_SUBMITTED: "testimonial_submitted",
  RECOVERY_PROMPT_SHOWN: "recovery_prompt_shown",
} as const;

// ── Funnel stage labels (for admin dashboard) ─────────────────────────────
export const FUNNEL_STAGES = [
  { key: ANALYTICS_EVENTS.BOOKING_STARTED, label: "Booking Started" },
  { key: ANALYTICS_EVENTS.PAYMENT_INTENT_CREATED, label: "Payment Intent Created" },
  { key: ANALYTICS_EVENTS.PAYMENT_COMPLETED, label: "Payment Completed" },
  { key: ANALYTICS_EVENTS.BOOKING_CONFIRMED, label: "Booking Confirmed" },
  { key: ANALYTICS_EVENTS.SESSION_COMPLETED, label: "Session Completed" },
] as const;

// ── Event sources ─────────────────────────────────────────────────────────
export const EVENT_SOURCES = {
  STRIPE_WEBHOOK: "stripe-webhook",
  CONFIRM_BOOKING_ROUTE: "confirm-booking-route",
  ADMIN_UI: "admin-ui",
  SYSTEM: "system",
  CREATE_PAYMENT_INTENT: "create-payment-intent",
} as const;
