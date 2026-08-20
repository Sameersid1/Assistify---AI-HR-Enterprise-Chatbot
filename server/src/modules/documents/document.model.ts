import { Schema, model, type InferSchemaType } from 'mongoose';
import { EMPLOYMENT_TYPES } from '../../shared/types';

/**
 * documents + documentChunks — the corpus the assistant answers policy
 * questions from.
 *
 * Two collections rather than one document holding its chunks. A policy of any
 * length would otherwise push a single document toward the 16MB ceiling once
 * every chunk carries an embedding vector, and retrieval reads chunks across
 * all documents anyway — it never wants one document whole.
 */
const documentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    /**
     * The extracted text, kept so a document can be re-chunked later without
     * asking for the file again — chunk size and overlap are tuning decisions
     * we expect to revisit.
     */
    content: { type: String, required: true },
    chunkCount: { type: Number, required: true, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    /**
     * Who this document applies to.
     *
     * EMPTY MEANS EVERYONE. That is the important default: an employee handbook
     * covering ID cards and referrals is the same for an intern and a full-time
     * employee, and most documents are like that. Only leave-style policies that
     * genuinely differ per engagement need a value here.
     *
     * Empty-means-everyone also keeps every document uploaded before this field
     * existed working exactly as it did.
     */
    audienceEmploymentTypes: {
      type: [String],
      enum: EMPLOYMENT_TYPES,
      default: [],
    },
  },
  { timestamps: true },
);

documentSchema.index({ companyId: 1, createdAt: -1 });

/**
 * One embedded passage.
 *
 * `embedding` is a plain array of floats and similarity is computed in the
 * application. At this corpus size — a few policies, a few hundred chunks — a
 * linear scan is microseconds, and it keeps the system on the free database
 * tier with no vector index to provision. A dedicated vector store earns its
 * place at a scale this project does not have.
 */
const documentChunkSchema = new Schema(
  {
    // Indexed below rather than here — declaring it in both places makes
    // Mongoose build the same index twice and warn about it at startup.
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    /** Position in the source document, so retrieved passages can be cited. */
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },

    /**
     * Copied from the parent document at upload.
     *
     * Denormalised on purpose. Retrieval filters by audience and then ranks, and
     * the filter has to happen inside the database query — see the comment in
     * document.service.ts. Reaching the parent document for every chunk would
     * mean a join on the hot path, or filtering after the scan, which is exactly
     * what must not happen.
     *
     * Safe to duplicate because a document's audience cannot change: there is no
     * update endpoint, only upload and delete. If one is ever added, it must
     * rewrite this on every chunk, and that is the whole cost of this decision.
     */
    audienceEmploymentTypes: {
      type: [String],
      enum: EMPLOYMENT_TYPES,
      default: [],
    },
  },
  { timestamps: true },
);

// Retrieval reads one tenant's chunks filtered by audience, then ranks in
// memory. Both fields are in the query, so both belong in the index.
documentChunkSchema.index({ companyId: 1, audienceEmploymentTypes: 1 });

export type CompanyDocument = InferSchemaType<typeof documentSchema>;
export type DocumentChunk = InferSchemaType<typeof documentChunkSchema>;

export const DocumentModel = model('Document', documentSchema);
export const DocumentChunkModel = model('DocumentChunk', documentChunkSchema);
