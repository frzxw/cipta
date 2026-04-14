import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  const authServiceMock = {
    register: jest.fn().mockResolvedValue({
      user: {
        id: 'usr-1',
        email: 'tester@example.com',
        displayName: 'Tester',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      workspace: {
        id: 'ws-1',
        name: "Tester's Workspace",
        slug: 'testers-workspace',
        role: 'OWNER',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      },
    }),
    login: jest.fn().mockResolvedValue({
      user: {
        id: 'usr-1',
        email: 'tester@example.com',
        displayName: 'Tester',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      },
    }),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const prismaServiceMock = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .overrideProvider(PrismaService)
      .useValue(prismaServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) should return hello without authentication', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('/auth/login (POST) should throttle rapid requests', async () => {
    const httpServer = app.getHttpServer();
    const body = {
      email: 'tester@example.com',
      password: 'SecureP@ss1',
    };

    await request(httpServer).post('/auth/login').send(body).expect(201);

    await request(httpServer).post('/auth/login').send(body).expect(429);
  });

  it('/auth/register (POST) should throttle rapid requests', async () => {
    const httpServer = app.getHttpServer();
    const body = {
      email: 'new@example.com',
      password: 'SecureP@ss1',
      displayName: 'New User',
    };

    await request(httpServer).post('/auth/register').send(body).expect(201);

    await request(httpServer).post('/auth/register').send(body).expect(429);
  });
});
