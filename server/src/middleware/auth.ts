import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken } from '../modules/auth/auth.jwt';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';
import type { Role } from '../shared/types';

/**
 * requireAuth — verifies the Bearer access token and populates req.auth.
 * Identity always comes from the verified JWT, never from the request body (D5).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: new Types.ObjectId(payload.userId),
      companyId: new Types.ObjectId(payload.companyId),
      role: payload.role,
    };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }
}

/**
 * requireRole — role gate. Use AFTER requireAuth.
 * Note (team guide §4): role alone is not enough — controllers still enforce
 * per-resource ownership. This only checks the role dimension.
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new UnauthorizedError();
    if (!allowed.includes(req.auth.role)) {
      throw new ForbiddenError('Your role cannot access this resource');
    }
    next();
  };
}
