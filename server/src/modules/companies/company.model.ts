import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * companies collection.
 * Each tenant. Leave-policy defaults are copied onto a user's leave balances
 * at invitation time (the two seeded companies differ deliberately: 18 vs 24).
 */
const leavePolicySchema = new Schema(
  {
    annual: { type: Number, required: true, default: 18 },
    casual: { type: Number, required: true, default: 8 },
    sick: { type: Number, required: true, default: 8 },
  },
  { _id: false },
);

/**
 * Entitlement that differs by how someone is engaged.
 *
 * `leavePolicy` above stays the company default and is what a full-time
 * employee gets. Anything here overrides it for one engagement type; anything
 * absent falls back to the default. Same shape of rule as document audiences —
 * absent means "the ordinary case applies" — so there is one idea to learn
 * rather than two.
 *
 * An intern default ships because the alternative is worse: the assistant would
 * read an intern the intern leave policy from the document corpus, then quote
 * them full-time numbers from this record, and the two would contradict each
 * other in front of the person. A company can overwrite this per tenant.
 */
const employmentOverridesSchema = new Schema(
  {
    INTERN: { type: leavePolicySchema, default: () => ({ annual: 6, casual: 4, sick: 4 }) },
    PART_TIME: { type: leavePolicySchema, default: undefined },
    CONTRACT: { type: leavePolicySchema, default: undefined },
  },
  { _id: false },
);

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true },
    leavePolicy: { type: leavePolicySchema, required: true, default: () => ({}) },
    leavePolicyByEmploymentType: {
      type: employmentOverridesSchema,
      required: true,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true },
);

export type Company = InferSchemaType<typeof companySchema>;
export const CompanyModel = model('Company', companySchema);
