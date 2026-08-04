import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';
import { sendError } from '../shared/apiResponse';
import { isProd } from '../config/env';

/** 404 for any unmatched route. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

/**
 * Global error handler — the last middleware. Catches everything, logs detail
 * server-side, returns the safe { success:false, error:{code,message} } shape.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 400 with a readable message
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    sendError(res, 400, 'VALIDATION_ERROR', message);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // Unknown / unexpected → 500, never leak internals to the client
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isProd ? 'Something went wrong' : String((err as Error)?.message ?? err),
  );
}

/** Wrap async controllers so thrown errors reach errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
