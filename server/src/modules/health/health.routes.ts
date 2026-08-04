import { Router } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { dbState } from '../../config/db';

const router = Router();

/** GET /api/v1/health — liveness + db connectivity. */
router.get('/', (_req, res) => {
  sendSuccess(res, { status: 'ok', db: dbState() });
});

export default router;
