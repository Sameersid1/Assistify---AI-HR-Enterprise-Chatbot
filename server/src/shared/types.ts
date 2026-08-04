import type { Types } from 'mongoose';
import type { Request } from 'express';

export type Role = 'employee' | 'hr' | 'it_support' | 'admin' | 'super_admin';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DEACTIVATED';

/**
 * The authenticated caller context — FROZEN (M1 guide §Phase-1).
 * Populated by requireAuth from the verified JWT. Everyone depends on this shape.
 *   req.auth = { userId, companyId, role }
 */
export interface AuthContext {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/** Read the auth context in a controller, asserting it was set by requireAuth. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    // This is a programming error (route not wrapped in requireAuth), not a client error.
    throw new Error('getAuth() called on a request without requireAuth middleware');
  }
  return req.auth;
}
