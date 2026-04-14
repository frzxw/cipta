import { ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@cipta/database';

export interface JwtWorkspaceClaim {
  id: string;
  role: WorkspaceRole;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  workspaces: JwtWorkspaceClaim[];
}

export interface WorkspaceScopeContext {
  workspaceId: string;
  role: WorkspaceRole;
}

interface ResolveWorkspaceScopeInput {
  workspaceHeader: string | string[] | undefined;
  user: AuthenticatedRequestUser | undefined;
}

function parseWorkspaceHeader(
  workspaceHeader: string | string[] | undefined,
): string | undefined {
  if (typeof workspaceHeader === 'string' && workspaceHeader.length > 0) {
    return workspaceHeader;
  }

  if (Array.isArray(workspaceHeader)) {
    const firstHeader = workspaceHeader.find((value) => value.length > 0);
    return firstHeader;
  }

  return undefined;
}

export function resolveWorkspaceScope(
  input: ResolveWorkspaceScopeInput,
): WorkspaceScopeContext {
  const userWorkspaces = input.user?.workspaces ?? [];
  const workspaceIdFromHeader = parseWorkspaceHeader(input.workspaceHeader);
  const scopedWorkspaceId = workspaceIdFromHeader ?? userWorkspaces[0]?.id;

  if (!scopedWorkspaceId) {
    throw new ForbiddenException('No workspace context available');
  }

  const membership = userWorkspaces.find(
    (workspace) => workspace.id === scopedWorkspaceId,
  );

  if (!membership) {
    throw new ForbiddenException(
      'User is not a member of the selected workspace',
    );
  }

  return {
    workspaceId: membership.id,
    role: membership.role,
  };
}
