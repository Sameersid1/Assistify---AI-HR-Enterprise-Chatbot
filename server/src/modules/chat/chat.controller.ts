import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import { chatSchema } from './chat.schema';
import * as chatService from './chat.service';

/** POST /api/v1/chat */
export async function chatController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = chatSchema.parse(req.body);
  const result = await chatService.chat(auth, input);
  sendSuccess(res, result);
}
