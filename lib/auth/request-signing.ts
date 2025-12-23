/**
 * HMAC Request Signing for Secure API Communication
 *
 * This replaces sending service keys in HTTP headers with signed requests.
 * The signature proves the request came from an authorized source without
 * exposing the secret key.
 *
 * Flow:
 * 1. Runner signs request payload with shared secret
 * 2. API verifies signature using same secret
 * 3. Signature includes timestamp to prevent replay attacks
 *
 * SECURITY NOTES:
 * - Uses deterministic key ordering to prevent JSON.stringify non-determinism
 * - Service key fallback is DEPRECATED and will be removed
 */

import crypto from 'crypto';

// Get the signing secret (same as runner secret for simplicity)
const getSigningSecret = (): string => {
  const secret = process.env.RUNNER_SHARED_SECRET || process.env.API_SIGNING_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('RUNNER_SHARED_SECRET or API_SIGNING_SECRET is required in production');
  }

  return secret || 'dev-secret-only-for-development';
};

/**
 * Recursively sort object keys for deterministic JSON serialization
 * This prevents signature mismatches from JSON.stringify property ordering
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce((sorted: Record<string, unknown>, key: string) => {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      return sorted;
    }, {});
}

/**
 * Create deterministic canonical string for signing
 */
function createCanonicalString(payload: object, timestamp: number): string {
  const sortedPayload = sortObjectKeys({ ...payload, _timestamp: timestamp });
  return JSON.stringify(sortedPayload);
}

/**
 * Sign a request payload with HMAC-SHA256
 * Uses deterministic key ordering to prevent signature mismatches
 *
 * @param payload - The request body to sign
 * @param secret - The shared secret (defaults to env var)
 * @returns Signature string in format: "timestamp.signature"
 */
export function signRequest(payload: object, secret?: string): string {
  const signingSecret = secret || getSigningSecret();
  const timestamp = Date.now();

  // Create canonical string with sorted keys
  const canonicalString = createCanonicalString(payload, timestamp);

  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(canonicalString)
    .digest('hex');

  return `${timestamp}.${signature}`;
}

/**
 * Verify a request signature
 * Uses deterministic key ordering to match the signing process
 *
 * @param payload - The request body that was signed
 * @param signature - The signature from X-Signature header
 * @param secret - The shared secret (defaults to env var)
 * @param maxAgeMs - Maximum age of signature (default 5 minutes)
 * @returns true if signature is valid
 */
export function verifySignature(
  payload: object,
  signature: string,
  secret?: string,
  maxAgeMs: number = 60000 // 60 seconds - reduced from 5 min to limit replay window
): boolean {
  try {
    const signingSecret = secret || getSigningSecret();

    // Parse signature
    const parts = signature.split('.');
    if (parts.length !== 2) {
      console.error('Invalid signature format');
      return false;
    }

    const [timestampStr, hash] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      console.error('Invalid timestamp in signature');
      return false;
    }

    // Check timestamp freshness (prevents replay attacks)
    const age = Date.now() - timestamp;
    if (age > maxAgeMs) {
      console.error(`Signature expired: ${age}ms old (max: ${maxAgeMs}ms)`);
      return false;
    }

    if (age < 0) {
      console.error('Signature timestamp is in the future');
      return false;
    }

    // Recreate the canonical string with sorted keys (matches signing)
    const canonicalString = createCanonicalString(payload, timestamp);

    // Calculate expected signature
    const expected = crypto
      .createHmac('sha256', signingSecret)
      .update(canonicalString)
      .digest('hex');

    // Validate hex format before timing-safe comparison
    // This prevents timing attacks via invalid hex detection
    const hexRegex = /^[0-9a-f]{64}$/i; // SHA-256 produces 64 hex chars
    if (!hexRegex.test(hash) || !hexRegex.test(expected)) {
      return false;
    }

    // Timing-safe comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hash, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Verify request from runner - checks HMAC signature (preferred) or JWT token
 *
 * SECURITY: Service key fallback is BLOCKED in production
 * This prevents the insecure pattern of sending service keys in headers
 *
 * @param authHeader - Authorization header value
 * @param signatureHeader - X-Signature header value
 * @param body - Parsed request body
 * @returns { valid: boolean, runnerId?: string, method: string }
 */
export async function verifyRunnerRequest(
  authHeader: string | null,
  signatureHeader: string | null,
  body: object
): Promise<{ valid: boolean; runnerId?: string; method: 'jwt' | 'hmac' | 'service_key' | 'none' }> {
  // Method 1: HMAC signature (preferred, most secure)
  if (signatureHeader) {
    const isValid = verifySignature(body, signatureHeader);
    if (isValid) {
      return { valid: true, method: 'hmac' };
    }
  }

  // Method 2: JWT token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // SECURITY: Block service role key in production
    // This is the insecure pattern we're deprecating
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && token === serviceRoleKey) {
      if (process.env.NODE_ENV === 'production') {
        // BLOCKED in production - must use HMAC
        console.error('SECURITY: Service role key in Authorization header is BLOCKED in production. Use HMAC signing.');
        return { valid: false, method: 'service_key' };
      }
      // Allow in development only for testing
      console.warn('DEV ONLY: Service role key accepted. This is blocked in production.');
      return { valid: true, method: 'service_key' };
    }

    // Try to verify as JWT
    try {
      const { verifyRunnerToken } = await import('./runner');
      const runnerId = await verifyRunnerToken(token);
      if (runnerId) {
        return { valid: true, runnerId, method: 'jwt' };
      }
    } catch {
      // Not a valid JWT
    }
  }

  return { valid: false, method: 'none' };
}

/**
 * Create headers for a signed request (for use in runner)
 */
export function createSignedRequestHeaders(
  payload: object,
  runnerId?: string
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Signature': signRequest(payload),
    ...(runnerId && { 'X-Runner-ID': runnerId }),
  };
}
