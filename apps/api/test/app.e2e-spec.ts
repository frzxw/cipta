import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from '../src/bootstrap';
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
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) should return hello without authentication', () => {
    return request(app.getHttpServer()).get('/v1').expect(200);
  });

  it('/v1/docs (GET) should expose Swagger UI', () => {
    return request(app.getHttpServer()).get('/v1/docs').expect(200);
  });

  it('/v1/docs-json (GET) should expose OpenAPI JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/docs-json')
      .expect(200);

    const body: unknown = response.body;
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();

    if (!body || typeof body !== 'object') {
      throw new Error('OpenAPI response body must be an object');
    }

    const document = body as Record<string, unknown>;
    const openapi = document.openapi;
    const info = document.info;

    expect(typeof openapi).toBe('string');
    expect(typeof info).toBe('object');
    expect(info).not.toBeNull();

    if (!info || typeof info !== 'object') {
      throw new Error('OpenAPI info must be an object');
    }

    expect((info as Record<string, unknown>).title).toBe('Cipta API');
  });

  it('/v1/auth/login (POST) should throttle rapid requests', async () => {
    const body = {
      email: 'tester@example.com',
      password: 'SecureP@ss1',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send(body)
      .expect(429);
  });

  it('/v1/auth/register (POST) should throttle rapid requests', async () => {
    const body = {
      email: 'new@example.com',
      password: 'SecureP@ss1',
      displayName: 'New User',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(body)
      .expect(429);
  });
});
