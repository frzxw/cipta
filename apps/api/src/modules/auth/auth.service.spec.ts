import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceRole } from '@cipta/database';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  interface StoredRefreshToken {
    id: string;
    userId: string;
    jti: string;
    family: string;
    refreshTokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
  }

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

  const refreshTokenStore = new Map<string, StoredRefreshToken>();

  const getStoreEntries = (): StoredRefreshToken[] =>
    Array.from(refreshTokenStore.values());

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
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
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
    prismaMock.refreshToken.create.mockReset();
    prismaMock.refreshToken.findUnique.mockReset();
    prismaMock.refreshToken.updateMany.mockReset();
    prismaMock.$transaction.mockReset();
    refreshTokenStore.clear();

    prismaMock.refreshToken.create.mockImplementation(
      ({
        data,
      }: {
        data: {
          user: { connect: { id: string } };
          jti: string;
          family: string;
          refreshTokenHash: string;
          expiresAt: Date;
        };
      }) => {
        const stored: StoredRefreshToken = {
          id: `rt-${refreshTokenStore.size + 1}`,
          userId: data.user.connect.id,
          jti: data.jti,
          family: data.family,
          refreshTokenHash: data.refreshTokenHash,
          expiresAt: data.expiresAt,
          usedAt: null,
          revokedAt: null,
        };

        refreshTokenStore.set(stored.jti, stored);
        return stored;
      },
    );

    prismaMock.refreshToken.findUnique.mockImplementation(
      ({ where }: { where: { jti: string } }) =>
        refreshTokenStore.get(where.jti) ?? null,
    );

    prismaMock.refreshToken.updateMany.mockImplementation(
      ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        let count = 0;

        for (const token of refreshTokenStore.values()) {
          const whereId = where.id as string | undefined;
          const whereFamily = where.family as string | undefined;
          const whereUsedAt = (where.usedAt as null | undefined) ?? undefined;
          const whereRevokedAt =
            (where.revokedAt as null | undefined) ?? undefined;

          const idMatch = whereId ? token.id === whereId : true;
          const familyMatch = whereFamily ? token.family === whereFamily : true;
          const usedAtMatch =
            whereUsedAt === undefined ? true : token.usedAt === null;
          const revokedAtMatch =
            whereRevokedAt === undefined ? true : token.revokedAt === null;

          if (idMatch && familyMatch && usedAtMatch && revokedAtMatch) {
            token.usedAt = (data.usedAt as Date | undefined) ?? token.usedAt;
            token.revokedAt =
              (data.revokedAt as Date | undefined) ?? token.revokedAt;
            count += 1;
          }
        }

        return { count };
      },
    );

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
    jwtService = module.get<JwtService>(JwtService);
  });

  const mockAuthUser = {
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
  };

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
    expect(getStoreEntries()).toHaveLength(1);
  });

  it('should reject login when password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockAuthUser);

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
      ...mockAuthUser,
      passwordHash: hashedPassword,
    });

    const loginResult = await authService.login({
      email: 'user@example.com',
      password: 'SecureP@ss1',
    });

    const claims = await jwtService.verifyAsync<{
      sub: string;
      jti: string;
      family: string;
    }>(loginResult.tokens.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const refreshResult = await authService.refresh({
      refreshToken: loginResult.tokens.refreshToken,
      claims,
    });

    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).toBeDefined();
    expect(refreshResult.refreshToken).not.toBe(
      loginResult.tokens.refreshToken,
    );
    expect(getStoreEntries()).toHaveLength(2);
  });

  it('should revoke token family when refresh token replay detected', async () => {
    const hashedPassword = await bcrypt.hash('SecureP@ss1', 12);

    prismaMock.user.findUnique.mockResolvedValue({
      ...mockAuthUser,
      passwordHash: hashedPassword,
    });

    const loginResult = await authService.login({
      email: 'user@example.com',
      password: 'SecureP@ss1',
    });

    const claims = await jwtService.verifyAsync<{
      sub: string;
      jti: string;
      family: string;
    }>(loginResult.tokens.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    await authService.refresh({
      refreshToken: loginResult.tokens.refreshToken,
      claims,
    });

    await expect(
      authService.refresh({
        refreshToken: loginResult.tokens.refreshToken,
        claims,
      }),
    ).rejects.toThrow('Refresh token invalid or already used');

    const familyTokens = getStoreEntries().filter(
      (token) => token.family === claims.family,
    );

    expect(familyTokens.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it('should revoke refresh token family on logout', async () => {
    const hashedPassword = await bcrypt.hash('SecureP@ss1', 12);

    prismaMock.user.findUnique.mockResolvedValue({
      ...mockAuthUser,
      passwordHash: hashedPassword,
    });

    const loginResult = await authService.login({
      email: 'user@example.com',
      password: 'SecureP@ss1',
    });

    const claims = await jwtService.verifyAsync<{
      sub: string;
      jti: string;
      family: string;
    }>(loginResult.tokens.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const logoutResult = await authService.logout({
      refreshToken: loginResult.tokens.refreshToken,
      claims,
    });

    expect(logoutResult.message).toBe('Logged out successfully');

    await expect(
      authService.refresh({
        refreshToken: loginResult.tokens.refreshToken,
        claims,
      }),
    ).rejects.toThrow('Refresh token invalid or already used');
  });
});
