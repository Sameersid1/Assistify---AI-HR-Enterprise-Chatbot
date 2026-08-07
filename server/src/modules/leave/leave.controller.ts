import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import { toObjectId } from '../../shared/objectId';
import {
  applyLeaveSchema,
  approveLeaveSchema,
  listLeaveQuerySchema,
  rejectLeaveSchema,
} from './leave.schema';
import * as leaveService from './leave.service';

/** GET /api/v1/leave/my-balance */
export async function myBalanceController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const balances = await leaveService.getMyBalances(auth);
  sendSuccess(res, { balances });
}

/** POST /api/v1/leave/requests */
export async function applyLeaveController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = applyLeaveSchema.parse(req.body);
  const result = await leaveService.applyForLeave(auth, input);
  sendSuccess(res, result, 201);
}

/** GET /api/v1/leave/my-requests */
export async function myRequestsController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const query = listLeaveQuerySchema.parse(req.query);
  const requests = await leaveService.listMyRequests(auth, query);
  sendSuccess(res, { requests });
}

/** GET /api/v1/leave/requests — HR queue */
export async function listRequestsController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const query = listLeaveQuerySchema.parse(req.query);
  const requests = await leaveService.listCompanyRequests(auth, query);
  sendSuccess(res, { requests });
}

/** POST /api/v1/leave/requests/:id/approve */
export async function approveLeaveController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const { note } = approveLeaveSchema.parse(req.body ?? {});
  const id = toObjectId(req.params.id, 'Leave request');
  const request = await leaveService.approveLeave(auth, id, note);
  sendSuccess(res, { request });
}

/** POST /api/v1/leave/requests/:id/reject */
export async function rejectLeaveController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const { note } = rejectLeaveSchema.parse(req.body);
  const id = toObjectId(req.params.id, 'Leave request');
  const request = await leaveService.rejectLeave(auth, id, note);
  sendSuccess(res, { request });
}

/** POST /api/v1/leave/requests/:id/cancel */
export async function cancelLeaveController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const id = toObjectId(req.params.id, 'Leave request');
  const request = await leaveService.cancelLeave(auth, id);
  sendSuccess(res, { request });
}
