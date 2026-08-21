import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import {
  activateController,
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
  resetPasswordController,
  validateInvitationController,
} from './auth.controller';

const router = Router();

// Public (no token)
router.post('/login', asyncHandler(loginController));
router.post('/refresh', asyncHandler(refreshController));
router.get('/invitation/:token', asyncHandler(validateInvitationController));
router.post('/activate', asyncHandler(activateController));

// Password reset. Both public — the whole point is that the person cannot
// sign in. The auth rate limiter in app.ts covers this router, so neither is
// a free endpoint to hammer.
router.post('/forgot-password', asyncHandler(forgotPasswordController));
router.post('/reset-password', asyncHandler(resetPasswordController));

// Authenticated
router.get('/me', requireAuth, asyncHandler(meController));
router.post('/logout', requireAuth, asyncHandler(logoutController));
router.post('/change-password', requireAuth, asyncHandler(changePasswordController));

export default router;
