import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Shoppio API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
    process.env.API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://shoppio:shoppio@localhost:5432/shoppio?schema=public';
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ?? 'test-secret-at-least-16-chars';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots and responds to health', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('connects to the database', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('connects a site and issues a token', async () => {
    const connect = await request(app.getHttpServer())
      .post('/api/v1/auth/connect')
      .send({
        domain: 'https://e2e-example.test',
        name: 'E2E Store',
        pluginVersion: '0.1.0',
      })
      .expect(201);

    expect(connect.body.success).toBe(true);
    expect(connect.body.data.keyId).toMatch(/^spk_/);
    expect(connect.body.data.secret).toMatch(/^sss_/);

    const token = await request(app.getHttpServer())
      .post('/api/v1/auth/token')
      .send({
        keyId: connect.body.data.keyId,
        secret: connect.body.data.secret,
      })
      .expect(201);

    expect(token.body.data.accessToken).toBeDefined();

    const me = await request(app.getHttpServer())
      .get('/api/v1/sites/me')
      .set('Authorization', `Bearer ${token.body.data.accessToken}`)
      .expect(200);

    expect(me.body.data.id).toBe(connect.body.data.siteId);
    expect(me.body.data.domain).toBe('e2e-example.test');
  });
});
