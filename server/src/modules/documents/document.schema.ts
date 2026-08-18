import { z } from 'zod';

/**
 * POST /documents
 *
 * Content arrives as text, already extracted from whatever the source was.
 * Doing extraction on the client keeps binary parsing — and its dependencies
 * and failure modes — out of the API, and means a policy pasted from an email
 * is uploaded by exactly the same path as one read from a file.
 */
export const uploadDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Give the document a title').max(200),
  content: z
    .string()
    .trim()
    .min(50, 'That is too short to be a policy document')
    // Roughly 200KB of text. Embedding cost scales with length, and a document
    // this large is almost always a whole handbook that should be split.
    .max(200_000, 'That document is too large — split it into sections'),
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

/** GET /documents/search?q=... */
export const searchDocumentsSchema = z.object({
  q: z.string().trim().min(2, 'Search for something longer than that').max(500),
});
export type SearchDocumentsInput = z.infer<typeof searchDocumentsSchema>;
