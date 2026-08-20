import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import {
  answerQuestionSchema,
  askQuestionSchema,
  listQuestionsQuerySchema,
} from './question.schema';
import * as questionService from './question.service';

/** POST /api/v1/questions — send a question to HR. */
export async function askQuestionController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = askQuestionSchema.parse(req.body);
  const question = await questionService.askQuestion(auth, input);
  sendSuccess(res, { question }, 201);
}

/** GET /api/v1/questions/mine */
export async function myQuestionsController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const questions = await questionService.listMyQuestions(auth);
  sendSuccess(res, { questions });
}

/** GET /api/v1/questions — the tenant's queue. Approvers only. */
export async function listQuestionsController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const { status } = listQuestionsQuerySchema.parse(req.query);
  const questions = await questionService.listCompanyQuestions(auth, status);
  sendSuccess(res, { questions });
}

/** POST /api/v1/questions/:id/answer — approvers only. */
export async function answerQuestionController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = answerQuestionSchema.parse(req.body);
  const question = await questionService.answerQuestion(auth, req.params.id, input);
  sendSuccess(res, { question });
}
