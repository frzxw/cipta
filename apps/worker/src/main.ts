import { Worker } from 'bullmq';
import { PrismaClient } from '@cipta/database';
import { QUEUE_NAMES } from '@cipta/shared';
import { createLogger } from './utils/logger';
import { loadConfig } from './config';
import { createStorageClient } from './services/storage.service';

// Processors
import { createIngestorProcessor } from './processors/ingestor.processor';
import { createFactoryProcessor } from './processors/factory.processor';
import { createGuardianProcessor } from './processors/guardian.processor';
import { createFleetProcessor } from './processors/fleet.processor';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('cipta-worker');
  const prisma = new PrismaClient();
  const storage = createStorageClient(config.storage);

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'Failed to connect to database');
    process.exit(1);
  }

  const redisConnection = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  // Context passed to all processors
  const context = { prisma, storage, logger, config };

  // Start workers
  const workers = [
    new Worker(QUEUE_NAMES.INGESTOR, createIngestorProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.ingestor,
    }),
    new Worker(QUEUE_NAMES.FACTORY, createFactoryProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.factory,
    }),
    new Worker(QUEUE_NAMES.GUARDIAN, createGuardianProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.guardian,
    }),
    new Worker(QUEUE_NAMES.FLEET, createFleetProcessor(context), {
      connection: redisConnection,
      concurrency: config.concurrency.fleet,
    }),
  ];

  // Event handlers
  workers.forEach((worker) => {
    worker.on('completed', (job) => {
      logger.info({ jobId: job.id, queue: job.queueName }, 'Job completed');
    });

    worker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, queue: job?.queueName, error: error.message }, 'Job failed');
    });

    worker.on('error', (error) => {
      logger.error({ error: error.message }, 'Worker error');
    });
  });

  logger.info(
    {
      queues: Object.values(QUEUE_NAMES),
      concurrency: config.concurrency,
    },
    '🏭 Cipta Worker started',
  );

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down worker...');
    await Promise.all(workers.map(async (w) => w.close()));
    await prisma.$disconnect();
    logger.info('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', (signal) => {
    void shutdown(signal);
  });
  process.on('SIGINT', (signal) => {
    void shutdown(signal);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
