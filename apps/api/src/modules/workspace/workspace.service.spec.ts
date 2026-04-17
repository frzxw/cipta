import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacePlan, WorkspaceRole } from '@cipta/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceService } from './workspace.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const WORKSPACE_ID = 'ws-uuid-001';

function makeWorkspace(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: WORKSPACE_ID,
    name: 'Test Workspace',
    slug: 'test-workspace',
    plan: WorkspacePlan.FREE,
    settings: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { members: 1 },
    ...overrides,
  };
}

function makeMembership(
  userId = USER_ID,
  role: WorkspaceRole = WorkspaceRole.OWNER,
) {
  return {
    id: 'member-uuid-001',
    userId,
    workspaceId: WORKSPACE_ID,
    role,
    joinedAt: new Date('2026-01-01'),
    workspace: makeWorkspace(),
    user: {
      id: userId,
      email: 'owner@test.com',
      displayName: 'Test Owner',
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  const mockPrisma = {
    workspaceMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  // ─── listForUser ──────────────────────────────────────────────────────────

  describe('listForUser', () => {
    it('returns workspace summaries with caller role', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        makeMembership(USER_ID, WorkspaceRole.OWNER),
      ]);

      const result = await service.listForUser(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: WORKSPACE_ID,
        slug: 'test-workspace',
        role: WorkspaceRole.OWNER,
      });
      expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });

    it('returns empty array when user has no workspaces', async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([]);
      const result = await service.listForUser(USER_ID);
      expect(result).toEqual([]);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateWorkspaceDto = { name: 'My Workspace' };

    it('creates workspace and adds user as OWNER', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);
      const ws = makeWorkspace();
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.workspace.create.mockResolvedValue(ws);
          mockPrisma.workspaceMember.create.mockResolvedValue(makeMembership());
          return cb(mockPrisma);
        },
      );

      const result = await service.create(USER_ID, dto);

      expect(result.id).toBe(WORKSPACE_ID);
      expect(result.memberCount).toBe(1);
    });

    it('throws ConflictException when slug already taken', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(makeWorkspace());

      await expect(service.create(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('uses provided slug when given', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);
      const ws = makeWorkspace({ slug: 'custom-slug' });
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.workspace.create.mockResolvedValue(ws);
          mockPrisma.workspaceMember.create.mockResolvedValue(makeMembership());
          return cb(mockPrisma);
        },
      );

      const result = await service.create(USER_ID, {
        name: 'Test',
        slug: 'custom-slug',
      });
      expect(result.slug).toBe('custom-slug');
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns workspace detail for a member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.MEMBER),
      );
      mockPrisma.workspace.findUnique.mockResolvedValue(makeWorkspace());

      const result = await service.findOne(WORKSPACE_ID, USER_ID);
      expect(result.id).toBe(WORKSPACE_ID);
    });

    it('throws ForbiddenException for non-member', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.findOne(WORKSPACE_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when workspace is missing', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.MEMBER),
      );
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findOne(WORKSPACE_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateWorkspaceDto = { name: 'Updated Name' };

    it('updates workspace for OWNER', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.OWNER),
      );
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      mockPrisma.workspace.update.mockResolvedValue(
        makeWorkspace({ name: 'Updated Name' }),
      );

      const result = await service.update(WORKSPACE_ID, USER_ID, dto);
      expect(result.name).toBe('Updated Name');
    });

    it('updates workspace for ADMIN', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.ADMIN),
      );
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      mockPrisma.workspace.update.mockResolvedValue(makeWorkspace());

      await expect(
        service.update(WORKSPACE_ID, USER_ID, dto),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException for MEMBER', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.MEMBER),
      );

      await expect(service.update(WORKSPACE_ID, USER_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException for duplicate slug', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.OWNER),
      );
      mockPrisma.workspace.findFirst.mockResolvedValue(
        makeWorkspace({ id: 'other-ws' }),
      );

      await expect(
        service.update(WORKSPACE_ID, USER_ID, { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── inviteMember ─────────────────────────────────────────────────────────

  describe('inviteMember', () => {
    const dto: InviteMemberDto = { email: 'invitee@test.com' };
    const INVITEE_ID = 'user-uuid-002';

    it('invites a user as MEMBER by default', async () => {
      // caller must be OWNER/ADMIN
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(makeMembership(USER_ID, WorkspaceRole.OWNER)) // assertRole
        .mockResolvedValueOnce(null); // no existing membership for invitee

      mockPrisma.user.findUnique.mockResolvedValue({
        id: INVITEE_ID,
        email: 'invitee@test.com',
        displayName: 'Invitee',
      });

      const newMember = {
        id: 'member-uuid-002',
        userId: INVITEE_ID,
        workspaceId: WORKSPACE_ID,
        role: WorkspaceRole.MEMBER,
        joinedAt: new Date(),
        user: {
          id: INVITEE_ID,
          email: 'invitee@test.com',
          displayName: 'Invitee',
        },
      };
      mockPrisma.workspaceMember.create.mockResolvedValue(newMember);

      const result = await service.inviteMember(WORKSPACE_ID, USER_ID, dto);
      expect(result.email).toBe('invitee@test.com');
      expect(result.role).toBe(WorkspaceRole.MEMBER);
      type CreateMemberArg = { data: { workspaceId: string } };
      const mockCalls = mockPrisma.workspaceMember.create.mock.calls as Array<
        [CreateMemberArg]
      >;
      const createCallArgs = mockCalls[0]?.[0];
      expect(createCallArgs?.data?.workspaceId).toBe(WORKSPACE_ID);
    });

    it('throws NotFoundException when invitee email not found', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.OWNER),
      );
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteMember(WORKSPACE_ID, USER_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when invitee already a member', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(makeMembership(USER_ID, WorkspaceRole.OWNER))
        .mockResolvedValueOnce(
          makeMembership(INVITEE_ID, WorkspaceRole.MEMBER),
        );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: INVITEE_ID,
        email: 'invitee@test.com',
        displayName: 'Invitee',
      });

      await expect(
        service.inviteMember(WORKSPACE_ID, USER_ID, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when caller is MEMBER', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValue(
        makeMembership(USER_ID, WorkspaceRole.MEMBER),
      );

      await expect(
        service.inviteMember(WORKSPACE_ID, USER_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── removeMember ─────────────────────────────────────────────────────────

  describe('removeMember', () => {
    const TARGET_ID = 'user-uuid-003';

    it('removes a regular member', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(makeMembership(USER_ID, WorkspaceRole.OWNER)) // assertRole
        .mockResolvedValueOnce(makeMembership(TARGET_ID, WorkspaceRole.MEMBER)); // target

      mockPrisma.workspaceMember.delete.mockResolvedValue({});

      await expect(
        service.removeMember(WORKSPACE_ID, USER_ID, TARGET_ID),
      ).resolves.toBeUndefined();

      expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_workspaceId: {
              userId: TARGET_ID,
              workspaceId: WORKSPACE_ID,
            },
          },
        }),
      );
    });

    it('throws ForbiddenException when trying to remove OWNER', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(makeMembership(USER_ID, WorkspaceRole.OWNER))
        .mockResolvedValueOnce(makeMembership(TARGET_ID, WorkspaceRole.OWNER));

      await expect(
        service.removeMember(WORKSPACE_ID, USER_ID, TARGET_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when member not found', async () => {
      mockPrisma.workspaceMember.findUnique
        .mockResolvedValueOnce(makeMembership(USER_ID, WorkspaceRole.OWNER))
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember(WORKSPACE_ID, USER_ID, TARGET_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is MEMBER', async () => {
      mockPrisma.workspaceMember.findUnique.mockResolvedValueOnce(
        makeMembership(USER_ID, WorkspaceRole.MEMBER),
      );

      await expect(
        service.removeMember(WORKSPACE_ID, USER_ID, TARGET_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
