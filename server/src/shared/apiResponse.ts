import type { Response } from 'express';

/**
 * Standard response envelope — frozen in Phase 0 (team guide §3).
 *   success: { "success": true, "data": {...} }
 *   error:   { "success": false, "error": { "code", "message" } }
 */
export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
): Response {
  return res.status(status).json({ success: false, error: { code, message } });
}
