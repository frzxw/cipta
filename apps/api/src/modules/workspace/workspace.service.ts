import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  WorkspacePlan,
  WorkspaceRole,
  type Workspace,
  type WorkspaceMember,
} from '@cipta/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

// ─── Internal interfaces (decoupled from Prisma-generated types) ────────────

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  role: WorkspaceRole;
  createdAt: Date;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
}

export interface WorkspaceMemberDetail {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all workspaces the authenticated user belongs to.
   * Returns workspace summary with the caller's role in each.
   */
  async listForUser(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan,
      role: m.role,
      createdAt: m.workspace.createdAt,
    }));
  }

  /**
   * Create a workspace and add the caller as OWNER.
   */
  async create(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceDetail> {
    const slug = dto.slug ?? this.generateSlug(dto.name);

    const existing = await this.prisma.workspace.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Workspace slug "${slug}" is already taken`);
    }

    const workspace = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name: dto.name, slug, plan: WorkspacePlan.FREE },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId, role: WorkspaceRole.OWNER },
      });
      return ws;
    });

    return this.toWorkspaceDetail(workspace, 1);
  }

  /**
   * Get workspace details. Only accessible by members.
   */
  async findOne(workspaceId: string, userId: string): Promise<WorkspaceDetail> {
    await this.assertMembership(workspaceId, userId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { _count: { select: { members: true } } },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.toWorkspaceDetail(workspace, workspace._count.members);
  }

  /**
   * Update workspace metadata. Only OWNER or ADMIN may update.
   */
  async update(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDetail> {
    await this.assertRole(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    if (dto.slug) {
      const conflict = await this.prisma.workspace.findFirst({
        where: { slug: dto.slug, NOT: { id: workspaceId } },
      });
      if (conflict) {
        throw new ConflictException(
          `Workspace slug "${dto.slug}" is already taken`,
        );
      }
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
      },
      include: { _count: { select: { members: true } } },
    });

    return this.toWorkspaceDetail(workspace, workspace._count.members);
  }

  /**
   * Invite a user to the workspace by email.
   * Requires OWNER or ADMIN role. Defaults invited role to MEMBER.
   */
  async inviteMember(
    workspaceId: string,
    callerId: string,
    dto: InviteMemberDto,
  ): Promise<WorkspaceMemberDetail> {
    await this.assertRole(workspaceId, callerId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!invitee) {
      throw new NotFoundException(`No user found with email "${dto.email}"`);
    }

    const alreadyMember = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: invitee.id, workspaceId } },
    });
    if (alreadyMember) {
      throw new ConflictException(`User "${dto.email}" is already a member`);
    }

    const role = dto.role ?? WorkspaceRole.MEMBER;
    const member = await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: invitee.id, role },
      include: { user: true },
    });

    return this.toMemberDetail(member);
  }

  /**
   * Remove a member from the workspace.
   * Only OWNER or ADMIN may remove. OWNER cannot be removed.
   */
  async removeMember(
    workspaceId: string,
    callerId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertRole(workspaceId, callerId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
    if (!membership) {
      throw new NotFoundException('Member not found in this workspace');
    }
    if (membership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    await this.prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async assertMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    return member;
  }

  private async assertRole(
    workspaceId: string,
    userId: string,
    allowed: WorkspaceRole[],
  ): Promise<WorkspaceMember> {
    const member = await this.assertMembership(workspaceId, userId);
    if (!allowed.includes(member.role)) {
      throw new ForbiddenException('Insufficient role for this operation');
    }
    return member;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 64);
  }

  private toWorkspaceDetail(
    workspace: Workspace & { _count?: { members: number } },
    memberCount: number,
  ): WorkspaceDetail {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      settings: workspace.settings as Record<string, unknown>,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      memberCount,
    };
  }

  private toMemberDetail(
    member: WorkspaceMember & {
      user: { id: string; email: string; displayName: string };
    },
  ): WorkspaceMemberDetail {
    return {
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      displayName: member.user.displayName,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }
}
