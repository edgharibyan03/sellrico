import { Injectable } from '@nestjs/common';
import { CredentialStatus, SiteStatus } from '@prisma/client';
import { EntitlementService } from '../billing/entitlement.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

type PlanId = 'free' | 'pro' | 'business';

export interface OverviewStatsDto {
  planId: PlanId;
  planName: string;
  priceMonthly: number;
  currency: string;
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  paymentPending: boolean;
  accessRestricted: boolean;
  features: string[];
  connectedSites: number;
  sitesUsed: number;
  sitesLimit: number;
  aiMessagesUsed: number;
  aiMessagesLimit: number;
  productsSynced: number;
  productsLimit: number;
  overLimit: {
    sites: boolean;
    products: boolean;
    aiMessages: boolean;
  };
  onboardingCompleted: boolean;
  conversationsOpen: number;
  chatMessagesToday: number;
}

export interface ActivityItemDto {
  id: string;
  type: 'site_connected' | 'sync_completed' | 'assistant_updated' | 'usage_alert' | 'chat_message';
  title: string;
  description: string;
  createdAt: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  async getOverview(user: AuthenticatedUser): Promise<OverviewStatsDto> {
    const sites = await this.prisma.site.findMany({
      where: { ownerUserId: user.id },
      include: {
        _count: { select: { conversations: true } },
        credentials: {
          where: { status: CredentialStatus.ACTIVE },
          select: { id: true },
          take: 1,
        },
      },
    });

    const connectedSites = sites.filter(
      (s) => s.status === SiteStatus.ACTIVE && s.credentials.length > 0,
    ).length;

    const conversationsOpen = sites.reduce((sum, s) => sum + s._count.conversations, 0);

    const siteIds = sites.map((s) => s.id);
    const todayStart = this.startOfDay();
    const [snapshot, chatMessagesToday] = await Promise.all([
      this.entitlements.resolveForUser(user.id),
      siteIds.length
        ? this.prisma.usageEvent.count({
            where: {
              siteId: { in: siteIds },
              type: 'chat_message',
              createdAt: { gte: todayStart },
            },
          })
        : Promise.resolve(0),
    ]);

    return {
      planId: snapshot.plan.slug,
      planName: snapshot.plan.name,
      priceMonthly: snapshot.plan.priceMonthly,
      currency: 'USD',
      subscriptionStatus: snapshot.status,
      paymentPending: snapshot.paymentPending,
      accessRestricted: snapshot.accessRestricted,
      features: snapshot.plan.features,
      connectedSites,
      sitesUsed: snapshot.usage.sites,
      sitesLimit: snapshot.limits.maxSites,
      aiMessagesUsed: snapshot.usage.aiMessages,
      aiMessagesLimit: snapshot.limits.maxAiMessages,
      productsSynced: snapshot.usage.products,
      productsLimit: snapshot.limits.maxProducts,
      overLimit: snapshot.overLimit,
      onboardingCompleted: user.onboardingCompleted,
      conversationsOpen,
      chatMessagesToday,
    };
  }

  async getActivity(user: AuthenticatedUser): Promise<ActivityItemDto[]> {
    const sites = await this.prisma.site.findMany({
      where: { ownerUserId: user.id },
      include: {
        credentials: {
          where: { status: CredentialStatus.ACTIVE },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        _count: { select: { products: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const siteIds = sites.map((s) => s.id);
    const items: ActivityItemDto[] = [];

    for (const site of sites) {
      if (site.credentials[0]) {
        items.push({
          id: `site_${site.id}`,
          type: 'site_connected',
          title: 'Store connected',
          description: `${site.domain} is connected to Shoppio.`,
          createdAt: site.credentials[0].createdAt.toISOString(),
        });
      }

      if (site.lastSyncedAt) {
        items.push({
          id: `sync_${site.id}_${site.lastSyncedAt.getTime()}`,
          type: 'sync_completed',
          title: 'Product sync completed',
          description: `${site.domain}: ${site._count.products} product${site._count.products === 1 ? '' : 's'} in catalog.`,
          createdAt: site.lastSyncedAt.toISOString(),
        });
      }
    }

    if (siteIds.length > 0) {
      const recentChats = await this.prisma.usageEvent.findMany({
        where: {
          siteId: { in: siteIds },
          type: 'chat_message',
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          site: { select: { domain: true } },
        },
      });

      for (const event of recentChats) {
        items.push({
          id: `chat_${event.id}`,
          type: 'chat_message',
          title: 'Visitor chat message',
          description: `AI assistant answered a shopper on ${event.site.domain}.`,
          createdAt: event.createdAt.toISOString(),
        });
      }
    }

    return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 12);
  }

  private startOfDay(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
