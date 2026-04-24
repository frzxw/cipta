import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '@cipta/shared';
import { JobStatus } from '@cipta/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.INGESTOR) private ingestorQueue: Queue,
    @InjectQueue(QUEUE_NAMES.FACTORY) private factoryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.GUARDIAN) private guardianQueue: Queue,
    @InjectQueue(QUEUE_NAMES.FLEET) private fleetQueue: Queue,
  ) {}

  public async findAll(workspaceId: string, status?: string) {
    return this.prisma.job.findMany({
      where: {
        workspaceId,
        ...(status ? { status: status as JobStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  public async retry(workspaceId: string, jobId: string) {
    const jobRecord = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!jobRecord) {
      throw new NotFoundException('Job not found');
    }

    if (jobRecord.workspaceId !== workspaceId) {
      throw new ForbiddenException('You do not have access to this job');
    }

    const queue = this.getQueue(jobRecord.queue);

    // Re-enqueue
    const payload = jobRecord.payload as Record<string, unknown>;
    const bullJob = await queue.add(jobRecord.type, payload, {
      ...DEFAULT_JOB_OPTIONS[
        jobRecord.queue as keyof typeof DEFAULT_JOB_OPTIONS
      ],
      jobId: `retry:${jobRecord.id}:${Date.now()}`,
    });

    // Update DB record
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        bullJobId: bullJob.id,
        attemptsMade: 0,
        error: null,
        startedAt: null,
        completedAt: null,
      },
    });
  }

  private getQueue(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.INGESTOR:
        return this.ingestorQueue;
      case QUEUE_NAMES.FACTORY:
        return this.factoryQueue;
      case QUEUE_NAMES.GUARDIAN:
        return this.guardianQueue;
      case QUEUE_NAMES.FLEET:
        return this.fleetQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }
}
