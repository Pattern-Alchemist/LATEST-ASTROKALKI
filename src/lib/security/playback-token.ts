/**
 * Signed-URL playback tokens for RecordedReading audio files.
 *
 * Strategy: HMAC-SHA256 of `${recordingId}:${expires}` using the same secret
 * as the admin auth (ADMIN_SESSION_SECRET → falls back to ADMIN_PASSWORD).
 *
 * Token format: `<base64url(hmac)>.<expires-ms>`
 *
 * Why this works:
 *   - Tokens are issued ONLY by the server (the only place that knows the
 *     secret). A client can't forge one without the secret.
 *   - The recording ID is bound into the HMAC, so a token issued for recording
 *     A cannot be replayed against recording B.
 *   - The expiry timestamp is also bound in, so a token cannot be reused
 *     past its 24-hour window. Tampering with the expiry invalidates the HMAC.
 *
 * Implementation note: uses Web Crypto API (globalThis.crypto.subtle) so the
 * same code works in BOTH the Edge runtime (where middleware runs) AND the
 * Node.js runtime (where route handlers run) — same pattern as
 * /src/lib/security/auth.ts.
 */

const subtle = globalThis.crypto.subtle;

const PLAYBACK_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    '';
  if (!secret) {
    throw new Error(
      'ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) env var must be set to issue playback tokens'
    );
  }
  return secret.padEnd(32, secret);
}

function b64urlEncode(input: Uint8Array | string): string {
  const buf =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buf).toString('base64url');
  }
  // Edge runtime path
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeToBytes(s: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(s, 'base64url'));
  }
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string, usage: ('sign' | 'verify')[]) {
  const keyBytes = new TextEncoder().encode(secret);
  return subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

async function hmacSign(message: string): Promise<string> {
  const key = await importHmacKey(getSecret(), ['sign']);
  const sig = await subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message) as unknown as BufferSource
  );
  return b64urlEncode(new Uint8Array(sig));
}

async function hmacVerify(
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const key = await importHmacKey(getSecret(), ['verify']);
    const sigBytes = b64urlDecodeToBytes(signature);
    return subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      new TextEncoder().encode(message) as unknown as BufferSource
    );
  } catch {
    return false;
  }
}

/**
 * Issue a signed playback token for a specific recording.
 * Token is valid for 24 hours.
 *
 * Returns `{ token, expires }` where `expires` is the unix-ms expiry timestamp.
 * The caller is expected to build a URL of the form:
 *
 *   /api/recordings/<id>?token=<token>&expires=<expires>
 */
export async function createPlaybackToken(
  recordingId: string,
  ttlMs: number = PLAYBACK_TOKEN_TTL_MS
): Promise<{ token: string; expires: number }> {
  const expires = Date.now() + ttlMs;
  const message = `${recordingId}:${expires}`;
  const sig = await hmacSign(message);
  return { token: `${sig}.${expires}`, expires };
}

export interface VerifiedToken {
  ok: boolean;
  expires?: number;
}

/**
 * Verify a playback token against a recording ID.
 *
 * Token format is `<base64url-hmac>.<expires-ms>`. We split on the LAST dot
 * so a tampered expiry can't be smuggled in via the signature segment.
 *
 * Returns `{ ok: true, expires }` only if the HMAC matches AND the token
 * has not expired. Returns `{ ok: false }` on any failure — callers should
 * treat this as a 403.
 */
export async function verifyPlaybackToken(
  recordingId: string,
  token: string | undefined | null
): Promise<VerifiedToken> {
  if (!token || typeof token !== 'string') return { ok: false };
  if (token.length > 2048) return { ok: false };

  const lastDot = token.lastIndexOf('.');
  if (lastDot < 1) return { ok: false };
  const sig = token.slice(0, lastDot);
  const expiresStr = token.slice(lastDot + 1);
  const expires = Number.parseInt(expiresStr, 10);
  if (!Number.isFinite(expires)) return { ok: false };

  // Recompute the HMAC over the same message and verify (constant-time).
  const message = `${recordingId}:${expires}`;
  const sigOk = await hmacVerify(message, sig);
  if (!sigOk) return { ok: false };

  // Check expiry.
  if (expires <= Date.now()) return { ok: false };

  return { ok: true, expires };
}

export const PLAYBACK_TTL_MS = PLAYBACK_TOKEN_TTL_MS;
