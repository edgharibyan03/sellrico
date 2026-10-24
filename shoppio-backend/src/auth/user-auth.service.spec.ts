import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SubscriptionService } from '../billing/subscription.service';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserAuthService } from './user-auth.service';

describe('UserAuthService', () => {
  let service: UserAuthService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const subscriptions = {
    prepareFreeAssignment: jest.fn(),
    attachFreePlan: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        UserAuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SubscriptionService, useValue: subscriptions },
        {
          provide: AppConfigService,
          useValue: {
            jwtSecret: 'test-secret-at-least-16-chars',
            jwtExpiresIn: '1h',
          },
        },
      ],
    }).compile();

    service = module.get(UserAuthService);
  });

  it('registers a new user and returns a session', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    prismaMock.user.create.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'alex@example.com',
      name: 'Alex',
      passwordHash: 'hash',
      onboardingCompleted: false,
      onboardingStep: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const session = await service.register({
      name: 'Alex',
      email: 'Alex@Example.com',
      password: 'password123',
    });

    expect(session.user.email).toBe('alex@example.com');
    expect(session.user.onboardingCompleted).toBe(false);
    expect(session.accessToken).toBeTruthy();
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(subscriptions.prepareFreeAssignment).toHaveBeenCalled();
    expect(subscriptions.attachFreePlan).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      prismaMock,
    );
  });

  it('rejects duplicate email on register', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register({
        name: 'Alex',
        email: 'alex@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects login with unknown email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns a generic forgot-password message', () => {
    const result = service.forgotPassword({ email: 'anyone@example.com' });
    expect(result.message).toMatch(/if an account exists/i);
  });
});
