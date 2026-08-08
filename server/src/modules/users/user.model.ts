import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * users collection — auth + employment profile merged (no separate `employees`).
 *
 * Onboarding is invitation-based (AUTH-AND-ONBOARDING-FLOW.md): HR/admin creates
 * the record with status INVITED and passwordHash null; the user activates it via
 * a single-use hashed token. There is NO public sign-up.
 */
const userSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    // Identity / login — the work email is the identity and never changes.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },

    /**
     * Where the invitation is delivered. A new hire has no mailbox on the
     * corporate domain until they can sign in, and they cannot sign in until
     * they have followed the invitation — so the link has to reach them
     * somewhere else. Not an identity: nothing authenticates against it, and it
     * is deliberately not unique. Falls back to the work email when absent.
     */
    personalEmail: { type: String, default: null, lowercase: true, trim: true },

    role: {
      type: String,
      enum: ['employee', 'hr', 'it_support', 'admin', 'super_admin'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['INVITED', 'ACTIVE', 'DEACTIVATED'],
      required: true,
      default: 'INVITED',
      index: true,
    },

    // Employment profile
    employeeId: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    dateOfJoining: { type: Date },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    /** IANA zone, chosen by the employee during activation. */
    timezone: { type: String, default: null, trim: true },
    reportingManagerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Credentials
    passwordHash: { type: String, default: null }, // null until activation

    // Invitation (single-use, hashed, 72h)
    invitationTokenHash: { type: String, default: null },
    invitationExpiresAt: { type: Date, default: null },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    activatedAt: { type: Date, default: null },

    // Password reset (single-use, hashed, 1h)
    resetTokenHash: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },

    // Refresh-token rotation: store hashes; cleared on reset / deactivation
    refreshTokenHashes: { type: [String], default: [] },
  },
  { timestamps: true },
);

// A person appears once per company; email is globally unique for login-by-email.
userSchema.index({ companyId: 1, role: 1 });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
