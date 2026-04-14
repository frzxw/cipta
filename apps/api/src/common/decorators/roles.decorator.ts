import { SetMetadata } from '@nestjs/common';
import { AppRole } from '../enums/roles.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AppRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
