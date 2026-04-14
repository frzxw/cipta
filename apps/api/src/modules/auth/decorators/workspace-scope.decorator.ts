import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthenticatedRequestUser,
  WorkspaceScopeContext,
  resolveWorkspaceScope,
} from '../workspace-scope.util';

interface WorkspaceScopedRequest extends Request {
  user?: AuthenticatedRequestUser;
  workspaceScope?: WorkspaceScopeContext;
}

export const WorkspaceScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceScopeContext => {
    const request = ctx.switchToHttp().getRequest<WorkspaceScopedRequest>();

    const scope = resolveWorkspaceScope({
      workspaceHeader: request.headers['x-workspace-id'],
      user: request.user,
    });

    request.workspaceScope = scope;
    return scope;
  },
);
