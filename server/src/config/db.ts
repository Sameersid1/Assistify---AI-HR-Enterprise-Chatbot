import mongoose from 'mongoose';
import { env } from './env';

/**
 * MongoDB connection (Mongoose).
 * Local MongoDB in dev; MongoDB Atlas in production (same driver, only MONGO_URI changes).
 */
export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGO_URI);

  // eslint-disable-next-line no-console
  console.log('✅ MongoDB connected');

  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err);
  });
}

/** For the /health endpoint: 1 = connected. */
export function dbState(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
