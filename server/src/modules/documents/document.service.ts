import type { GoogleGenAI } from '@google/genai' with { 'resolution-mode': 'import' };
import { env } from '../../config/env';
import { AppError, NotFoundError } from '../../shared/errors';
import { scoped } from '../../shared/tenantQuery';
import { toObjectId } from '../../shared/objectId';
import { DocumentModel, DocumentChunkModel } from './document.model';
import { UserModel } from '../users/user.model';
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

/**
 * Asymmetric embeddings: documents and queries are embedded for different roles.
 *
 * text-embedding-004 was retired by Google and now returns "not found", which
 * broke document upload and search outright. gemini-embedding-2 replaces it and
 * separates on-topic from off-topic questions more cleanly than
 * gemini-embedding-001 did in the calibration below.
 *
 * Overridable by env for the same reason the chat model is: hosted model names
 * get withdrawn without warning, and the fix should be a variable rather than a
 * redeploy. List what a key can reach with:
 *   curl "https://generativelanguage.googleapis.com/v1beta/models" \
 *     -H "x-goog-api-key: $GEMINI_API_KEY"
 *
 * ⚠️ Changing this invalidates every stored vector. Embeddings from two models
 * are not comparable, so existing documents must be deleted and re-uploaded —
 * and MIN_SIMILARITY below has to be re-measured.
 */
const EMBEDDING_MODEL = env.EMBEDDING_MODEL || 'gemini-embedding-2';

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
 *
 * MEASURED, not guessed. This was 0.5, which turned out to reject nothing at
 * all: against a real leave policy, "what is the office wifi password?" still
 * scored 0.52–0.60. Embedding similarities do not spread across the full 0–1
 * range — unrelated business English sits well above zero — so a floor set by
 * intuition sits below the noise instead of above it.
 *
 * Against the sample policy in docs/sample-data (6 chunks, 256 dimensions):
 *
 *   on-topic questions   best match 0.730 – 0.768
 *   off-topic questions  best match 0.562 – 0.599
 *
 * 0.65 sits in the gap with margin on both sides. Re-measure if the embedding
 * model changes: the number is a property of the model, not of the corpus.
 */
const MIN_SIMILARITY = 0.65;

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

/**
 * How many passages are embedded at once.
 *
 * One request per passage, run a few at a time. The older embedding model
 * accepted an array of texts and returned an array of vectors; the current one
 * folds a multi-text request into a SINGLE vector, so passing six chunks got
 * one embedding back and every upload failed the count check below. Embedding
 * per passage is the only shape that is actually correct, and a small amount of
 * concurrency keeps a long document from taking a request-at-a-time forever
 * without hammering the quota.
 */
const EMBED_CONCURRENCY = 5;

/** Embed passages for storage. Order is preserved — chunk i keeps vector i. */
async function embedDocuments(texts: string[]): Promise<number[][]> {
  const ai = await getClient();
  const vectors: number[][] = new Array(texts.length);

  for (let start = 0; start < texts.length; start += EMBED_CONCURRENCY) {
    const slice = texts.slice(start, start + EMBED_CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (text) => {
        const res = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: [text],
          config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBEDDING_DIMENSIONS },
        });
        return res.embeddings?.[0]?.values ?? [];
      }),
    );
    results.forEach((values, i) => {
      vectors[start + i] = values;
    });
  }

  // A passage with no vector cannot be searched, and storing it would leave a
  // document that silently never matches anything.
  if (vectors.some((v) => !v || v.length !== EMBEDDING_DIMENSIONS)) {
    throw new AppError(502, 'EMBEDDING_FAILED', 'The embedding service returned an unexpected result.');
  }
  return vectors;
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
  /** Empty means the document applies to everyone. */
  audienceEmploymentTypes: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicDocument(doc: any): PublicDocument {
  return {
    id: doc._id.toString(),
    title: doc.title,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
    audienceEmploymentTypes: doc.audienceEmploymentTypes ?? [],
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

  const audienceEmploymentTypes = input.audienceEmploymentTypes ?? [];

  const doc = await DocumentModel.create({
    companyId: auth.companyId,
    title: input.title,
    content: input.content,
    chunkCount: chunks.length,
    uploadedBy: auth.userId,
    audienceEmploymentTypes,
  });

  await DocumentChunkModel.insertMany(
    chunks.map((text, chunkIndex) => ({
      companyId: auth.companyId,
      documentId: doc._id,
      chunkIndex,
      text,
      embedding: embeddings[chunkIndex],
      // Carried onto the chunk so retrieval can filter without a join.
      audienceEmploymentTypes,
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
/**
 * Every passage this caller is allowed to be answered from.
 *
 * ⚠️ THE FILTER BELONGS IN THE QUERY, NOT AFTER THE RANKING.
 *
 * It is tempting to rank everything and drop the passages that do not apply
 * afterwards. That is wrong twice over. A full-time policy passage would still
 * occupy one of the four top-k slots, so an intern asking about leave would
 * silently receive *less* context rather than different context — and the
 * passage would have been loaded and compared regardless, which is the work the
 * filter exists to avoid.
 *
 * The employment type is read from the caller's own record, never from anything
 * the request carried. This is the same rule that makes `scoped()` trustworthy:
 * a caller can phrase a question however they like and still cannot widen the
 * set of documents their assistant can see.
 */
export async function audienceFilter(auth: AuthContext): Promise<Record<string, unknown>> {
  const user = await UserModel.findById(auth.userId).select('employmentType');
  const employmentType = user?.employmentType ?? 'FULL_TIME';

  return {
    $or: [
      // Empty audience means the document applies to everyone.
      { audienceEmploymentTypes: { $size: 0 } },
      { audienceEmploymentTypes: employmentType },
    ],
  };
}

export async function searchDocuments(
  auth: AuthContext,
  query: string,
  topK: number = DEFAULT_TOP_K,
): Promise<SearchHit[]> {
  const chunks = await DocumentChunkModel.find(
    scoped(auth, await audienceFilter(auth)),
  ).populate('documentId', 'title');
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
