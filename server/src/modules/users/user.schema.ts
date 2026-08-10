import { z } from 'zod';

/**
 * POST /users/invite
 * NOTE: there is deliberately NO companyId field — it comes from the inviter's JWT.
 * The role here is the *target* role; whether the actor may create it is enforced
 * in the service (role-creation whitelist, D22).
 */
export const inviteSchema = z.object({
  /** Work email — this is the login identity. */
  email: z.string().email(),
  /**
   * Personal email — where the activation link is delivered, because the new
   * hire cannot read the work inbox until the account exists. Optional: with no
   * personal address the invitation goes to the work address instead.
   */
  personalEmail: z.string().email().optional(),
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(['employee', 'hr', 'it_support', 'admin']),
  employeeId: z.string().max(40).optional(),
  department: z.string().max(80).optional(),
  designation: z.string().max(80).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  // Accept a plain calendar date from a date picker as well as a full timestamp.
  dateOfJoining: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  reportingManagerId: z.string().optional(),
});
export type InviteInput = z.infer<typeof inviteSchema>;
