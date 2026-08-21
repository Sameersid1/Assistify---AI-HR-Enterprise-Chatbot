import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiLimiter, authLimiter } from './middleware/rateLimit';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import leaveRoutes from './modules/leave/leave.routes';
import chatRoutes from './modules/chat/chat.routes';
import documentRoutes from './modules/documents/document.routes';
import questionRoutes from './modules/questions/question.routes';
import auditRoutes from './modules/audit/audit.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  // Raised from the 100kb default: a pasted policy document can legitimately
  // run to a couple of hundred kilobytes of text, and the default rejects it
  // with a 413 before any of our validation reports something useful.
  app.use(express.json({ limit: '1mb' }));

  // Render sits behind a proxy, so req.ip is the proxy's address unless Express
  // is told to read X-Forwarded-For. Without this every request shares one key
  // and the limits apply to the whole world at once.
  app.set('trust proxy', 1);

  // Backstop for everything. Tighter limits are applied per-route below.
  app.use('/api/v1', apiLimiter);

  // Routes — all under /api/v1
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/leave', leaveRoutes);
  // The assistant's own limiter lives inside chat.routes.ts, applied after
  // requireAuth. It counts per signed-in user, and `req.auth` does not exist
  // until authentication has run — mounted here it silently fell back to
  // counting by IP, so one person hitting the limit locked out everyone behind
  // the same office connection.
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/questions', questionRoutes);
  app.use('/api/v1/audit', auditRoutes);

  // 404 + error handler must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
