import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { SourceStatus, type Source } from '@cipta/database';
import {
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  INGESTOR_JOB_NAMES,
  type DownloadJobPayload,
} from '@cipta/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateSourceDto } from './dto/create-source.dto';
import type { ListSourcesDto } from './dto/list-sources.dto';

// ─── Internal output interfaces (decoupled from Prisma types) ──────────────

export interface SourceCreatedResult {
  id: string;
  url: string;
  status: SourceStatus;
  jobId: string;
  createdAt: Date;
}

export interface SourceSummary {
  id: string;
  url: string;
  title: string | null;
  platform: string | null;
  status: SourceStatus;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  createdAt: Date;
}

export interface SourceDetail extends SourceSummary {
  metadata: Record<string, unknown>;
  updatedAt: Date;
}

export interface PaginatedSources {
  data: SourceSummary[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ─── Service ──────────────────────────────────────────────────────────────

@Injectable()
export class IngestorService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.INGESTOR)
    private readonly ingestorQueue: Queue<DownloadJobPayload>,
  ) {}

  /**
   * Create a Source record and dispatch the initial download job.
   * Rejects duplicate URLs within the same workspace (409).
   */
  async createSource(
    workspaceId: string,
    dto: CreateSourceDto,
  ): Promise<SourceCreatedResult> {
    // Guard: no duplicate URL in workspace
    const existing = await this.prisma.source.findFirst({
      where: { workspaceId, url: dto.url },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Source with URL already exists in this workspace`,
      );
    }

    const source = await this.prisma.source.create({
      data: {
        workspaceId,
        projectId: dto.projectId ?? null,
        url: dto.url,
        status: SourceStatus.PENDING,
      },
    });

    const payload: DownloadJobPayload = {
      sourceId: source.id,
      workspaceId,
      url: source.url,
      quality: dto.quality ?? 'highest',
    };

    const job = await this.ingestorQueue.add(
      INGESTOR_JOB_NAMES.DOWNLOAD,
      payload,
      {
        ...DEFAULT_JOB_OPTIONS[QUEUE_NAMES.INGESTOR],
        jobId: `dl:${source.id}`,
      },
    );

    return {
      id: source.id,
      url: source.url,
      status: source.status,
      jobId: job.id ?? `dl:${source.id}`,
      createdAt: source.createdAt,
    };
  }

  /**
   * List sources in workspace with optional status filter and pagination.
   */
  async listSources(
    workspaceId: string,
    query: ListSourcesDto,
  ): Promise<PaginatedSources> {
    const { page, limit, sortBy, sortOrder, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      ...(status ? { status } : {}),
    };

    const [sources, total] = await this.prisma.$transaction([
      this.prisma.source.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          url: true,
          title: true,
          platform: true,
          status: true,
          durationSeconds: true,
          thumbnailUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.source.count({ where }),
    ]);

    return {
      data: sources.map(this.toSourceSummary),
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Get a single source. Scoped to workspace for security.
   */
  async findSource(workspaceId: string, id: string): Promise<SourceDetail> {
    const source = await this.prisma.source.findFirst({
      where: { id, workspaceId },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    return this.toSourceDetail(source);
  }

  /**
   * Delete a source and all cascade-deleted derived data.
   */
  async deleteSource(workspaceId: string, id: string): Promise<void> {
    const source = await this.prisma.source.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    await this.prisma.source.delete({ where: { id } });
  }

  // ─── Private mappers ──────────────────────────────────────────────────────

  private toSourceSummary = (
    s: Pick<
      Source,
      | 'id'
      | 'url'
      | 'title'
      | 'platform'
      | 'status'
      | 'durationSeconds'
      | 'thumbnailUrl'
      | 'createdAt'
    >,
  ): SourceSummary => ({
    id: s.id,
    url: s.url,
    title: s.title,
    platform: s.platform,
    status: s.status,
    durationSeconds: s.durationSeconds,
    thumbnailUrl: s.thumbnailUrl,
    createdAt: s.createdAt,
  });

  private toSourceDetail = (s: Source): SourceDetail => ({
    id: s.id,
    url: s.url,
    title: s.title,
    platform: s.platform,
    status: s.status,
    durationSeconds: s.durationSeconds,
    thumbnailUrl: s.thumbnailUrl,
    metadata: s.metadata as Record<string, unknown>,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}
