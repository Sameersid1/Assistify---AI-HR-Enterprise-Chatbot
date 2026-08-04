import { z } from 'zod';

/** POST /auth/login */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Password strength rules — shared by activation and (later) reset. */
export const passwordRules = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

/** POST /auth/activate */
export const activateSchema = z.object({
  token: z.string().min(1),
  password: passwordRules,
});
export type ActivateInput = z.infer<typeof activateSchema>;

/** POST /auth/refresh */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
