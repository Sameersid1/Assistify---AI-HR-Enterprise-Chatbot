import type { GoogleGenAI } from '@google/genai' with { 'resolution-mode': 'import' };
import { env } from '../../config/env';
import { AppError, NotFoundError } from '../../shared/errors';
import { scoped } from '../../shared/tenantQuery';
import { toObjectId } from '../../shared/objectId';
import { DocumentModel, DocumentChunkModel } from './document.model';
import type { AuthContext } from '../../shared/types';
import type { UploadDocumentInput } from './document.schema';

/**
 * Retrieval over company policy documents.
 *
 * Text is split into overlapping passages, each embedded once at upload time.
 * A question is embedded at query time and ranked against them by cosine
 * similarity. The assistant then answers from the passages it is handed, which
 * is what lets it cite a source instead of recalling one.
 */

/** Asymmetric embeddings: documents and queries are embedded for different roles. */
const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Shorter vectors than the model's default.
 *
 * These are Matryoshka embeddings — the leading dimensions carry the most
 * signal, so truncating trades a little accuracy for a quarter of the storage
 * and a quarter of the arithmetic per comparison. At this corpus size the
 * accuracy cost is not observable and the saving keeps whole-tenant scans fast.
 */
const EMBEDDING_DIMENSIONS = 256;

/**
 * Chunking. Passages need to be small enough that a match is specific and large
 * enough to stand alone once separated from the document around it.
 */
const CHUNK_TARGET_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 200;

/** How many passages are handed to the model per question. */
const DEFAULT_TOP_K = 4;

/**
 * Below this, a "match" is the least-bad row rather than a real answer.
 *
 * Cosine similarity always returns a ranking, even for a question the corpus
 * says nothing about — without a floor the assistant would confidently cite the
 * nearest unrelated paragraph. Returning nothing is what lets it say it does
 * not know.
 */
const MIN_SIMILARITY = 0.5;

let client: GoogleGenAI | null = null;

async function getClient(): Promise<GoogleGenAI> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'Document search is not configured on this server (GEMINI_API_KEY is not set).',
    );
  }
  if (!client) {
    const genai = await import('@google/genai');
    client = new genai.GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Split text into overlapping passages, preferring paragraph boundaries.
 *
 * The overlap exists because a sentence answering a question may sit across a
 * split; without it that answer belongs wholly to neither passage and ranks
 * poorly in both.
 */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > CHUNK_TARGET_CHARS) {
      chunks.push(current);
      // Carry the tail of the previous passage into the next one.
      current = current.slice(-CHUNK_OVERLAP_CHARS) + '\n\n' + paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push(current);

  // A single paragraph longer than the target still has to be broken up.
  return chunks.flatMap((chunk) =>
    chunk.length <= CHUNK_TARGET_CHARS * 2
      ? [chunk]
      : (chunk.match(new RegExp(`[\\s\\S]{1,${CHUNK_TARGET_CHARS}}`, 'g')) ?? [chunk]),
  );
}

/** Embed passages for storage. */
async function embedDocuments(texts: string[]): Promise<number[][]> {
  const ai = await getClient();
  const res = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const embeddings = res.embeddings ?? [];
  if (embeddings.length !== texts.length) {
    throw new AppError(502, 'EMBEDDING_FAILED', 'The embedding service returned an unexpected result.');
  }
  return embeddings.map((e) => e.values ?? []);
}

/** Embed a question. A different task type from the passages, deliberately. */
async function embedQuery(text: string): Promise<number[]> {
  const ai = await getClient();
  const res = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [text],
    config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  return res.embeddings?.[0]?.values ?? [];
}

/**
 * Cosine similarity of two equal-length vectors.
 *
 * Normalising by both magnitudes is what makes this a measure of direction
 * rather than length, so a long passage is not favoured over a short one purely
 * for having more words in it.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dot / denominator;
}

export interface PublicDocument {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicDocument(doc: any): PublicDocument {
  return {
    id: doc._id.toString(),
    title: doc.title,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Store a document, chunk it, and embed every passage. */
export async function uploadDocument(
  auth: AuthContext,
  input: UploadDocumentInput,
): Promise<PublicDocument> {
  const chunks = chunkText(input.content);
  if (chunks.length === 0) {
    throw new AppError(400, 'DOCUMENT_EMPTY', 'That document has no readable text in it.');
  }

  // Embed before writing anything. A failure here leaves no half-indexed
  // document behind that would answer questions from a fraction of its content.
  const embeddings = await embedDocuments(chunks);

  const doc = await DocumentModel.create({
    companyId: auth.companyId,
    title: input.title,
    content: input.content,
    chunkCount: chunks.length,
    uploadedBy: auth.userId,
  });

  await DocumentChunkModel.insertMany(
    chunks.map((text, chunkIndex) => ({
      companyId: auth.companyId,
      documentId: doc._id,
      chunkIndex,
      text,
      embedding: embeddings[chunkIndex],
    })),
  );

  return toPublicDocument(doc);
}

export async function listDocuments(auth: AuthContext): Promise<PublicDocument[]> {
  const docs = await DocumentModel.find(scoped(auth)).sort({ createdAt: -1 });
  return docs.map(toPublicDocument);
}

/** Delete a document and every passage indexed from it. */
export async function deleteDocument(auth: AuthContext, documentId: string): Promise<void> {
  const doc = await DocumentModel.findOne(
    scoped(auth, { _id: toObjectId(documentId, 'Document') }),
  );
  if (!doc) throw new NotFoundError('Document not found');

  // Chunks first: an orphaned chunk would keep answering questions from a
  // document the company believes it has deleted.
  await DocumentChunkModel.deleteMany(scoped(auth, { documentId: doc._id }));
  await doc.deleteOne();
}

export interface SearchHit {
  documentTitle: string;
  chunkIndex: number;
  text: string;
  similarity: number;
}

/**
 * Find the passages most relevant to a question, within the caller's tenant.
 *
 * The tenant filter is applied in the database query, before ranking — so one
 * company's policies can never surface in another's answer regardless of how
 * the question is phrased.
 */
export async function searchDocuments(
  auth: AuthContext,
  query: string,
  topK: number = DEFAULT_TOP_K,
): Promise<SearchHit[]> {
  const chunks = await DocumentChunkModel.find(scoped(auth)).populate('documentId', 'title');
  if (chunks.length === 0) return [];

  const queryEmbedding = await embedQuery(query);
  if (queryEmbedding.length === 0) return [];

  return chunks
    .map((chunk) => ({
      documentTitle:
        // populate() replaces the id with the document when it still exists.
        (chunk.documentId as unknown as { title?: string })?.title ?? 'Untitled document',
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((hit) => hit.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
