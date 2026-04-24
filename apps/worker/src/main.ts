import { PrismaClient } from '@cipta/database';
import { Worker } from 'bullmq';
import pino from 'pino';
import { getWorkerConfig } from './common/config.js';
import { WorkerContext } from './common/context.js';
import { QUEUE_NAMES } from '@cipta/shared/constants/queues';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

const config = getWorkerConfig();
const prisma = new PrismaClient();

const ctx: WorkerContext = {
  prisma,
  logger,
  config,
};

const workers: Worker[] = [];

async function bootstrap() {
  logger.info({ msg: 'app.started', service: 'worker' });

  // Placeholder for processor registration
  // In real implementation, we would import createXxxProcessor and register them here

  /*
  const ingestorWorker = new Worker(QUEUE_NAMES.INGESTOR, createIngestorProcessor(ctx), {
    connection: config.redis,
    concurrency: 3,
  });
  workers.push(ingestorWorker);
  */

  logger.info({ msg: 'worker.ready', queues: Object.values(QUEUE_NAMES) });
}

async function shutdown(signal: string) {
  logger.info({ msg: 'app.shutdown', signal });

  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch((err) => {
  logger.fatal({ msg: 'app.startup.failed', error: err.message });
  process.exit(1);
});
