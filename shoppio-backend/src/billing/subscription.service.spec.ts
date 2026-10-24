import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService downgrade', () => {
  const periodEnd = new Date('2099-02-01T00:00:00.000Z');
  const proPlan = {
    id: 'plan-pro',
    slug: 'pro',
    name: 'Pro',
  };
  const freePlan = {
    id: 'plan-free',
    slug: 'free',
    name: 'Free',
  };
  const existing = {
    id: 'sub-1',
    userId: 'user-a',
    planId: proPlan.id,
    provider: 'other',
    status: SubscriptionStatus.ACTIVE,
    interval: 'MONTHLY',
    currentPeriodStart: new Date('2099-01-01T00:00:00.000Z'),
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    plan: proPlan,
  };

  const prisma = {
    subscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    site: {
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    conversation: {
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const plans = {
    ensureSeeded: jest.fn(),
    findBySlug: jest.fn(async (slug: string) => (slug === 'free' ? freePlan : proPlan)),
  };

  const service = new SubscriptionService(
    prisma as unknown as PrismaService,
    plans as unknown as PlanService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.subscription.findUnique.mockResolvedValue(existing);
    prisma.subscription.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...existing,
        ...data,
        plan: freePlan,
      }),
    );
    prisma.site.updateMany.mockResolvedValue({ count: 3 });
  });

  it('moves the account to Free and leaves sites, products, and conversations in place', async () => {
    const updated = await service.downgradeToFree('user-a');

    expect(updated.plan.slug).toBe('free');
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a' },
        data: expect.objectContaining({ planId: freePlan.id, status: SubscriptionStatus.ACTIVE }),
      }),
    );
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: { ownerUserId: 'user-a' },
      data: { planId: 'free' },
    });
    expect(prisma.site.delete).not.toHaveBeenCalled();
    expect(prisma.site.deleteMany).not.toHaveBeenCalled();
    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(prisma.product.deleteMany).not.toHaveBeenCalled();
    expect(prisma.conversation.delete).not.toHaveBeenCalled();
    expect(prisma.conversation.deleteMany).not.toHaveBeenCalled();
  });
});
