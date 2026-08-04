import { env } from './config/env';
import { connectDb } from './config/db';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  await connectDb();

  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Assistify API listening on http://localhost:${env.PORT}`);
    // eslint-disable-next-line no-console
    console.log(`   Health: http://localhost:${env.PORT}/api/v1/health`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
