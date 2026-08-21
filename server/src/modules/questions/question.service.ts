import { QuestionModel } from './question.model';
import { UserModel } from '../users/user.model';
import * as auditService from '../audit/audit.service';
import { scoped } from '../../shared/tenantQuery';
import { toObjectId } from '../../shared/objectId';
import { ConflictError, NotFoundError } from '../../shared/errors';
import type { AuthContext } from '../../shared/types';
import type { AnswerQuestionInput, AskQuestionInput } from './question.schema';

export interface PublicQuestion {
  id: string;
  question: string;
  assistantNote: string | null;
  status: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  /** Present only on the HR queue, where the question belongs to someone else. */
  askedBy?: { id: string; fullName: string; email: string; department: string | null };
  answeredBy?: { fullName: string } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublic(doc: any, includeAsker: boolean): PublicQuestion {
  const asker =
    includeAsker && doc.askedBy && typeof doc.askedBy === 'object' && doc.askedBy.fullName
      ? {
          id: doc.askedBy._id.toString(),
          fullName: doc.askedBy.fullName,
          email: doc.askedBy.email,
          department: doc.askedBy.department ?? null,
        }
      : undefined;

  return {
    id: doc._id.toString(),
    question: doc.question,
    assistantNote: doc.assistantNote ?? null,
    status: doc.status,
    answer: doc.answer ?? null,
    answeredAt: doc.answeredAt ? doc.answeredAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    ...(asker ? { askedBy: asker } : {}),
    ...(doc.answeredBy && typeof doc.answeredBy === 'object' && doc.answeredBy.fullName
      ? { answeredBy: { fullName: doc.answeredBy.fullName } }
      : {}),
  };
}

/**
 * How many unanswered questions one person may have open at once.
 *
 * Not a rate limit against abuse — it is a limit against the assistant being
 * agreeable. Asked three times in a row, a model will happily forward the same
 * question three times, and HR would see three identical rows from one person.
 */
const MAX_OPEN_PER_PERSON = 5;

/** Forward a question to HR. Called by the assistant's tool, on the asker's behalf. */
export async function askQuestion(
  auth: AuthContext,
  input: AskQuestionInput,
): Promise<PublicQuestion> {
  const open = await QuestionModel.countDocuments(
    scoped(auth, { askedBy: auth.userId, status: 'OPEN' }),
  );
  if (open >= MAX_OPEN_PER_PERSON) {
    throw new ConflictError(
      `You already have ${open} questions waiting for HR. Wait for those to be answered before sending another.`,
      'TOO_MANY_OPEN_QUESTIONS',
    );
  }

  // Near-duplicate guard: the same question re-sent while the first is still
  // open is the model being helpful twice, not the person asking twice.
  const existing = await QuestionModel.findOne(
    scoped(auth, {
      askedBy: auth.userId,
      status: 'OPEN',
      question: input.question.trim(),
    }),
  );
  if (existing) return toPublic(existing, false);

  const doc = await QuestionModel.create({
    // ⚠️ Both from the token.
    companyId: auth.companyId,
    askedBy: auth.userId,
    question: input.question.trim(),
    assistantNote: input.assistantNote?.trim() || null,
  });

  return toPublic(doc, false);
}

/** The asker's own questions, newest first. */
export async function listMyQuestions(auth: AuthContext): Promise<PublicQuestion[]> {
  const docs = await QuestionModel.find(scoped(auth, { askedBy: auth.userId }))
    .populate('answeredBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(50);
  return docs.map((d) => toPublic(d, false));
}

/** The whole tenant's queue. Approvers only — gated on the route. */
export async function listCompanyQuestions(
  auth: AuthContext,
  status?: 'OPEN' | 'ANSWERED',
): Promise<PublicQuestion[]> {
  const docs = await QuestionModel.find(scoped(auth, status ? { status } : {}))
    .populate('askedBy', 'fullName email department')
    .populate('answeredBy', 'fullName')
    // Open first, then newest — the queue is a worklist, not a log.
    .sort({ status: 1, createdAt: -1 })
    .limit(100);
  return docs.map((d) => toPublic(d, true));
}

/** Answer one. Approvers only — gated on the route. */
export async function answerQuestion(
  auth: AuthContext,
  questionId: string,
  input: AnswerQuestionInput,
): Promise<PublicQuestion> {
  const doc = await QuestionModel.findOne(
    scoped(auth, { _id: toObjectId(questionId, 'Question') }),
  );
  if (!doc) throw new NotFoundError('Question not found');

  doc.answer = input.answer.trim();
  doc.status = 'ANSWERED';
  doc.answeredBy = auth.userId;
  doc.answeredAt = new Date();
  await doc.save();

  await auditService.record(
    auth,
    'QUESTION_ANSWERED',
    `Answered: "${doc.question.slice(0, 80)}"`,
    { id: doc.askedBy, name: null },
  );

  await doc.populate('askedBy', 'fullName email department');
  await doc.populate('answeredBy', 'fullName');
  return toPublic(doc, true);
}

/** How many are waiting. Used for the badge, so it stays one cheap count. */
export async function countOpenQuestions(auth: AuthContext): Promise<number> {
  return QuestionModel.countDocuments(scoped(auth, { status: 'OPEN' }));
}

/**
 * A one-line description of the asker, for the assistant's confirmation.
 * Kept here so the tool does not reach into the user module itself.
 */
export async function describeAsker(auth: AuthContext): Promise<string> {
  const user = await UserModel.findById(auth.userId).select('fullName');
  return user?.fullName ?? 'You';
}
