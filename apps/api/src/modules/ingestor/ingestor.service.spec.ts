import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SourceStatus } from '@cipta/database';
import { QUEUE_NAMES } from '@cipta/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { ListSourcesDto } from './dto/list-sources.dto';
import { IngestorService } from './ingestor.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WS_ID = 'ws-uuid-001';
const SRC_ID = 'src-uuid-001';

function makeSource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: SRC_ID,
    workspaceId: WS_ID,
    projectId: null,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: null,
    platform: null,
    status: SourceStatus.PENDING,
    durationSeconds: null,
    thumbnailUrl: null,
    storagePath: null,
    metadata: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IngestorService', () => {
  let service: IngestorService;

  const mockPrisma = {
    source: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-001' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestorService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: getQueueToken(QUEUE_NAMES.INGESTOR),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<IngestorService>(IngestorService);
  });

  // ─── createSource ───────────────────────────────────────────────────────────

  describe('createSource', () => {
    const dto: CreateSourceDto = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    it('creates source and returns created result with jobId', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue(makeSource());

      const result = await service.createSource(WS_ID, dto);

      expect(result.id).toBe(SRC_ID);
      expect(result.status).toBe(SourceStatus.PENDING);
      expect(result.jobId).toBe('job-001');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'download',
        expect.objectContaining({ sourceId: SRC_ID, url: dto.url }),
        expect.objectContaining({ jobId: `dl:${SRC_ID}` }),
      );
    });

    it('throws ConflictException for duplicate URL in workspace', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(makeSource());

      await expect(service.createSource(WS_ID, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.source.create).not.toHaveBeenCalled();
    });

    it('uses provided quality in job payload', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue(makeSource());

      await service.createSource(WS_ID, { ...dto, quality: '720p' });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'download',
        expect.objectContaining({ quality: '720p' }),
        expect.anything(),
      );
    });

    it('defaults quality to "highest" when not provided', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue(makeSource());

      await service.createSource(WS_ID, dto);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'download',
        expect.objectContaining({ quality: 'highest' }),
        expect.anything(),
      );
    });
  });

  // ─── listSources ────────────────────────────────────────────────────────────

  describe('listSources', () => {
    const query: ListSourcesDto = {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    it('returns paginated sources', async () => {
      const sources = [makeSource()];
      mockPrisma.$transaction.mockResolvedValue([sources, 1]);

      const result = await service.listSources(WS_ID, query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.pagination.total).toBe(1);
      expect(result.meta.pagination.totalPages).toBe(1);
    });

    it('returns empty list when no sources', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.listSources(WS_ID, query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.pagination.total).toBe(0);
    });

    it('filters by status when provided', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.listSources(WS_ID, {
        ...query,
        status: SourceStatus.READY,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── findSource ─────────────────────────────────────────────────────────────

  describe('findSource', () => {
    it('returns source detail', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(makeSource());

      const result = await service.findSource(WS_ID, SRC_ID);

      expect(result.id).toBe(SRC_ID);
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('updatedAt');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);

      await expect(service.findSource(WS_ID, SRC_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('scopes query to workspaceId', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(makeSource());

      await service.findSource(WS_ID, SRC_ID);

      expect(mockPrisma.source.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SRC_ID, workspaceId: WS_ID },
        }),
      );
    });
  });

  // ─── deleteSource ───────────────────────────────────────────────────────────

  describe('deleteSource', () => {
    it('deletes source successfully', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(makeSource());
      mockPrisma.source.delete.mockResolvedValue(makeSource());

      await expect(
        service.deleteSource(WS_ID, SRC_ID),
      ).resolves.toBeUndefined();
      expect(mockPrisma.source.delete).toHaveBeenCalledWith({
        where: { id: SRC_ID },
      });
    });

    it('throws NotFoundException when source not found', async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);

      await expect(service.deleteSource(WS_ID, SRC_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
