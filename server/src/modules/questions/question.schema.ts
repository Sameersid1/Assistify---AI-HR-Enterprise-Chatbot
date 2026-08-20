import { z } from 'zod';

/** The assistant forwards a question on the asker's behalf. */
export const askQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, 'That is too short to send to HR')
    .max(1000, 'Shorten the question before sending it'),
  /**
   * What the assistant already told them. Optional, and never required from a
   * human caller — the tool fills it so HR can see the gap rather than repeat
   * the refusal the person has already read.
   */
  assistantNote: z.string().trim().max(1000).optional(),
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const answerQuestionSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(2, 'Write an answer before sending it')
    .max(4000, 'That answer is too long'),
});
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;

/** GET /questions?status=OPEN */
export const listQuestionsQuerySchema = z.object({
  status: z.enum(['OPEN', 'ANSWERED']).optional(),
});
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
