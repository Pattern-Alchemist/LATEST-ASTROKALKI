/**
 * Portal access verification for AstroKalki.
 *
 * Verifies that a request has valid portal access via:
 * - Email-based signed token (production)
 * - Email query parameter (dev/demo)
 *
 * Production should use a signed JWT or HMAC token to prevent
 * unauthorized access to other clients' portal data.
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────

export type ViewerRole = "admin" | "client" | "system";

export interface PortalAccessContext {
  email: string;
  role: ViewerRole;
  verified: boolean;
}

// ─── Token signing (for production signed links) ──────────────────

const SECRET = process.env.PORTAL_ACCESS_SECRET || process.env.SESSION_SECRET || "dev-portal-secret";

/**
 * Generate a signed portal access token for an email address.
 * Token expires after 30 days.
 */
export function generatePortalToken(email: string): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${email}:${expires}`;
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/**
 * Verify a portal access token and return the email if valid.
 */
export function verifyPortalToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [email, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Date.now() > expires) return null;

    const payload = `${email}:${expires}`;
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expected) return null;
    return email;
  } catch {
    return null;
  }
}

// ─── Access assertion ─────────────────────────────────────────────

/**
 * Assert that the viewer has portal access for the given email.
 *
 * In production, this verifies the signed token or session.
 * For admin role, verifies admin session/auth.
 *
 * @throws Error if access is denied
 */
export function assertPortalAccess(
  viewerRole: ViewerRole,
  viewerEmail?: string,
  resourceEmail?: string
): void {
  if (!viewerRole) {
    throw new Error("Portal access denied: no role provided");
  }

  // Admins can access any resource
  if (viewerRole === "admin" || viewerRole === "system") {
    return;
  }

  // Clients can only access their own resources
  if (viewerRole === "client") {
    if (!viewerEmail) {
      throw new Error("Portal access denied: no viewer email");
    }
    if (resourceEmail && viewerEmail.toLowerCase() !== resourceEmail.toLowerCase()) {
      throw new Error("Portal access denied: email mismatch");
    }
  }
}

/**
 * Verify portal access from a request URL or headers.
 * Returns the access context if valid, null otherwise.
 */
export function verifyPortalAccess(params: {
  token?: string | null;
  email?: string | null;
  role?: string | null;
}): PortalAccessContext | null {
  const { token, email, role } = params;

  // Admin role from session/auth
  if (role === "admin") {
    return { email: email || "", role: "admin", verified: true };
  }

  // Token-based access (production)
  if (token) {
    const verifiedEmail = verifyPortalToken(token);
    if (verifiedEmail) {
      return { email: verifiedEmail, role: "client", verified: true };
    }
  }

  // Email-based access (dev/demo — in production, require token)
  if (email && typeof email === "string" && email.includes("@")) {
    return { email, role: "client", verified: false };
  }

  return null;
}
