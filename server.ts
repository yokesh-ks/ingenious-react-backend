import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { database } from './src/config/database';

const PORT = process.env.PORT ?? 3000;

async function bootstrap(): Promise<void> {
  await database.connect();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await database.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((err: Error) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
