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

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true },
    leavePolicy: { type: leavePolicySchema, required: true, default: () => ({}) },
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
