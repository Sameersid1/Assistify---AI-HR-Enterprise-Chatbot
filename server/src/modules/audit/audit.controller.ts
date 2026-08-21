import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import * as auditService from './audit.service';

/** GET /api/v1/audit — the tenant's trail. Admins only. */
export async function listAuditController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const logs = await auditService.listAuditLogs(auth);
  sendSuccess(res, { logs });
}
