import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from './config/app-config.service';
import { validationSchema } from './config/validation.schema';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppConfigService', () => {
  it('loads validated configuration', async () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.API_URL = 'http://localhost:3000/api/v1';
    process.env.DATABASE_URL = 'postgresql://shoppio:shoppio@localhost:5432/shoppio';
    process.env.JWT_SECRET = 'test-secret-at-least-16-chars';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema,
          ignoreEnvFile: true,
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    const config = module.get(AppConfigService);
    expect(config.appUrl).toBe('http://localhost:3000');
    expect(config.jwtSecret.length).toBeGreaterThanOrEqual(16);
  });
});

describe('AuthService', () => {
  it('can be instantiated', async () => {
    const prismaMock = {
      site: { create: jest.fn() },
      siteCredential: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AppConfigService,
          useValue: {
            jwtSecret: 'test-secret-at-least-16-chars',
            jwtExpiresIn: '1h',
          },
        },
      ],
    }).compile();

    const auth = module.get(AuthService);
    expect(auth).toBeDefined();
  });
});
