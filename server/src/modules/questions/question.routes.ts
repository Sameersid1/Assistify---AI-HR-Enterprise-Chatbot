import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  answerQuestionController,
  askQuestionController,
  listQuestionsController,
  myQuestionsController,
} from './question.controller';

const router = Router();

/**
 * Answering is an HR act, gated like approving leave and publishing policy.
 * `it_support` is absent for the same reason it is absent there: these
 * questions are about people, and IT has no business in them.
 */
const answerers = requireRole('hr', 'admin', 'super_admin');

// ── Anyone: send a question, read your own ──────────────────────────────────
router.post('/', requireAuth, asyncHandler(askQuestionController));
router.get('/mine', requireAuth, asyncHandler(myQuestionsController));

// ── Approvers: the queue ────────────────────────────────────────────────────
// Declared after /mine so the literal path is not shadowed by this one.
router.get('/', requireAuth, answerers, asyncHandler(listQuestionsController));
router.post('/:id/answer', requireAuth, answerers, asyncHandler(answerQuestionController));

export default router;
