import type { Job, Processor } from 'bullmq';
import type { WorkerContext } from '../types';

export function createIngestorProcessor(ctx: WorkerContext): Processor {
  return async function process(job: Job): Promise<void> {
    ctx.logger.info({ jobId: job.id, name: job.name }, 'Processing ingestor job');
    return Promise.resolve();
  };
}
