import type { PrismaClient } from '@cipta/database';
import type { Logger } from 'pino';
import type { StorageClient } from './services/storage.service';
import type { WorkerConfig } from './config';

export interface WorkerContext {
  prisma: PrismaClient;
  storage: StorageClient;
  logger: Logger;
  config: WorkerConfig;
}
