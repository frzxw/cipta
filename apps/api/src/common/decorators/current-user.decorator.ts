import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  roles?: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);
