import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import {
  activateController,
  loginController,
  logoutController,
  meController,
  refreshController,
  validateInvitationController,
} from './auth.controller';

const router = Router();

// Public (no token)
router.post('/login', asyncHandler(loginController));
router.post('/refresh', asyncHandler(refreshController));
router.get('/invitation/:token', asyncHandler(validateInvitationController));
router.post('/activate', asyncHandler(activateController));

// Authenticated
router.get('/me', requireAuth, asyncHandler(meController));
router.post('/logout', requireAuth, asyncHandler(logoutController));

export default router;
