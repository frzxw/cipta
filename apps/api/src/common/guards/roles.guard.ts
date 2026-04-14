import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '../enums/roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface GuardRequestUser {
  role?: string;
  roles?: string[];
}

interface GuardRequest {
  user?: GuardRequestUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GuardRequest>();
    const userRoles = this.extractUserRoles(request.user);
    const allowed = requiredRoles.some((requiredRole) =>
      userRoles.includes(requiredRole),
    );

    if (!allowed) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }

  private extractUserRoles(user: GuardRequestUser | undefined): AppRole[] {
    if (!user) {
      return [];
    }

    const roles = new Set<string>();

    if (typeof user.role === 'string' && user.role.length > 0) {
      roles.add(user.role);
    }

    for (const role of user.roles ?? []) {
      if (typeof role === 'string' && role.length > 0) {
        roles.add(role);
      }
    }

    return [...roles].filter((role): role is AppRole =>
      Object.values(AppRole).includes(role as AppRole),
    );
  }
}
