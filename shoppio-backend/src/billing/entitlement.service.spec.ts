import { PlanLimitException } from './errors/plan-limit.exception';
import { EntitlementService } from './entitlement.service';
import { PLAN_FEATURES } from './plans.catalog';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { Plan, SubscriptionStatus } from '@prisma/client';

function plan(
  overrides: Partial<Plan> &
    Pick<Plan, 'slug' | 'maxSites' | 'maxProducts' | 'maxAiMessages' | 'features'>,
): Plan {
  return {
    id: `plan-${overrides.slug}`,
    name: overrides.slug[0]!.toUpperCase() + overrides.slug.slice(1),
    description: '',
    priceMonthly: overrides.slug === 'pro' ? 19 : overrides.slug === 'business' ? 49 : 0,
    priceAnnual: null,
    historyRetentionDays: overrides.slug === 'business' ? null : overrides.slug === 'pro' ? 90 : 30,
    highlights: [],
    highlighted: overrides.slug === 'pro',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const FREE = plan({
  slug: 'free',
  maxSites: 1,
  maxProducts: 100,
  maxAiMessages: 100,
  features: [
    PLAN_FEATURES.aiProductSearch,
    PLAN_FEATURES.productExclusions,
    PLAN_FEATURES.basicConversationHistory,
  ],
});
const PRO = plan({
  slug: 'pro',
  maxSites: 3,
  maxProducts: 2000,
  maxAiMessages: 2000,
  features: [
    PLAN_FEATURES.aiProductSearch,
    PLAN_FEATURES.productExclusions,
    PLAN_FEATURES.basicConversationHistory,
    PLAN_FEATURES.analytics,
    PLAN_FEATURES.removeBranding,
  ],
});
const BUSINESS = plan({
  slug: 'business',
  maxSites: 10,
  maxProducts: 10000,
  maxAiMessages: 10000,
  features: [
    PLAN_FEATURES.aiProductSearch,
    PLAN_FEATURES.productExclusions,
    PLAN_FEATURES.analytics,
    PLAN_FEATURES.removeBranding,
    PLAN_FEATURES.advancedAnalytics,
    PLAN_FEATURES.unlimitedHistory,
  ],
});

describe('EntitlementService', () => {
  const prisma = {
    plan: { findUniqueOrThrow: jest.fn() },
    site: { count: jest.fn() },
    product: { count: jest.fn() },
    usagePeriod: { findUnique: jest.fn() },
  };
  const subscriptions = { getForUser: jest.fn() };
  const service = new EntitlementService(
    prisma as unknown as PrismaService,
    subscriptions as unknown as SubscriptionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.plan.findUniqueOrThrow.mockResolvedValue(FREE);
    prisma.product.count.mockResolvedValue(0);
    prisma.usagePeriod.findUnique.mockResolvedValue(null);
  });

  function usePlan(
    current: Plan,
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE,
    periodEnd = new Date('2099-01-01T00:00:00.000Z'),
  ) {
    subscriptions.getForUser.mockImplementation(async (userId: string) => ({
      id: `sub-${userId}`,
      userId,
      status,
      currentPeriodEnd: periodEnd,
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
      interval: 'MONTHLY',
      provider: current.slug === 'free' ? 'none' : 'other',
      plan: current,
    }));
  }

  it.each([
    ['free', 0, true, FREE],
    ['free', 1, false, FREE],
    ['pro', 2, true, PRO],
    ['pro', 3, false, PRO],
    ['pro', 4, false, PRO],
    ['business', 9, true, BUSINESS],
    ['business', 10, false, BUSINESS],
  ])('%s plan at %s sites is allowed=%s', async (_label, count, allowed, current) => {
    usePlan(current);
    prisma.site.count.mockResolvedValue(count);

    if (allowed) {
      await expect(service.assertCanCreateSite('user-a')).resolves.toBeDefined();
    } else {
      await expect(service.assertCanCreateSite('user-a')).rejects.toBeInstanceOf(
        PlanLimitException,
      );
    }
  });

  it('scopes site and product counts to the authenticated account', async () => {
    usePlan(FREE);
    prisma.site.count.mockResolvedValue(0);
    await service.resolveForUser('user-a');
    await service.resolveForUser('user-b');

    expect(prisma.site.count).toHaveBeenNthCalledWith(1, {
      where: { ownerUserId: 'user-a', status: { not: 'DISCONNECTED' } },
    });
    expect(prisma.site.count).toHaveBeenNthCalledWith(2, {
      where: { ownerUserId: 'user-b', status: { not: 'DISCONNECTED' } },
    });
    expect(prisma.product.count).toHaveBeenNthCalledWith(1, {
      where: { site: { ownerUserId: 'user-a' } },
    });
    expect(subscriptions.getForUser).toHaveBeenNthCalledWith(1, 'user-a');
    expect(subscriptions.getForUser).toHaveBeenNthCalledWith(2, 'user-b');
  });

  it('exposes Pro features and withholds Business-only features', async () => {
    usePlan(PRO);
    prisma.site.count.mockResolvedValue(1);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.analytics)).resolves.toBe(true);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.removeBranding)).resolves.toBe(true);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.advancedAnalytics)).resolves.toBe(
      false,
    );
  });

  it('exposes Business features including analytics', async () => {
    usePlan(BUSINESS);
    prisma.site.count.mockResolvedValue(1);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.advancedAnalytics)).resolves.toBe(true);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.analytics)).resolves.toBe(true);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.productExclusions)).resolves.toBe(true);
  });

  it('does not treat the plan slug as the feature check', async () => {
    const mislabeled = plan({
      slug: 'free',
      name: 'Free',
      maxSites: 1,
      maxProducts: 100,
      maxAiMessages: 100,
      features: [PLAN_FEATURES.analytics],
    });
    usePlan(mislabeled);
    prisma.site.count.mockResolvedValue(0);
    await expect(service.hasFeature('user-a', PLAN_FEATURES.analytics)).resolves.toBe(true);
  });

  it('restricts an expired paid subscription to Free features without implying data deletion', async () => {
    usePlan(PRO, SubscriptionStatus.EXPIRED, new Date('2020-01-01T00:00:00.000Z'));
    prisma.site.count.mockResolvedValue(3);
    prisma.product.count.mockResolvedValue(500);
    const snapshot = await service.resolveForUser('user-a');
    expect(snapshot.plan.slug).toBe('free');
    expect(snapshot.accessRestricted).toBe(true);
    expect(snapshot.usage.sites).toBe(3);
    expect(snapshot.usage.products).toBe(500);
    expect(snapshot.overLimit.sites).toBe(true);
    expect(snapshot.limits.maxProducts).toBe(100);
  });
});
