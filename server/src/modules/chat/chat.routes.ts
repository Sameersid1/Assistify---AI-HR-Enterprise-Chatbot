import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { chatController } from './chat.controller';

const router = Router();

/**
 * No requireRole here on purpose — everyone gets an assistant, they just get
 * different tools inside it. Which tools a caller's assistant is given is
 * decided from their role in chat.tools.ts.
 */
router.post('/', requireAuth, asyncHandler(chatController));

export default router;
