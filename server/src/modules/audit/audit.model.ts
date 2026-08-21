import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * auditLogs — who did what to whom, and when.
 *
 * WHY AN HR SYSTEM NEEDS THIS AND A TODO APP DOES NOT
 * Every action recorded here is a decision one person made about another: leave
 * approved or refused, an account created or disabled, a policy published. Those
 * decisions have consequences outside the software — pay, time off, access to
 * the building — and "who approved this and when" is a question that gets asked
 * months later, usually when something has gone wrong. Without a record the only
 * honest answer is that nobody knows.
 *
 * WHAT IS DELIBERATELY NOT RECORDED
 * Reads. Someone opening the employee directory writes nothing here. Logging
 * reads would bury the decisions among thousands of page views, and the point of
 * this collection is that every row in it matters.
 *
 * Chat messages are not recorded either. The assistant's *actions* are — leave
 * applied for through chat lands here exactly as it would from the form, because
 * the service layer writes the entry, not the route. What a person typed to the
 * assistant is not stored anywhere, which is a deliberate retention decision.
 *
 * APPEND-ONLY BY CONVENTION
 * Nothing in the codebase updates or deletes these rows. A log that can be
 * edited by the same people it records is not evidence of anything.
 */
const auditLogSchema = new Schema(
  {
    // ⚠️ From the actor's verified token, never from a request body.
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },

    /** Who did it. */
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Copied, not joined: the log must still read correctly if the account is
     *  later renamed or deactivated. An audit trail that changes retroactively
     *  when someone edits their profile is worthless. */
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },

    /** What happened, as a stable machine-readable verb. */
    action: {
      type: String,
      required: true,
      enum: [
        'LEAVE_APPROVED',
        'LEAVE_REJECTED',
        'USER_INVITED',
        'USER_DEACTIVATED',
        'USER_REACTIVATED',
        'DOCUMENT_PUBLISHED',
        'DOCUMENT_DELETED',
        'QUESTION_ANSWERED',
      ],
    },

    /** Who or what it happened to. Null for actions with no second party. */
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetName: { type: String, default: null },

    /** One human-readable sentence, written at the call site where the context
     *  is known. This is what a person actually reads. */
    summary: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// The only read this collection serves: one tenant's trail, newest first.
auditLogSchema.index({ companyId: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model('AuditLog', auditLogSchema);
