/**
 * Portal DTO shaping for AstroKalki.
 *
 * Transforms raw Prisma models into safe client-facing DTOs.
 * Admin-only fields are stripped. Raw Prisma objects never reach client components.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface PortalBookingDTO {
  id: string;
  name: string;
  duration: number;
  price: string;
  status: string;
  scheduledAt: string | null;
  roomUrl: string | null;
  createdAt: string;
}

export interface PortalBundleDTO {
  id: string;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: string | null;
  status: string;
  bundleProduct: {
    slug: string;
    title: string;
    description: string | null;
  };
}

export interface PortalNoteDTO {
  id: string;
  bookingId: string | null;
  bundlePurchaseId: string | null;
  authorRole: string;
  authorName: string | null;
  noteType: string;
  visibility: string;
  title: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortalBundleDetailDTO {
  id: string;
  email: string;
  bundle: {
    slug: string;
    title: string;
    description: string | null;
  };
  totalSessions: number;
  remainingSessions: number;
  startsAt: string | null;
  expiresAt: string | null;
  status: string;
  sessionsUsed: number;
  bookings: Array<{
    id: string;
    name: string;
    status: string;
    scheduledAt: string | null;
    createdAt: string;
  }>;
}

export interface PortalMeDTO {
  email: string;
  summary: {
    totalBookings: number;
    completedBookings: number;
    activeBundles: number;
  };
  bookings: PortalBookingDTO[];
  bundles: PortalBundleDTO[];
  stripeCustomerId: string | null;
}

// ─── Shape functions ──────────────────────────────────────────────

export function shapeBooking(raw: {
  id: string;
  name: string;
  duration: number;
  price: string;
  status: string;
  scheduledAt: Date | null;
  roomUrl: string | null;
  createdAt: Date;
}): PortalBookingDTO {
  return {
    id: raw.id,
    name: raw.name,
    duration: raw.duration,
    price: raw.price,
    status: raw.status,
    scheduledAt: raw.scheduledAt?.toISOString() || null,
    roomUrl: raw.roomUrl,
    createdAt: raw.createdAt.toISOString(),
  };
}

export function shapeBundle(raw: {
  id: string;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: Date | null;
  status: string;
  bundleProduct: {
    slug: string;
    title: string;
    description: string | null;
  };
}): PortalBundleDTO {
  return {
    id: raw.id,
    totalSessions: raw.totalSessions,
    remainingSessions: raw.remainingSessions,
    expiresAt: raw.expiresAt?.toISOString() || null,
    status: raw.status,
    bundleProduct: raw.bundleProduct,
  };
}

export function shapeNote(raw: {
  id: string;
  bookingId: string | null;
  bundlePurchaseId: string | null;
  authorRole: string;
  authorName: string | null;
  noteType: string;
  visibility: string;
  title: string | null;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorEmail?: string | null;
}, viewerRole: "admin" | "client" | "system"): PortalNoteDTO | null {
  // Strip admin-only notes from client view
  if (viewerRole === "client" && (raw.visibility === "admin" || raw.visibility === "private_session")) {
    return null;
  }

  return {
    id: raw.id,
    bookingId: raw.bookingId,
    bundlePurchaseId: raw.bundlePurchaseId,
    authorRole: raw.authorRole,
    authorName: raw.authorName,
    noteType: raw.noteType,
    visibility: raw.visibility,
    title: raw.title,
    body: raw.body,
    pinned: raw.pinned,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

export function shapeBundleDetail(raw: {
  id: string;
  email: string;
  totalSessions: number;
  remainingSessions: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  status: string;
  bundleProduct: {
    slug: string;
    title: string;
    description: string | null;
  };
  bookings: Array<{
    id: string;
    name: string;
    status: string;
    scheduledAt: Date | null;
    createdAt: Date;
  }>;
}): PortalBundleDetailDTO {
  return {
    id: raw.id,
    email: raw.email,
    bundle: raw.bundleProduct,
    totalSessions: raw.totalSessions,
    remainingSessions: raw.remainingSessions,
    startsAt: raw.startsAt?.toISOString() || null,
    expiresAt: raw.expiresAt?.toISOString() || null,
    status: raw.status,
    sessionsUsed: raw.totalSessions - raw.remainingSessions,
    bookings: raw.bookings.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      scheduledAt: b.scheduledAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
    })),
  };
}
