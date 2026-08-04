import type { AuthContext } from './types';

/**
 * Tenancy helper (M1 guide §Phase-1, team guide §4).
 *
 * Every Mongoose query must be scoped by the caller's companyId — always, not
 * sometimes. Do not rely on everyone remembering to add it; funnel queries
 * through this so forgetting is hard and grep-able in review.
 *
 *   LeaveRequest.find(scoped(req.auth, { status: 'PENDING' }))
 *
 * companyId comes from the verified JWT — NEVER from the request body.
 */
export function scoped<T extends Record<string, unknown>>(
  auth: AuthContext,
  filter: T = {} as T,
): T & { companyId: AuthContext['companyId'] } {
  return { ...filter, companyId: auth.companyId };
}
