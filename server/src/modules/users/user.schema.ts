import { z } from 'zod';

/**
 * POST /users/invite
 * NOTE: there is deliberately NO companyId field — it comes from the inviter's JWT.
 * The role here is the *target* role; whether the actor may create it is enforced
 * in the service (role-creation whitelist, D22).
 */
export const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  role: z.enum(['employee', 'hr', 'it_support', 'admin']),
  employeeId: z.string().max(40).optional(),
  department: z.string().max(80).optional(),
  designation: z.string().max(80).optional(),
  dateOfJoining: z.string().datetime().optional(),
  reportingManagerId: z.string().optional(),
});
export type InviteInput = z.infer<typeof inviteSchema>;
