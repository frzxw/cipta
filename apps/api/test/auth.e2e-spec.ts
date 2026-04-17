import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceRole } from '@cipta/database';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

// ---------------------------------------------------------------------------
// Shared in-memory stores (reset per test)
// ---------------------------------------------------------------------------

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
  workspaces: Array<{ role: WorkspaceRole; workspace: { id: string } }>;
}

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

interface StoredWorkspace {
  id: string;
  name: string;
  slug: string;
}

let userStore: StoredUser[] = [];
let workspaceStore: StoredWorkspace[] = [];
let refreshTokenStore: Map<string, StoredRefreshToken>;

function buildPrismaMock() {
  refreshTokenStore = new Map<string, StoredRefreshToken>();
  userStore = [];
  workspaceStore = [];

  const mock = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),

    user: {
      findUnique: jest.fn(
        ({ where }: { where: { email?: string; id?: string } }) => {
          const user = userStore.find(
            (u) =>
              (where.email && u.email === where.email) ||
              (where.id && u.id === where.id),
          );
          return Promise.resolve(user ?? null);
        },
      ),
      create: jest.fn(),
    },

    workspace: {
      create: jest.fn(),
      count: jest.fn(
        ({ where }: { where: { slug?: { startsWith?: string } } }) => {
          const prefix = where.slug?.startsWith ?? '';
          const count = workspaceStore.filter((w) =>
            w.slug.startsWith(prefix),
          ).length;
          return Promise.resolve(count);
        },
      ),
    },

    workspaceMember: {
      create: jest.fn(),
    },

    refreshToken: {
      create: jest.fn(
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
          return Promise.resolve(stored);
        },
      ),

      findUnique: jest.fn(({ where }: { where: { jti: string } }) =>
        Promise.resolve(refreshTokenStore.get(where.jti) ?? null),
      ),

      updateMany: jest.fn(
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
            const familyMatch = whereFamily
              ? token.family === whereFamily
              : true;
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
          return Promise.resolve({ count });
        },
      ),
    },

    $transaction: jest.fn() as jest.MockedFunction<
      (fn: (tx: any) => Promise<unknown>) => Promise<unknown>
    >,
  } as const;

  return mock;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  const BASE_REGISTER_BODY = {
    email: 'alice@example.com',
    password: 'SecureP@ss1',
    displayName: 'Alice',
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
  });

  beforeEach(async () => {
    prismaMock = buildPrismaMock();

    // Wire up $transaction to use the mock itself as the tx client

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: any) => Promise<unknown>) => fn(prismaMock),
    );

    // user.create stores the user in userStore and also makes it visible to findUnique

    prismaMock.user.create.mockImplementation(
      ({
        data,
      }: {
        data: { email: string; passwordHash: string; displayName: string };
      }) => {
        const user: StoredUser = {
          id: `usr-${userStore.length + 1}`,
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          workspaces: [],
        };
        userStore.push(user);
        return Promise.resolve(user);
      },
    );

    // workspace.create stores the workspace

    prismaMock.workspace.create.mockImplementation(
      ({ data }: { data: { name: string; slug: string } }) => {
        const ws: StoredWorkspace = {
          id: `ws-${workspaceStore.length + 1}`,
          name: data.name,
          slug: data.slug,
        };
        workspaceStore.push(ws);
        return Promise.resolve(ws);
      },
    );

    // workspaceMember.create wires membership into the user's workspaces array

    prismaMock.workspaceMember.create.mockImplementation(
      ({
        data,
      }: {
        data: { userId: string; workspaceId: string; role: WorkspaceRole };
      }) => {
        const user = userStore.find((u) => u.id === data.userId);
        const ws = workspaceStore.find((w) => w.id === data.workspaceId);
        if (user && ws) {
          user.workspaces.push({ role: data.role, workspace: { id: ws.id } });
        }
        return Promise.resolve({ id: 'wm-1' });
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // POST /v1/auth/register
  // -------------------------------------------------------------------------

  describe('[AC-13.1] POST /v1/auth/register', () => {
    it('should register a new user and return token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY)
        .expect(201);

      const { data } = res.body as {
        data: {
          user: {
            id: string;
            email: string;
            displayName: string;
            createdAt: string;
          };
          workspace: {
            id: string;
            name: string;
            slug: string;
            role: WorkspaceRole;
          };
          tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };
        };
      };

      expect(data.user.email).toBe('alice@example.com');
      expect(data.user.displayName).toBe('Alice');
      expect(data.workspace.role).toBe(WorkspaceRole.OWNER);
      expect(data.tokens.accessToken).toBeDefined();
      expect(data.tokens.refreshToken).toBeDefined();
      expect(data.tokens.expiresIn).toBe(900);
    });

    it('[AC-13.2] should return 409 when email already registered', async () => {
      // Pre-seed userStore so alice@example.com already exists BEFORE any HTTP
      // call.  This means only ONE request is needed, staying within the throttle
      // limit (1 req/s) while still exercising the ConflictException code path.
      userStore.push({
        id: 'usr-pre',
        email: BASE_REGISTER_BODY.email,
        passwordHash: 'irrelevant-hash',
        displayName: 'Pre-existing Alice',
        createdAt: new Date(),
        workspaces: [],
      });

      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY)
        .expect(409);

      expect(res.body).toMatchObject({ statusCode: 409 });
    });

    it('[AC-13.3] should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ ...BASE_REGISTER_BODY, email: 'not-an-email' })
        .expect(400);
    });

    it('[AC-13.4] should return 400 when password lacks uppercase', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ ...BASE_REGISTER_BODY, password: 'nouppercase1!' })
        .expect(400);
    });

    it('[AC-13.5] should return 400 when password lacks a number', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ ...BASE_REGISTER_BODY, password: 'NoNumbers!!' })
        .expect(400);
    });

    it('[AC-13.6] should return 400 when password lacks a special character', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ ...BASE_REGISTER_BODY, password: 'NoSpecial1' })
        .expect(400);
    });

    it('[AC-13.7] should return 400 when displayName is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { displayName: _displayName, ...body } = BASE_REGISTER_BODY;
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(body)
        .expect(400);
    });

    it('[AC-13.8] should return 400 when extra fields are sent', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ ...BASE_REGISTER_BODY, extraField: 'bad' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /v1/auth/login
  // -------------------------------------------------------------------------

  describe('[AC-13.9] POST /v1/auth/login', () => {
    beforeEach(async () => {
      // Pre-register a user for login tests
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY);
    });

    it('should login with valid credentials and return token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: BASE_REGISTER_BODY.email,
          password: BASE_REGISTER_BODY.password,
        })
        .expect(201);

      const { data } = res.body as {
        data: {
          user: { id: string; email: string; displayName: string };
          tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };
        };
      };

      expect(data.user.email).toBe('alice@example.com');
      expect(data.tokens.accessToken).toBeDefined();
      expect(data.tokens.refreshToken).toBeDefined();
      expect(data.tokens.expiresIn).toBe(900);
    });

    it('[AC-13.10] should return 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: BASE_REGISTER_BODY.email, password: 'WrongP@ss1' })
        .expect(401);

      expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it('[AC-13.11] should return 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: BASE_REGISTER_BODY.password,
        })
        .expect(401);
    });

    it('[AC-13.12] should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'bad-email', password: BASE_REGISTER_BODY.password })
        .expect(400);
    });

    it('[AC-13.13] should return 400 for missing password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: BASE_REGISTER_BODY.email })
        .expect(400);
    });

    it('[AC-13.14] should normalise email to lowercase before lookup', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'ALICE@EXAMPLE.COM',
          password: BASE_REGISTER_BODY.password,
        })
        .expect(201);

      const { data } = res.body as { data: { user: { email: string } } };
      expect(data.user.email).toBe('alice@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // POST /v1/auth/refresh
  // -------------------------------------------------------------------------

  describe('[AC-13.15] POST /v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register then login to obtain a valid refresh token
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY);

      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: BASE_REGISTER_BODY.email,
          password: BASE_REGISTER_BODY.password,
        });

      const loginBody = loginRes.body as {
        data: { tokens: { refreshToken: string } };
      };
      refreshToken = loginBody.data.tokens.refreshToken;
    });

    it('should return a new token pair when given a valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(201);

      const { data } = res.body as {
        data: { accessToken: string; refreshToken: string; expiresIn: number };
      };

      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.refreshToken).not.toBe(refreshToken);
    });

    it('[AC-13.16] should return 401 on refresh token replay attack', async () => {
      // Use the refresh token once successfully
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(201);

      // Replay the same token → family revocation + 401
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(401);
    });

    it('[AC-13.17] should return 401 when an invalid/garbage refresh token is sent', async () => {
      // JwtRefreshStrategy extracts the token from the request body, NOT from the
      // Authorization header. Without a valid JWT in the body Passport returns 401.
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'garbage.token.value' })
        .expect(401);
    });

    it('[AC-13.18] should return 401 when refreshToken body field is missing', async () => {
      // The JwtRefreshStrategy extractor returns null when the body field is
      // absent, so Passport rejects with 401 before the DTO pipe runs.
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({})
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /v1/auth/logout
  // -------------------------------------------------------------------------

  describe('[AC-13.19] POST /v1/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY);

      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: BASE_REGISTER_BODY.email,
          password: BASE_REGISTER_BODY.password,
        });

      const loginBody = loginRes.body as {
        data: { tokens: { refreshToken: string } };
      };
      refreshToken = loginBody.data.tokens.refreshToken;
    });

    it('should return success message and revoke the refresh token family', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(201);

      const { data } = res.body as { data: { message: string } };
      expect(data.message).toBe('Logged out successfully');
    });

    it('[AC-13.20] should prevent refresh after logout', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(201);

      // Refresh attempt should fail
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(401);
    });

    it('[AC-13.21] should return 401 when an invalid/garbage refresh token is sent', async () => {
      // Same reasoning as refresh: JwtRefreshStrategy reads from request body.
      // Sending a garbage token triggers a Passport 401.
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .send({ refreshToken: 'garbage.token.value' })
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // JWT token integrity
  // -------------------------------------------------------------------------

  describe('[AC-13.22] JWT token integrity', () => {
    it('access token should contain correct claims after register', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY)
        .expect(201);

      const { data } = res.body as {
        data: { tokens: { accessToken: string } };
      };

      const payload = await jwtService.verifyAsync<{
        sub: string;
        email: string;
        workspaces: Array<{ id: string; role: WorkspaceRole }>;
      }>(data.tokens.accessToken, { secret: process.env.JWT_ACCESS_SECRET });

      expect(payload.email).toBe('alice@example.com');
      expect(payload.workspaces).toHaveLength(1);
      expect(payload.workspaces[0]?.role).toBe(WorkspaceRole.OWNER);
    });

    it('[AC-13.23] refresh token should contain sub, jti, and family claims', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY)
        .expect(201);

      const { data } = res.body as {
        data: { tokens: { refreshToken: string } };
      };

      const payload = await jwtService.verifyAsync<{
        sub: string;
        jti: string;
        family: string;
      }>(data.tokens.refreshToken, { secret: process.env.JWT_REFRESH_SECRET });

      expect(typeof payload.sub).toBe('string');
      expect(typeof payload.jti).toBe('string');
      expect(typeof payload.family).toBe('string');
    });

    it('[AC-13.24] bcrypt hashes stored in refreshToken must differ from plain token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(BASE_REGISTER_BODY)
        .expect(201);

      const { data } = res.body as {
        data: { tokens: { refreshToken: string } };
      };

      const storedTokens = Array.from(refreshTokenStore.values());
      expect(storedTokens).toHaveLength(1);

      const stored = storedTokens[0];
      expect(stored).toBeDefined();

      if (!stored) throw new Error('No stored token found');

      const matches = await bcrypt.compare(
        data.tokens.refreshToken,
        stored.refreshTokenHash,
      );
      expect(matches).toBe(true);
      expect(stored.refreshTokenHash).not.toBe(data.tokens.refreshToken);
    });
  });
});
