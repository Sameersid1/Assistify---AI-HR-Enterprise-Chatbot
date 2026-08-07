import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  applyLeaveController,
  approveLeaveController,
  cancelLeaveController,
  listRequestsController,
  myBalanceController,
  myRequestsController,
  rejectLeaveController,
} from './leave.controller';

const router = Router();

/**
 * Approvers. `it_support` is absent on purpose — §5 says IT must never see
 * leave data, and that boundary is half the RBAC demo.
 */
const approvers = requireRole('hr', 'admin', 'super_admin');

// ── Own leave — any authenticated user, identity from the token ──────────────
router.get('/my-balance', requireAuth, asyncHandler(myBalanceController));
router.get('/my-requests', requireAuth, asyncHandler(myRequestsController));
router.post('/requests', requireAuth, asyncHandler(applyLeaveController));
// Ownership is checked in the service — the applicant cancels, not their role.
router.post('/requests/:id/cancel', requireAuth, asyncHandler(cancelLeaveController));

// ── Approver surface ─────────────────────────────────────────────────────────
router.get('/requests', requireAuth, approvers, asyncHandler(listRequestsController));
router.post('/requests/:id/approve', requireAuth, approvers, asyncHandler(approveLeaveController));
router.post('/requests/:id/reject', requireAuth, approvers, asyncHandler(rejectLeaveController));

export default router;
