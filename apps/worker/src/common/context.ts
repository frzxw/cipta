import { PrismaClient } from '@cipta/database';
import type { Logger } from 'pino';

export interface WorkerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  tempDir: string;
  storageProvider: 's3' | 'gcs' | 'local';
}

export interface WorkerContext {
  prisma: PrismaClient;
  logger: Logger;
  config: WorkerConfig;
}
