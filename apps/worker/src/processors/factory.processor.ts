import type { Job, Processor } from 'bullmq';
import type { WorkerContext } from '../types';

export function createFactoryProcessor(ctx: WorkerContext): Processor {
  return async function process(job: Job): Promise<void> {
    ctx.logger.info({ jobId: job.id, name: job.name }, 'Processing factory job');
    return Promise.resolve();
  };
}
