import { Router } from 'express';
import { asyncHandler } from '../../middleware/error';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  deleteDocumentController,
  listDocumentsController,
  searchDocumentsController,
  uploadDocumentController,
} from './document.controller';

const router = Router();

/**
 * Publishing a policy is an HR act, so uploading and deleting are gated the same
 * way inviting staff is. Reading is not: a policy exists to be read by everyone
 * it applies to, and the assistant's search tool goes to every role.
 */
const publishers = requireRole('hr', 'admin', 'super_admin');

router.get('/', requireAuth, asyncHandler(listDocumentsController));
router.get('/search', requireAuth, asyncHandler(searchDocumentsController));
router.post('/', requireAuth, publishers, asyncHandler(uploadDocumentController));
router.delete('/:id', requireAuth, publishers, asyncHandler(deleteDocumentController));

export default router;
