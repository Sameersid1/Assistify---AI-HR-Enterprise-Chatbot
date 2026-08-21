import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth } from '../../middleware/auth';
import { chatLimiter } from '../../middleware/rateLimit';
import { chatController, chatStreamController } from './chat.controller';

const router = Router();

/**
 * No requireRole here on purpose — everyone gets an assistant, they just get
 * different tools inside it. Which tools a caller's assistant is given is
 * decided from their role in chat.tools.ts.
 */
router.post('/', requireAuth, chatLimiter, asyncHandler(chatController));

// Same guard, same tools — only the delivery differs. asyncHandler still wraps
// it so a failure *before* the SSE headers go out (a bad body, no API key)
// still reaches the normal error handler as JSON.
router.post('/stream', requireAuth, chatLimiter, asyncHandler(chatStreamController));

export default router;
