import type { Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse';
import { getAuth } from '../../shared/types';
import { AppError } from '../../shared/errors';
import { chatSchema } from './chat.schema';
import * as chatService from './chat.service';

/** POST /api/v1/chat — the whole answer in one response. */
export async function chatController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = chatSchema.parse(req.body);
  const result = await chatService.chat(auth, input);
  sendSuccess(res, result);
}

/**
 * POST /api/v1/chat/stream — the same answer, written out as it is produced.
 *
 * Server-sent events over the POST body rather than EventSource, which is
 * GET-only and cannot carry an Authorization header. The client reads the
 * response stream itself.
 *
 * Errors cannot use the normal error middleware here: by the time the model
 * fails, a 200 and the SSE headers are already on the wire, so a thrown error
 * would leave the client hanging on a dead stream. Every failure is sent as an
 * `error` event instead, and the transport still closes cleanly.
 */
export async function chatStreamController(req: Request, res: Response): Promise<void> {
  const auth = getAuth(req);
  const input = chatSchema.parse(req.body);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    // no-transform stops any proxy from buffering the stream into one lump,
    // which would deliver the whole answer at once and defeat the point.
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Nginx-family proxies (Render's included) need this to stop buffering.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event: chatService.ChatStreamEvent): void => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // If the person closes the tab or hits stop, abandon the upstream request
  // rather than finishing an answer nobody will read.
  // res, NOT req: express.json() has already drained the request body by this
  // point, so req emits 'close' immediately and would abort every stream before
  // it produced a token. res closes only when the client actually goes away.
  const controller = new AbortController();
  res.on('close', () => controller.abort());

  try {
    await chatService.chatStream(auth, input, send, controller.signal);
  } catch (err) {
    const code = err instanceof AppError ? err.code : 'AI_REQUEST_FAILED';
    const message =
      err instanceof AppError ? err.message : 'The assistant could not be reached.';
    send({ type: 'error', code, message });
  } finally {
    if (!res.writableEnded) res.end();
  }
}
