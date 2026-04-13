import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceRole } from '@cipta/database';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;

  type MockTransactionClient = {
    user: {
      create: jest.Mock;
    };
    workspace: {
      create: jest.Mock;
    };
    workspaceMember: {
      create: jest.Mock;
    };
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    workspace: {
      create: jest.fn(),
      count: jest.fn(),
    },
    workspaceMember: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);

    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.workspace.create.mockReset();
    prismaMock.workspace.count.mockReset();
    prismaMock.workspaceMember.create.mockReset();
    prismaMock.$transaction.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should register user and return token pair', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.workspace.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: MockTransactionClient) => Promise<unknown>) =>
        fn({
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'usr-1',
              email: 'user@example.com',
              displayName: 'John Doe',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
            }),
          },
          workspaceMember: {
            create: jest.fn().mockResolvedValue({ id: 'wm-1' }),
          },
          workspace: {
            create: jest.fn().mockResolvedValue({
              id: 'ws-1',
              name: "John Doe's Workspace",
              slug: 'john-does-workspace',
            }),
          },
        }),
    );

    const result = await authService.register({
      email: 'user@example.com',
      password: 'SecureP@ss1',
      displayName: 'John Doe',
    });

    expect(result.user.email).toBe('user@example.com');
    expect(result.workspace.role).toBe(WorkspaceRole.OWNER);
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.tokens.expiresIn).toBe(900);
  });

  it('should reject login when password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@example.com',
      passwordHash:
        '$2b$12$G1Ka4P9Qx5x3MewMQ7MxVudpOD9iZVjvXchV7YJHxF2ad2H9SpsHu',
      displayName: 'John Doe',
      workspaces: [
        {
          role: WorkspaceRole.OWNER,
          workspace: { id: 'ws-1' },
        },
      ],
    });

    await expect(
      authService.login({
        email: 'user@example.com',
        password: 'WrongP@ss1',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should rotate refresh token on refresh', async () => {
    const hashedPassword = await bcrypt.hash('SecureP@ss1', 12);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@example.com',
      passwordHash: hashedPassword,
      displayName: 'John Doe',
      workspaces: [
        {
          role: WorkspaceRole.OWNER,
          workspace: { id: 'ws-1' },
        },
      ],
    });

    const loginResult = await authService.login({
      email: 'user@example.com',
      password: 'SecureP@ss1',
    });

    const refreshResult = await authService.refresh({
      refreshToken: loginResult.tokens.refreshToken,
    });

    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).toBeDefined();
    expect(refreshResult.refreshToken).not.toBe(
      loginResult.tokens.refreshToken,
    );
  });

  it('should revoke refresh token on logout', async () => {
    const hashedPassword = await bcrypt.hash('SecureP@ss1', 12);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@example.com',
      passwordHash: hashedPassword,
      displayName: 'John Doe',
      workspaces: [
        {
          role: WorkspaceRole.OWNER,
          workspace: { id: 'ws-1' },
        },
      ],
    });

    const loginResult = await authService.login({
      email: 'user@example.com',
      password: 'SecureP@ss1',
    });

    const logoutResult = await authService.logout({
      refreshToken: loginResult.tokens.refreshToken,
    });

    expect(logoutResult.message).toBe('Logged out successfully');

    await expect(
      authService.refresh({ refreshToken: loginResult.tokens.refreshToken }),
    ).rejects.toThrow('Refresh token invalid or already used');
  });
});
