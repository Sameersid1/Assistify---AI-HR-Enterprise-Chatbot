import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * questions — what the assistant could not answer, passed to a person.
 *
 * The assistant refuses honestly when nothing in the corpus covers a question,
 * which is correct but was a dead end: the person heard "contact HR", and HR
 * never learned the question had been asked. Fifteen people could ask about
 * parental leave in a month and the gap would persist for ever.
 *
 * A MESSAGE, NOT A TICKET. There is no category, priority, assignee or reopen
 * path, deliberately. Four things matter — who asked, what they asked, the
 * reply, and whether it has been answered — and every extra field would be a
 * workflow nobody has agreed to operate.
 *
 * Only created when the person says yes. Recording every failed answer would
 * bury HR under "what is the wifi password", and silently logging what people
 * ask an assistant is a decision nobody has made.
 */
const questionSchema = new Schema(
  {
    // ⚠️ From the asker's verified token, never from a request body.
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    askedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    question: { type: String, required: true, trim: true },
    /**
     * What the assistant already told them, so HR answers the gap rather than
     * repeating the refusal the person has already read.
     */
    assistantNote: { type: String, default: null, trim: true },

    status: {
      type: String,
      enum: ['OPEN', 'ANSWERED'],
      default: 'OPEN',
      required: true,
    },

    answer: { type: String, default: null, trim: true },
    answeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The two reads this collection serves: one tenant's open queue, and one
// person's own history.
questionSchema.index({ companyId: 1, status: 1, createdAt: -1 });
questionSchema.index({ companyId: 1, askedBy: 1, createdAt: -1 });

export type CompanyQuestion = InferSchemaType<typeof questionSchema>;
export const QuestionModel = model('Question', questionSchema);
