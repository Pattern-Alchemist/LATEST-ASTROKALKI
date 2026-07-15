/**
 * Signed unsubscribe tokens for AstroKalki email preference center.
 *
 * Why a signed token?
 *   - The /unsubscribe page accepts ?email=...&token=...
 *   - Without a signed token, anyone could visit /unsubscribe?email=victim@example.com
 *     and silently opt them out — or worse, change their preferences.
 *   - The token proves the link originated from us (via a genuine email).
 *
 * Token format: base64url(payload).base64url(hmac-sha256(payload))
 *   where payload = JSON.stringify({ email, exp })
 *
 * TTL: 30 days. Long enough for a recipient to find an old email in their
 * archive and click the link; short enough to limit exposure if a link leaks.
 *
 * Implementation: Web Crypto API (works in both Edge and Node.js runtimes,
 * matching the pattern in auth.ts). Reuses ADMIN_PASSWORD as the HMAC secret
 * since the task explicitly forbids adding new env vars.
 */

const subtle = globalThis.crypto.subtle;
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    '';
  if (!secret) {
    throw new Error(
      'ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) env var must be set to issue unsubscribe tokens'
    );
  }
  // Pad to >=32 bytes so the HMAC key is cryptographically reasonable.
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
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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

async function importHmacKey(
  secret: string,
  usage: ('sign' | 'verify')[]
) {
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
    // Web Crypto verify() is constant-time internally.
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
 * Issue a signed unsubscribe token for the given email.
 * Valid for 30 days. The token encodes the email + expiry in the payload, so
 * verification does NOT require a DB lookup — the HMAC signature is enough.
 *
 * Email is normalised to lowercase before signing so case differences in the
 * URL (e.g. mixed-case email from a mail client) don't cause verification
 * failures.
 */
export async function createUnsubscribeToken(
  email: string
): Promise<{ token: string; expires: Date }> {
  const normalizedEmail = email.trim().toLowerCase();
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = JSON.stringify({ email: normalizedEmail, exp });
  const payloadB64 = b64urlEncode(payload);
  const sig = await hmacSign(payloadB64);
  return { token: `${payloadB64}.${sig}`, expires: new Date(exp) };
}

/**
 * Verify a signed unsubscribe token for the given email.
 * Returns true iff:
 *   - the token parses cleanly
 *   - the HMAC signature matches (constant-time via Web Crypto verify)
 *   - exp > now
 *   - the email in the payload matches the supplied email (case-insensitive)
 *
 * Async because Web Crypto verify is async.
 */
export async function verifyUnsubscribeToken(
  email: string,
  token: string
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  if (token.length > 1024) return false; // sanity cap

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;

  const sigOk = await hmacVerify(payloadB64, sig);
  if (!sigOk) return false;

  try {
    const payload = JSON.parse(b64urlDecodeToString(payloadB64)) as {
      email?: string;
      exp?: number;
    };
    if (typeof payload.email !== 'string') return false;
    if (typeof payload.exp !== 'number') return false;
    if (payload.exp <= Date.now()) return false;
    return (
      payload.email.toLowerCase() === email.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}
