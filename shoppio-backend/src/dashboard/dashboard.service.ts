import { Injectable } from '@nestjs/common';
import { CredentialStatus, SiteStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

type PlanId = 'free' | 'pro' | 'business';

const PLAN_AI_LIMITS: Record<PlanId, number | null> = {
  free: 500,
  pro: 5000,
  business: 25000,
};

export interface OverviewStatsDto {
  planId: PlanId;
  connectedSites: number;
  aiMessagesUsed: number;
  aiMessagesLimit: number | null;
  productsSynced: number;
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
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: AuthenticatedUser): Promise<OverviewStatsDto> {
    const sites = await this.prisma.site.findMany({
      where: { ownerUserId: user.id },
      include: {
        _count: { select: { products: true, conversations: true } },
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

    const productsSynced = sites.reduce((sum, s) => sum + s._count.products, 0);
    const conversationsOpen = sites.reduce((sum, s) => sum + s._count.conversations, 0);

    const planId = this.resolvePlan(sites.map((s) => s.planId));
    const siteIds = sites.map((s) => s.id);

    const periodStart = this.startOfMonth();
    const todayStart = this.startOfDay();

    const [aiMessagesUsed, chatMessagesToday] = siteIds.length
      ? await Promise.all([
          this.prisma.usageEvent.count({
            where: {
              siteId: { in: siteIds },
              type: 'chat_message',
              createdAt: { gte: periodStart },
            },
          }),
          this.prisma.usageEvent.count({
            where: {
              siteId: { in: siteIds },
              type: 'chat_message',
              createdAt: { gte: todayStart },
            },
          }),
        ])
      : [0, 0];

    return {
      planId,
      connectedSites,
      aiMessagesUsed,
      aiMessagesLimit: PLAN_AI_LIMITS[planId],
      productsSynced,
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

    return items
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 12);
  }

  private resolvePlan(planIds: string[]): PlanId {
    const rank: Record<PlanId, number> = { free: 0, pro: 1, business: 2 };
    let best: PlanId = 'free';
    for (const raw of planIds) {
      const id = raw.toLowerCase() as PlanId;
      if (id in rank && rank[id] > rank[best]) {
        best = id;
      }
    }
    return best;
  }

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private startOfDay(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
