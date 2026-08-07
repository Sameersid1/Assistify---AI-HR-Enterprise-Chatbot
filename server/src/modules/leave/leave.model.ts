import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * leaveBalances + leaveRequests (§8 data model).
 *
 * There is no `leaveTypes` collection: the three types are fixed by
 * `company.leavePolicy` (annual / casual / sick), so a collection whose rows
 * would always be those three names buys nothing. If per-company custom types
 * are ever needed, this enum is the single place that changes.
 */
export const LEAVE_TYPES = ['annual', 'casual', 'sick'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

/**
 * The state machine — deliberately not a boolean (§57).
 *
 *   PENDING ──approve──▶ APPROVED    (pending days become used)
 *      │ ├──reject───▶ REJECTED      (pending days released)
 *      │ └──cancel───▶ CANCELLED     (pending days released; owner only)
 *      └─ every other transition is a 409. Terminal states are terminal.
 */
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/**
 * One row per (user, year, type).
 *
 *   available = allocated - used - pending
 *
 * `pending` is the reservation held by PENDING requests. Reserving on apply —
 * rather than only deducting on approve — is what stops an employee with 2 days
 * left from queueing three separate 2-day requests and having all three approved.
 */
const leaveBalanceSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    year: { type: Number, required: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },

    allocated: { type: Number, required: true, min: 0 },
    used: { type: Number, required: true, default: 0, min: 0 },
    pending: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

// One balance row per user per type per year — also makes provisioning a safe upsert.
leaveBalanceSchema.index({ companyId: 1, userId: 1, year: 1, type: 1 }, { unique: true });

const leaveRequestSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: { type: String, enum: LEAVE_TYPES, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    /** Working days in the range — computed server-side, never taken from the client. */
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },

    status: { type: String, enum: LEAVE_STATUSES, required: true, default: 'PENDING', index: true },

    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null, trim: true },
  },
  { timestamps: true },
);

// Overlap checks read (user, status, date range); the HR queue reads (company, status).
leaveRequestSchema.index({ companyId: 1, userId: 1, status: 1, fromDate: 1 });
leaveRequestSchema.index({ companyId: 1, status: 1, fromDate: -1 });

export type LeaveBalance = InferSchemaType<typeof leaveBalanceSchema>;
export type LeaveRequest = InferSchemaType<typeof leaveRequestSchema>;

export const LeaveBalanceModel = model('LeaveBalance', leaveBalanceSchema);
export const LeaveRequestModel = model('LeaveRequest', leaveRequestSchema);
