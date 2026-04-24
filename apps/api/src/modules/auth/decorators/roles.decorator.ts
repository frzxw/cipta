import { SetMetadata } from '@nestjs/common';
import { type WorkspaceRole } from '@cipta/database';

export const ROLES_KEY = 'roles';

export const Roles = (
  ...roles: WorkspaceRole[]
): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
