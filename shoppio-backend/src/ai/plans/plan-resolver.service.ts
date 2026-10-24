import { Injectable } from '@nestjs/common';
import { EntitlementService } from '../../billing/entitlement.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanId } from '../types/ai.types';

const KNOWN_PLANS = new Set<PlanId>(['free', 'pro', 'business']);

@Injectable()
export class PlanResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  async resolvePlanForSite(siteId: string): Promise<PlanId> {
    const snapshot = await this.entitlements.resolveForSite(siteId);
    if (snapshot) {
      return snapshot.plan.slug;
    }
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { planId: true },
    });
    return this.normalize(site?.planId);
  }

  normalize(planId: string | null | undefined): PlanId {
    const value = (planId ?? 'free').toLowerCase();
    if (KNOWN_PLANS.has(value as PlanId)) {
      return value as PlanId;
    }
    return 'free';
  }
}
