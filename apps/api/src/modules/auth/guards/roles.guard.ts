import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@cipta/database';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  AuthenticatedRequestUser,
  WorkspaceScopeContext,
  resolveWorkspaceScope,
} from '../workspace-scope.util';

interface GuardRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedRequestUser;
  workspaceScope?: WorkspaceScopeContext;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GuardRequest>();

    const scope = resolveWorkspaceScope({
      workspaceHeader: request.headers['x-workspace-id'],
      user: request.user,
    });

    request.workspaceScope = scope;

    if (!requiredRoles.includes(scope.role)) {
      throw new ForbiddenException('Insufficient workspace role permissions');
    }

    return true;
  }
}
