import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanId } from '../types/ai.types';

const KNOWN_PLANS = new Set<PlanId>(['free', 'pro', 'business']);

@Injectable()
export class PlanResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePlanForSite(siteId: string): Promise<PlanId> {
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
