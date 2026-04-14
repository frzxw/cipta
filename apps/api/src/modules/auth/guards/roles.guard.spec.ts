import { ForbiddenException } from '@nestjs/common';
import {
  type ContextType,
  type ExecutionContext,
  type Type,
} from '@nestjs/common';
import type {
  HttpArgumentsHost,
  RpcArgumentsHost,
  WsArgumentsHost,
} from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@cipta/database';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  type HandlerFn = (...args: never[]) => unknown;

  class MockExecutionContext implements ExecutionContext {
    constructor(
      private readonly request: {
        headers: Record<string, string | string[] | undefined>;
        user?: {
          id: string;
          email: string;
          workspaces: { id: string; role: WorkspaceRole }[];
        };
      },
      private readonly handler: HandlerFn,
      private readonly classRef: Type<unknown>,
    ) {}

    getClass<T = unknown>(): Type<T> {
      return this.classRef as Type<T>;
    }

    // NestJS ExecutionContext contract requires `Function` here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    getHandler(): Function {
      return this.handler;
    }

    getArgs<T extends Array<unknown> = Array<unknown>>(): T {
      return [this.request] as unknown as T;
    }

    getArgByIndex<T = unknown>(index: number): T {
      return this.getArgs<Array<unknown>>()[index] as T;
    }

    switchToRpc(): RpcArgumentsHost {
      throw new Error('Not implemented for HTTP guard tests');
    }

    switchToHttp(): HttpArgumentsHost {
      return {
        getRequest: <T = unknown>(): T => this.request as unknown as T,
        getResponse: <T = unknown>(): T => {
          throw new Error('Response not required for guard tests');
        },
        getNext: <T = unknown>(): T => {
          throw new Error('Next not required for guard tests');
        },
      };
    }

    switchToWs(): WsArgumentsHost {
      throw new Error('Not implemented for HTTP guard tests');
    }

    getType<TContext extends string = ContextType>(): TContext {
      return 'http' as TContext;
    }
  }

  class TestController {}

  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const baseRequest = {
    headers: {},
    user: {
      id: 'usr_1',
      email: 'user@example.com',
      workspaces: [
        { id: 'ws_1', role: WorkspaceRole.OWNER },
        { id: 'ws_2', role: WorkspaceRole.ADMIN },
        { id: 'ws_3', role: WorkspaceRole.MEMBER },
      ],
    },
  };

  const setRequiredRoles = (
    handler: HandlerFn,
    roles?: WorkspaceRole[],
  ): void => {
    if (!roles) {
      return;
    }

    Reflect.defineMetadata(ROLES_KEY, roles, handler);
  };

  const createContext = (
    request: typeof baseRequest,
    roles?: WorkspaceRole[],
  ): ExecutionContext => {
    const handler: HandlerFn = () => undefined;
    setRequiredRoles(handler, roles);
    return new MockExecutionContext(request, handler, TestController);
  };

  it('allows request when no roles metadata is present', () => {
    const context = createContext(baseRequest);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows OWNER endpoint for owner workspace membership', () => {
    const context = createContext(
      {
        ...baseRequest,
        headers: { 'x-workspace-id': 'ws_1' },
      },
      [WorkspaceRole.OWNER],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows ADMIN endpoint for admin workspace membership', () => {
    const context = createContext(
      {
        ...baseRequest,
        headers: { 'x-workspace-id': 'ws_2' },
      },
      [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows MEMBER endpoint for member workspace membership', () => {
    const context = createContext(
      {
        ...baseRequest,
        headers: { 'x-workspace-id': 'ws_3' },
      },
      [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws when role does not satisfy endpoint requirement', () => {
    const context = createContext(
      {
        ...baseRequest,
        headers: { 'x-workspace-id': 'ws_3' },
      },
      [WorkspaceRole.OWNER],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws when requested workspace is not member workspace', () => {
    const context = createContext(
      {
        ...baseRequest,
        headers: { 'x-workspace-id': 'ws_unknown' },
      },
      [WorkspaceRole.MEMBER],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
