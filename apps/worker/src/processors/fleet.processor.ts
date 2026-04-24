import type { Job, Processor } from 'bullmq';
import type { WorkerContext } from '../types';

export function createFleetProcessor(ctx: WorkerContext): Processor {
  return async function process(job: Job): Promise<void> {
    ctx.logger.info({ jobId: job.id, name: job.name }, 'Processing fleet job');
    return Promise.resolve();
  };
}
