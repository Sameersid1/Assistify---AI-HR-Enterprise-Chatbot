import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import { activateSchema, loginSchema, refreshSchema } from './auth.schema';
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
