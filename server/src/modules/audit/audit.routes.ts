import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listAuditController } from './audit.controller';

const router = Router();

/**
 * Administrators only — not HR.
 *
 * HR appears *in* this log: they approve leave and invite people. Letting the
 * people a record is about decide what it says is the one thing an audit trail
 * must not allow. Reading is separated from being recorded.
 */
router.get('/', requireAuth, requireRole('admin', 'super_admin'), asyncHandler(listAuditController));

export default router;
