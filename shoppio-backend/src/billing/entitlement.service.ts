import { Injectable } from '@nestjs/common';
import { Plan, Prisma, SiteStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { currentUtcMonth, historyCutoff } from './billing-period';
import { PlanLimitException } from './errors/plan-limit.exception';
import { resolveEffectivePlan } from './effective-plan';
import { PlanFeature, PlanSlug } from './plans.catalog';
import { SubscriptionService, SubscriptionWithPlan } from './subscription.service';

export interface EntitlementSnapshot {
  userId: string;
  plan: {
    id: string;
    slug: PlanSlug;
    name: string;
    description: string;
    priceMonthly: number;
    priceAnnual: number | null;
    features: string[];
    highlights: string[];
    highlighted: boolean;
  };
  storedPlanSlug: PlanSlug;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  accessRestricted: boolean;
  paymentPending: boolean;
  limits: {
    maxSites: number;
    maxProducts: number;
    maxAiMessages: number;
    historyRetentionDays: number | null;
  };
  usage: {
    sites: number;
    products: number;
    aiMessages: number;
  };
  remaining: {
    sites: number;
    products: number;
    aiMessages: number;
  };
  overLimit: {
    sites: boolean;
    products: boolean;
    aiMessages: boolean;
  };
  periodStart: string;
  periodEnd: string;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  interval: 'monthly' | 'annual';
  provider: string;
}

@Injectable()
export class EntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  async resolveForUser(userId: string, now = new Date()): Promise<EntitlementSnapshot> {
    const subscription = await this.subscriptions.getForUser(userId);
    const free =
      subscription.plan.slug === 'free'
        ? subscription.plan
        : await this.prisma.plan.findUniqueOrThrow({ where: { slug: 'free' } });

    const effective = resolveEffectivePlan({
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: subscription.plan,
      },
      freePlan: free,
      now,
    });

    const period = currentUtcMonth(now);
    const [sites, products, usagePeriod] = await Promise.all([
      this.prisma.site.count({
        where: {
          ownerUserId: userId,
          status: { not: SiteStatus.DISCONNECTED },
        },
      }),
      this.prisma.product.count({
        where: { site: { ownerUserId: userId } },
      }),
      this.prisma.usagePeriod.findUnique({
        where: {
          userId_periodStart: { userId, periodStart: period.start },
        },
      }),
    ]);

    return this.toSnapshot({
      userId,
      effectivePlan: effective.plan,
      accessRestricted: effective.accessRestricted,
      subscription,
      sites,
      products,
      aiMessages: usagePeriod?.aiMessages ?? 0,
      period,
    });
  }

  async resolveForSite(siteId: string, now = new Date()): Promise<EntitlementSnapshot | null> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { ownerUserId: true },
    });
    if (!site?.ownerUserId) {
      return null;
    }
    const snapshot = await this.resolveForUser(site.ownerUserId, now);
    return snapshot;
  }

  async hasFeature(userId: string, feature: PlanFeature | string): Promise<boolean> {
    const snapshot = await this.resolveForUser(userId);
    return snapshot.plan.features.includes(feature);
  }

  async assertCanCreateSite(userId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.resolveForUser(userId);
    if (snapshot.usage.sites >= snapshot.limits.maxSites) {
      const exceeded = snapshot.usage.sites > snapshot.limits.maxSites;
      throw new PlanLimitException({
        code: 'SITE_LIMIT_REACHED',
        message: exceeded
          ? `Plan limit exceeded. Current: ${snapshot.usage.sites} sites. ${snapshot.plan.name} limit: ${snapshot.limits.maxSites} site${snapshot.limits.maxSites === 1 ? '' : 's'}. Please remove sites or upgrade your plan.`
          : `You've reached your site limit. Your ${snapshot.plan.name} plan includes ${snapshot.limits.maxSites} WooCommerce site${snapshot.limits.maxSites === 1 ? '' : 's'}. Upgrade your plan to connect more sites.`,
        upgradeRequired: true,
        limit: snapshot.limits.maxSites,
        used: snapshot.usage.sites,
        plan: snapshot.plan.slug,
      });
    }
    return snapshot;
  }

  historyVisibleSince(snapshot: EntitlementSnapshot, now = new Date()): Date | null {
    return historyCutoff(snapshot.limits.historyRetentionDays, now);
  }

  private toSnapshot(input: {
    userId: string;
    effectivePlan: Plan;
    accessRestricted: boolean;
    subscription: SubscriptionWithPlan;
    sites: number;
    products: number;
    aiMessages: number;
    period: { start: Date; end: Date };
  }): EntitlementSnapshot {
    const plan = input.effectivePlan;
    const slug = this.asSlug(plan.slug);
    const limits = {
      maxSites: plan.maxSites,
      maxProducts: plan.maxProducts,
      maxAiMessages: plan.maxAiMessages,
      historyRetentionDays: plan.historyRetentionDays,
    };
    return {
      userId: input.userId,
      plan: {
        id: plan.id,
        slug,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        features: this.stringList(plan.features),
        highlights: this.stringList(plan.highlights),
        highlighted: plan.highlighted,
      },
      storedPlanSlug: this.asSlug(input.subscription.plan.slug),
      status: this.mapStatus(input.subscription.status),
      accessRestricted: input.accessRestricted,
      paymentPending: input.subscription.status === SubscriptionStatus.PAST_DUE,
      limits,
      usage: {
        sites: input.sites,
        products: input.products,
        aiMessages: input.aiMessages,
      },
      remaining: {
        sites: Math.max(0, limits.maxSites - input.sites),
        products: Math.max(0, limits.maxProducts - input.products),
        aiMessages: Math.max(0, limits.maxAiMessages - input.aiMessages),
      },
      overLimit: {
        sites: input.sites > limits.maxSites,
        products: input.products > limits.maxProducts,
        aiMessages: input.aiMessages > limits.maxAiMessages,
      },
      periodStart: input.period.start.toISOString(),
      periodEnd: input.period.end.toISOString(),
      renewsAt:
        input.subscription.status === SubscriptionStatus.CANCELED
          ? null
          : input.subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: input.subscription.cancelAtPeriodEnd,
      interval: input.subscription.interval === 'ANNUAL' ? 'annual' : 'monthly',
      provider: input.subscription.provider,
    };
  }

  private asSlug(slug: string): PlanSlug {
    if (slug === 'pro' || slug === 'business') {
      return slug;
    }
    return 'free';
  }

  private mapStatus(status: SubscriptionStatus): EntitlementSnapshot['status'] {
    switch (status) {
      case SubscriptionStatus.TRIALING:
        return 'trialing';
      case SubscriptionStatus.PAST_DUE:
        return 'past_due';
      case SubscriptionStatus.CANCELED:
        return 'canceled';
      case SubscriptionStatus.EXPIRED:
        return 'expired';
      default:
        return 'active';
    }
  }

  private stringList(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }
}
