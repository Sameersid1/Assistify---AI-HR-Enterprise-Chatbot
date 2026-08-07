import { z } from 'zod';
import { LEAVE_STATUSES, LEAVE_TYPES } from './leave.model';

/** Calendar date, not an instant — `2026-08-12`. Parsed as UTC midnight. */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)), 'Not a real calendar date');

/**
 * POST /leave/requests
 * NOTE: no userId and no companyId — both come from the JWT (team guide §3,
 * rules 2 and 3). `days` is absent by design: the server computes it, so a
 * client cannot claim a 10-day holiday costs 1 day of balance.
 */
export const applyLeaveSchema = z.object({
  type: z.enum(LEAVE_TYPES),
  fromDate: dateOnly,
  toDate: dateOnly,
  reason: z.string().trim().min(3).max(500),
});
export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

/** POST /leave/requests/:id/reject — a rejection should say why. */
export const rejectLeaveSchema = z.object({
  note: z.string().trim().min(1).max(500),
});
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;

/** POST /leave/requests/:id/approve — an optional note back to the employee. */
export const approveLeaveSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;

/** Query filter shared by the "my requests" and HR queue listings. */
export const listLeaveQuerySchema = z.object({
  status: z.enum(LEAVE_STATUSES).optional(),
  type: z.enum(LEAVE_TYPES).optional(),
});
export type ListLeaveQuery = z.infer<typeof listLeaveQuerySchema>;
