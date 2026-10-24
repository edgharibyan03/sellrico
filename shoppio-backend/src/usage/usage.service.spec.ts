import { HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementService } from '../billing/entitlement.service';
import { PlanService } from '../billing/plan.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UsageService } from './usage.service';

describe('UsageService AI message limits', () => {
  const periodStart = new Date(Date.UTC(2026, 8, 1));
  const periodEnd = new Date(Date.UTC(2026, 9, 1));
  let messages = 0;

  const prisma = {
    site: { findUnique: jest.fn() },
    usagePeriod: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    aiUsageRecord: { create: jest.fn() },
    usageEvent: { count: jest.fn() },
  };
  const entitlements = { resolveForUser: jest.fn() };
  const plans = { findBySlug: jest.fn() };
  const service = new UsageService(
    prisma as unknown as PrismaService,
    entitlements as unknown as EntitlementService,
    plans as unknown as PlanService,
  );

  function useLimit(userId: string, maxAiMessages: number, slug: string) {
    entitlements.resolveForUser.mockImplementation(async (requestedId: string) => ({
      userId: requestedId,
      plan: { name: slug, slug },
      limits: { maxAiMessages },
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }));
  }

  beforeEach(() => {
    messages = 0;
    jest.clearAllMocks();
    prisma.site.findUnique.mockResolvedValue({ ownerUserId: 'user-a' });
    prisma.usagePeriod.findUnique.mockImplementation(async () => ({
      id: 'period-1',
      userId: 'user-a',
      periodStart,
      periodEnd,
      aiMessages: messages,
    }));
    prisma.usagePeriod.updateMany.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: { aiMessages?: { lt?: number; gt?: number } };
        data: { aiMessages?: { increment?: number; decrement?: number } };
      }) => {
        if (where.aiMessages?.lt != null && messages >= where.aiMessages.lt) {
          return { count: 0 };
        }
        if (where.aiMessages?.gt != null && messages <= where.aiMessages.gt) {
          return { count: 0 };
        }
        if (data.aiMessages?.increment) {
          messages += data.aiMessages.increment;
        }
        if (data.aiMessages?.decrement) {
          messages -= data.aiMessages.decrement;
        }
        return { count: 1 };
      },
    );
  });

  async function send() {
    return service.reserveAiMessage({
      id: 'site-1',
      domain: 'shop.test',
      name: 'Shop',
      status: 'ACTIVE',
      credentialId: 'cred',
      keyId: 'key',
    });
  }

  it('allows 100 Free AI messages and rejects the next one', async () => {
    useLimit('user-a', 100, 'free');
    for (let i = 0; i < 100; i += 1) {
      await send();
    }
    await expect(send()).rejects.toBeInstanceOf(HttpException);
    expect(messages).toBe(100);
  });

  it.each([
    ['pro', 2000],
    ['business', 10000],
  ])('enforces the %s monthly AI limit of %s', async (slug, limit) => {
    useLimit('user-a', limit, slug);
    messages = limit - 1;
    await expect(send()).resolves.toMatchObject({ userId: 'user-a' });
    try {
      await send();
      throw new Error('expected the AI limit to reject the next message');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'AI_MESSAGE_LIMIT_REACHED',
        upgradeRequired: true,
        plan: slug,
        limit,
      });
    }
  });

  it('loads usage only for the authenticated account', async () => {
    const userA = { id: 'user-a' } as AuthenticatedUser;
    const userB = { id: 'user-b' } as AuthenticatedUser;
    entitlements.resolveForUser.mockImplementation(async (userId: string) => ({
      userId,
      plan: { name: 'Free', slug: 'free', priceMonthly: 0, features: [] },
      status: 'active',
      paymentPending: false,
      accessRestricted: false,
      limits: { maxSites: 1, maxProducts: 100, maxAiMessages: 100, historyRetentionDays: 30 },
      usage: {
        sites: userId === 'user-a' ? 1 : 0,
        products: 0,
        aiMessages: userId === 'user-a' ? 4 : 0,
      },
      remaining: { sites: 0, products: 100, aiMessages: 100 },
      overLimit: { sites: false, products: false, aiMessages: false },
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }));

    const summaryA = await service.getSummary(userA);
    const summaryB = await service.getSummary(userB);

    expect(entitlements.resolveForUser).toHaveBeenNthCalledWith(1, 'user-a');
    expect(entitlements.resolveForUser).toHaveBeenNthCalledWith(2, 'user-b');
    expect(summaryA.usage.aiMessages).toBe(4);
    expect(summaryB.usage.aiMessages).toBe(0);
    expect(summaryA.usage).not.toEqual(summaryB.usage);
  });
});
