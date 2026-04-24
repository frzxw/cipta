import type { Job, Processor } from 'bullmq';
import type { WorkerContext } from '../types';

export function createGuardianProcessor(ctx: WorkerContext): Processor {
  return async function process(job: Job): Promise<void> {
    ctx.logger.info({ jobId: job.id, name: job.name }, 'Processing guardian job');
    return Promise.resolve();
  };
}
