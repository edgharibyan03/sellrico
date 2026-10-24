import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EntitlementService, EntitlementSnapshot } from '../billing/entitlement.service';
import { currentUtcMonth } from '../billing/billing-period';
import { PlanLimitException } from '../billing/errors/plan-limit.exception';
import { PlanService } from '../billing/plan.service';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { estimateAiCostUsd } from './ai-cost';

export interface AiReservation {
  userId: string | null;
  siteId: string;
  periodId: string | null;
}

export interface UsageSummaryDto {
  periodStart: string;
  periodEnd: string;
  planId: EntitlementSnapshot['plan']['slug'];
  planName: string;
  priceMonthly: number;
  currency: string;
  status: EntitlementSnapshot['status'];
  features: string[];
  paymentPending: boolean;
  accessRestricted: boolean;
  limits: EntitlementSnapshot['limits'];
  usage: EntitlementSnapshot['usage'];
  remaining: EntitlementSnapshot['remaining'];
  overLimit: EntitlementSnapshot['overLimit'];
  metrics: Array<{
    key: string;
    label: string;
    used: number;
    limit: number | null;
    unit: string;
  }>;
}

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
    private readonly plans: PlanService,
  ) {}

  async getSummary(user: AuthenticatedUser): Promise<UsageSummaryDto> {
    const snapshot = await this.entitlements.resolveForUser(user.id);
    return this.toSummary(snapshot);
  }

  async reserveAiMessage(site: AuthenticatedSite): Promise<AiReservation> {
    const owner = await this.prisma.site.findUnique({
      where: { id: site.id },
      select: { ownerUserId: true },
    });

    if (!owner?.ownerUserId) {
      return this.reserveUnownedSite(site.id);
    }

    const snapshot = await this.entitlements.resolveForUser(owner.ownerUserId);
    const period = await this.getOrCreatePeriod(
      owner.ownerUserId,
      new Date(snapshot.periodStart),
      new Date(snapshot.periodEnd),
    );
    const reserved = await this.prisma.usagePeriod.updateMany({
      where: {
        id: period.id,
        aiMessages: { lt: snapshot.limits.maxAiMessages },
      },
      data: { aiMessages: { increment: 1 } },
    });

    if (reserved.count !== 1) {
      throw new PlanLimitException({
        code: 'AI_MESSAGE_LIMIT_REACHED',
        message: `You've reached your AI message limit. Your ${snapshot.plan.name} plan includes ${snapshot.limits.maxAiMessages.toLocaleString('en-US')} AI messages per month. Upgrade your plan to continue using the AI assistant.`,
        upgradeRequired: true,
        limit: snapshot.limits.maxAiMessages,
        used: snapshot.limits.maxAiMessages,
        plan: snapshot.plan.slug,
      });
    }

    return {
      userId: owner.ownerUserId,
      siteId: site.id,
      periodId: period.id,
    };
  }

  async releaseAiMessage(reservation: AiReservation): Promise<void> {
    if (!reservation.periodId) {
      return;
    }
    await this.prisma.usagePeriod.updateMany({
      where: { id: reservation.periodId, aiMessages: { gt: 0 } },
      data: { aiMessages: { decrement: 1 } },
    });
  }

  async recordTokenUsage(
    reservation: AiReservation,
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      model?: string | null;
      provider?: string | null;
    },
  ): Promise<void> {
    if (!reservation.userId) {
      return;
    }
    const estimated = estimateAiCostUsd({
      provider: usage.provider ?? 'unknown',
      model: usage.model ?? 'unknown',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
    const cost = new Prisma.Decimal(estimated.toFixed(6));

    if (reservation.periodId) {
      await this.prisma.usagePeriod.update({
        where: { id: reservation.periodId },
        data: {
          inputTokens: { increment: usage.inputTokens },
          outputTokens: { increment: usage.outputTokens },
          totalTokens: { increment: usage.totalTokens },
          estimatedCost: { increment: cost },
        },
      });
    }

    await this.prisma.aiUsageRecord.create({
      data: {
        userId: reservation.userId,
        siteId: reservation.siteId,
        usagePeriodId: reservation.periodId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        model: usage.model ?? null,
        provider: usage.provider ?? null,
        estimatedCost: cost,
      },
    });
  }

  private async reserveUnownedSite(siteId: string): Promise<AiReservation> {
    const free = await this.plans.findBySlug('free');
    const period = currentUtcMonth();
    const used = await this.prisma.usageEvent.count({
      where: {
        siteId,
        type: 'chat_message',
        createdAt: { gte: period.start, lt: period.end },
      },
    });
    if (used >= free.maxAiMessages) {
      throw new PlanLimitException({
        code: 'AI_MESSAGE_LIMIT_REACHED',
        message: `You've reached your AI message limit. Your ${free.name} plan includes ${free.maxAiMessages.toLocaleString('en-US')} AI messages per month. Upgrade your plan to continue using the AI assistant.`,
        upgradeRequired: true,
        limit: free.maxAiMessages,
        used,
        plan: 'free',
      });
    }
    return { userId: null, siteId, periodId: null };
  }

  private async getOrCreatePeriod(userId: string, periodStart: Date, periodEnd: Date) {
    const existing = await this.prisma.usagePeriod.findUnique({
      where: { userId_periodStart: { userId, periodStart } },
    });
    if (existing) {
      return existing;
    }
    try {
      return await this.prisma.usagePeriod.create({
        data: { userId, periodStart, periodEnd },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.usagePeriod.findUnique({
          where: { userId_periodStart: { userId, periodStart } },
        });
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  private toSummary(snapshot: EntitlementSnapshot): UsageSummaryDto {
    return {
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      planId: snapshot.plan.slug,
      planName: snapshot.plan.name,
      priceMonthly: snapshot.plan.priceMonthly,
      currency: 'USD',
      status: snapshot.status,
      features: snapshot.plan.features,
      paymentPending: snapshot.paymentPending,
      accessRestricted: snapshot.accessRestricted,
      limits: snapshot.limits,
      usage: snapshot.usage,
      remaining: snapshot.remaining,
      overLimit: snapshot.overLimit,
      metrics: [
        {
          key: 'sites',
          label: 'Sites',
          used: snapshot.usage.sites,
          limit: snapshot.limits.maxSites,
          unit: 'sites',
        },
        {
          key: 'products',
          label: 'Products',
          used: snapshot.usage.products,
          limit: snapshot.limits.maxProducts,
          unit: 'products',
        },
        {
          key: 'ai_messages',
          label: 'AI messages',
          used: snapshot.usage.aiMessages,
          limit: snapshot.limits.maxAiMessages,
          unit: 'messages',
        },
      ],
    };
  }
}
