import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import leaveRoutes from './modules/leave/leave.routes';
import chatRoutes from './modules/chat/chat.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json());

  // Routes — all under /api/v1
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/leave', leaveRoutes);
  app.use('/api/v1/chat', chatRoutes);

  // 404 + error handler must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
