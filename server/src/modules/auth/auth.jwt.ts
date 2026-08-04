import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env';
import type { Role } from '../../shared/types';

export interface AccessTokenPayload {
  userId: string;
  companyId: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: { userId: string }): string {
  // jti makes every refresh token unique even within the same second, so
  // rotation always changes the stored hash and reuse detection works.
  return jwt.sign(
    { ...payload, jti: crypto.randomBytes(16).toString('hex') },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL } as SignOptions,
  );
}

export function verifyRefreshToken(token: string): { userId: string; jti: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; jti: string };
}

/**
 * We store a HASH of the refresh token on the user (never the raw token),
 * exactly like a password. Same pattern used for invitation/reset tokens.
 */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
