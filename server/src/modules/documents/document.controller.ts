import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import { searchDocumentsSchema, uploadDocumentSchema } from './document.schema';
import * as documentService from './document.service';

/** POST /api/v1/documents */
export async function uploadDocumentController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = uploadDocumentSchema.parse(req.body);
  const document = await documentService.uploadDocument(auth, input);
  sendSuccess(res, { document }, 201);
}

/** GET /api/v1/documents */
export async function listDocumentsController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const documents = await documentService.listDocuments(auth);
  sendSuccess(res, { documents });
}

/** GET /api/v1/documents/search?q=... */
export async function searchDocumentsController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const { q } = searchDocumentsSchema.parse(req.query);
  const results = await documentService.searchDocuments(auth, q);
  sendSuccess(res, { results });
}

/** DELETE /api/v1/documents/:id */
export async function deleteDocumentController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  await documentService.deleteDocument(auth, req.params.id);
  sendSuccess(res, { deleted: true });
}
