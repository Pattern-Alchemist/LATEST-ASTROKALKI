/**
 * AstroKalki admin authentication.
 *
 * Strategy: single shared password (set via ADMIN_PASSWORD env var) →
 * signed session cookie issued by this server.
 *
 * Why not NextAuth / Auth.js?
 *   - One admin user. No user table. No OAuth. No email flows.
 *   - NextAuth adds ~50kb of dependencies and config for a one-user system.
 *   - A signed cookie achieves the same guarantee with zero new deps.
 *
 * The session cookie contains: { exp: number } and is signed with
 * ADMIN_SESSION_SECRET (falls back to ADMIN_PASSWORD if unset).
 *
 * Token format: base64url(payload).base64url(hmac-sha256(payload))
 *
 * Verification checks:
 *   1. Token parses cleanly
 *   2. HMAC matches (timing-safe compare via Web Crypto verify)
 *   3. exp > now
 *
 * Implementation note: uses Web Crypto API (globalThis.crypto.subtle) instead
 * of Node.js 'crypto' module so the same code works in BOTH the Edge runtime
 * (where middleware runs) AND the Node.js runtime (where route handlers run).
 */

// Web Crypto API — globally available in both Edge and Node.js >= 19.
const subtle = globalThis.crypto.subtle;

const COOKIE_NAME = 'ak_admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
  '';
  if (!secret) {
    throw new Error(
      'ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) env var must be set to use admin auth'
    );
  }
  // Pad to >=32 bytes so the HMAC key is cryptographically reasonable.
  return secret.padEnd(32, secret);
}

function b64urlEncode(input: Uint8Array | string): string {
  const buf =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  // Buffer polyfill exists in Node; btoa exists in Edge. Use Buffer if available
  // (Node), fall back to btoa (Edge).
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buf).toString('base64url');
  }
  // Edge runtime path
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeToString(s: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(s, 'base64url').toString('utf8');
  }
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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
  const sig = await subtle.sign('HMAC', key, new TextEncoder().encode(message) as unknown as BufferSource);
  return b64urlEncode(new Uint8Array(sig));
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  try {
    const key = await importHmacKey(getSecret(), ['verify']);
    const sigBytes = b64urlDecodeToBytes(signature);
    // Web Crypto verify() is constant-time internally.
    return subtle.verify('HMAC', key, sigBytes as unknown as BufferSource, new TextEncoder().encode(message) as unknown as BufferSource);
  } catch {
    return false;
  }
}

/** Issue a signed session token. Async because Web Crypto is async. */
export async function createSessionToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = b64urlEncode(payload);
  const sig = await hmacSign(payloadB64);
  return `${payloadB64}.${sig}`;
}

/**
 * Verify a session token (signature + expiry).
 * Returns true if valid + not expired. Returns false on any failure.
 *
 * Async because Web Crypto verify is async.
 */
export async function isSessionValid(token: string | undefined | null): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  if (token.length > 1024) return false; // sanity cap

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;

  // Verify HMAC signature (constant-time via Web Crypto)
  const sigOk = await hmacVerify(payloadB64, sig);
  if (!sigOk) return false;

  // Check expiry
  try {
    const payload = JSON.parse(b64urlDecodeToString(payloadB64)) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Constant-time password verification.
 * Uses a manual XOR compare (works in both Edge and Node.js runtimes).
 */
export function verifyPassword(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    // Still hash to avoid timing leaks based on length difference.
    // Cheap: just iterate over provided length.
    let acc = 0;
    for (let i = 0; i < provided.length; i++) acc |= provided.charCodeAt(i);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,        // JS cannot read the cookie — XSS cannot steal it
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,  // CSRF resistance
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
} as const;
