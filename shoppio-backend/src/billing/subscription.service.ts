import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingInterval, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { currentUtcMonth } from './billing-period';
import { PlanSlug } from './plans.catalog';
import { PlanService } from './plan.service';

const subscriptionInclude = {
  plan: true,
} satisfies Prisma.SubscriptionInclude;

export type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlanService,
  ) {}

  async prepareFreeAssignment(): Promise<void> {
    await this.plans.ensureSeeded();
  }

  async ensureFreePlan(userId: string): Promise<SubscriptionWithPlan> {
    await this.plans.ensureSeeded();
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
      include: subscriptionInclude,
    });
    if (existing) {
      return this.refreshOpenPeriod(existing);
    }

    const free = await this.plans.findBySlug('free');
    const period = currentUtcMonth();
    const created = await this.prisma.subscription.create({
      data: {
        userId,
        planId: free.id,
        provider: 'none',
        status: SubscriptionStatus.ACTIVE,
        interval: BillingInterval.MONTHLY,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
      include: subscriptionInclude,
    });
    await this.syncSitePlanSlug(userId, 'free');
    return created;
  }

  /** Attach Free inside an existing user-creation transaction. Plans must already be seeded. */
  async attachFreePlan(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    const existing = await tx.subscription.findUnique({ where: { userId } });
    if (existing) {
      return;
    }
    const free = await this.plans.findBySlug('free');
    const period = currentUtcMonth();
    await tx.subscription.create({
      data: {
        userId,
        planId: free.id,
        provider: 'none',
        status: SubscriptionStatus.ACTIVE,
        interval: BillingInterval.MONTHLY,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
    });
  }

  async getForUser(userId: string): Promise<SubscriptionWithPlan> {
    return this.ensureFreePlan(userId);
  }

  /**
   * Internal plan assignment for tests and future payment-provider webhooks.
   * Does not delete sites, products, or conversations.
   */
  async assignPlan(
    userId: string,
    slug: PlanSlug,
    options?: {
      status?: SubscriptionStatus;
      provider?: string;
      currentPeriodEnd?: Date;
    },
  ): Promise<SubscriptionWithPlan> {
    await this.ensureFreePlan(userId);
    const plan = await this.plans.findBySlug(slug);
    const period = currentUtcMonth();
    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        planId: plan.id,
        status: options?.status ?? SubscriptionStatus.ACTIVE,
        provider: options?.provider ?? (slug === 'free' ? 'none' : 'none'),
        ...(slug === 'free' ? { providerCustomerId: null, providerSubscriptionId: null } : {}),
        interval: BillingInterval.MONTHLY,
        cancelAtPeriodEnd: false,
        currentPeriodStart: period.start,
        currentPeriodEnd: options?.currentPeriodEnd ?? period.end,
      },
      include: subscriptionInclude,
    });
    await this.syncSitePlanSlug(userId, slug);
    return updated;
  }

  async downgradeToFree(userId: string): Promise<SubscriptionWithPlan> {
    return this.assignPlan(userId, 'free', { status: SubscriptionStatus.ACTIVE, provider: 'none' });
  }

  async assertKnownSlug(slug: string): Promise<PlanSlug> {
    if (slug === 'free' || slug === 'pro' || slug === 'business') {
      return slug;
    }
    throw new BadRequestException({
      code: 'UNKNOWN_PLAN',
      message: 'Unknown plan',
    });
  }

  private async refreshOpenPeriod(
    subscription: SubscriptionWithPlan,
  ): Promise<SubscriptionWithPlan> {
    if (subscription.provider !== 'none') {
      return subscription;
    }
    if (subscription.currentPeriodEnd.getTime() > Date.now()) {
      return subscription;
    }
    const period = currentUtcMonth();
    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
      include: subscriptionInclude,
    });
  }

  private async syncSitePlanSlug(userId: string, slug: PlanSlug): Promise<void> {
    await this.prisma.site.updateMany({
      where: { ownerUserId: userId },
      data: { planId: slug },
    });
  }
}
