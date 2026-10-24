import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Plan, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CATALOG, PlanCatalogEntry, PlanSlug } from './plans.catalog';

@Injectable()
export class PlanService implements OnModuleInit {
  private readonly logger = new Logger(PlanService.name);
  private seeding: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSeeded();
    } catch (error) {
      this.logger.warn(
        `Plan catalog was not seeded (${error instanceof Error ? error.message : 'unknown error'}). It will be retried on the next request.`,
      );
      this.seeding = null;
    }
  }

  async ensureSeeded(): Promise<void> {
    if (!this.seeding) {
      this.seeding = this.seed().catch((error: unknown) => {
        this.seeding = null;
        throw error;
      });
    }
    await this.seeding;
  }

  async listActive(): Promise<Plan[]> {
    await this.ensureSeeded();
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async findBySlug(slug: PlanSlug): Promise<Plan> {
    await this.ensureSeeded();
    return this.prisma.plan.findUniqueOrThrow({ where: { slug } });
  }

  private async seed(): Promise<void> {
    for (const entry of PLAN_CATALOG) {
      const data = this.toWriteData(entry);
      await this.prisma.plan.upsert({
        where: { slug: entry.slug },
        create: data,
        update: data,
      });
    }
  }

  private toWriteData(entry: PlanCatalogEntry): Prisma.PlanCreateInput {
    return {
      slug: entry.slug,
      name: entry.name,
      description: entry.description,
      priceMonthly: entry.priceMonthly,
      priceAnnual: entry.priceAnnual,
      maxSites: entry.maxSites,
      maxProducts: entry.maxProducts,
      maxAiMessages: entry.maxAiMessages,
      historyRetentionDays: entry.historyRetentionDays,
      features: entry.features,
      highlights: entry.highlights,
      highlighted: entry.highlighted,
      isActive: true,
    };
  }
}
