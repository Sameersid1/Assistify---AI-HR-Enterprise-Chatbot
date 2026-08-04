import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  deactivateController,
  inviteController,
  listUsersController,
  reactivateController,
  resendInvitationController,
} from './user.controller';

const router = Router();

// All user-management routes require auth. Only these roles can invite/manage at
// all — the exact target-role whitelist is enforced again in the service (D22).
const managers = requireRole('hr', 'admin', 'super_admin');

router.get('/', requireAuth, managers, asyncHandler(listUsersController));
router.post('/invite', requireAuth, managers, asyncHandler(inviteController));
router.post('/:id/resend-invitation', requireAuth, managers, asyncHandler(resendInvitationController));
router.post('/:id/deactivate', requireAuth, managers, asyncHandler(deactivateController));
router.post('/:id/reactivate', requireAuth, managers, asyncHandler(reactivateController));

export default router;
