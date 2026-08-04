import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import { inviteSchema } from './user.schema';
import * as userService from './user.service';

/** POST /api/v1/users/invite */
export async function inviteController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = inviteSchema.parse(req.body);
  const result = await userService.inviteUser(auth, input);
  sendSuccess(res, result, 201);
}

/** POST /api/v1/users/:id/resend-invitation */
export async function resendInvitationController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const result = await userService.resendInvitation(auth, req.params.id);
  sendSuccess(res, result);
}

/** POST /api/v1/users/:id/deactivate */
export async function deactivateController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const user = await userService.deactivateUser(auth, req.params.id);
  sendSuccess(res, { user });
}

/** POST /api/v1/users/:id/reactivate */
export async function reactivateController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const user = await userService.reactivateUser(auth, req.params.id);
  sendSuccess(res, { user });
}

/** GET /api/v1/users */
export async function listUsersController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const users = await userService.listUsers(auth);
  sendSuccess(res, { users });
}
