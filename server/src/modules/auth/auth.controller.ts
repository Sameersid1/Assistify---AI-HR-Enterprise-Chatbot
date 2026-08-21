import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import {
  activateSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
} from './auth.schema';
import * as authService from './auth.service';

/** POST /api/v1/auth/login */
export async function loginController(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const { user, tokens } = await authService.login(input);
  sendSuccess(res, { user, ...tokens });
}

/** GET /api/v1/auth/invitation/:token */
export async function validateInvitationController(req: Request, res: Response): Promise<void> {
  const info = await authService.validateInvitation(req.params.token);
  sendSuccess(res, info);
}

/** POST /api/v1/auth/activate */
export async function activateController(req: Request, res: Response): Promise<void> {
  const input = activateSchema.parse(req.body);
  const { user, tokens } = await authService.activate(input);
  sendSuccess(res, { user, ...tokens }, 201);
}

/** POST /api/v1/auth/refresh */
export async function refreshController(req: Request, res: Response): Promise<void> {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await authService.refresh(refreshToken);
  sendSuccess(res, tokens);
}

/** POST /api/v1/auth/logout */
export async function logoutController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  await authService.logout(auth.userId, req.body?.refreshToken);
  sendSuccess(res, { ok: true });
}

/** GET /api/v1/auth/me */
export async function meController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const user = await authService.getMe(auth.userId);
  sendSuccess(res, { user });
}

/**
 * POST /api/v1/auth/forgot-password
 *
 * Always 200, whatever the address. See requestPasswordReset — reporting
 * whether an account exists turns a guess into a target.
 */
export async function forgotPasswordController(req: Request, res: Response): Promise<void> {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(email);
  sendSuccess(res, {
    message: 'If that address has an account, a reset link is on its way.',
  });
}

/** POST /api/v1/auth/reset-password */
export async function resetPasswordController(req: Request, res: Response): Promise<void> {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  sendSuccess(res, { message: 'Password updated. Sign in with your new password.' });
}

/** POST /api/v1/auth/change-password — signed in. */
export async function changePasswordController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(auth.userId, currentPassword, newPassword);
  sendSuccess(res, { message: 'Password changed. Other devices have been signed out.' });
}
