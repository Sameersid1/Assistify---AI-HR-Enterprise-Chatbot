import crypto from 'node:crypto';

/**
 * Single-use token utility — shared by invitation AND password reset
 * (M1 guide §Phase-1 step 5).
 *
 * The raw token is a password-equivalent for its lifetime, so we NEVER store it.
 * We hand the raw token to the caller once (to build the activation/reset link)
 * and persist only its SHA-256 hash. On use, we hash the incoming token and
 * compare hashes — exactly like a password.
 */
export interface GeneratedToken {
  raw: string;
  hash: string;
  expiresAt: Date;
}

export function generateToken(ttlMs: number): GeneratedToken {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = hashRawToken(raw);
  const expiresAt = new Date(Date.now() + ttlMs);
  return { raw, hash, expiresAt };
}

export function hashRawToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 72h (survives a weekend)
export const RESET_TTL_MS = 60 * 60 * 1000; // 1h (an immediate action)
