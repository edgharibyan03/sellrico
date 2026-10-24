import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EntitlementService } from '../billing/entitlement.service';
import { PlanService } from '../billing/plan.service';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { SyncProductItemDto, SyncProductsDto } from './dto/sync-products.dto';
import { selectProductsWithinLimit } from './product-sync-limit';

export interface DashboardProductDto {
  id: string;
  siteId: string;
  name: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';
  category: string | null;
  syncStatus: 'synced' | 'pending' | 'error';
  updatedAt: string;
  url: string | null;
}

export interface PaginatedProductsDto {
  items: DashboardProductDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductSyncResult {
  upserted: number;
  skipped: number;
  deleted: number;
  total: number;
  accountTotal: number;
  limit: number;
  limitReached: boolean;
  message: string;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
    private readonly plans: PlanService,
  ) {}

  async syncFromPlugin(site: AuthenticatedSite, dto: SyncProductsDto): Promise<ProductSyncResult> {
    const owner = await this.prisma.site.findUnique({
      where: { id: site.id },
      select: { ownerUserId: true },
    });

    const limit = owner?.ownerUserId
      ? (await this.entitlements.resolveForUser(owner.ownerUserId)).limits.maxProducts
      : (await this.plans.findBySlug('free')).maxProducts;

    const accountWhere: Prisma.ProductWhereInput = owner?.ownerUserId
      ? { site: { ownerUserId: owner.ownerUserId } }
      : { siteId: site.id };

    const existing = await this.prisma.product.findMany({
      where: { siteId: site.id },
      select: { externalProductId: true },
    });
    const existingIds = new Set(existing.map((row) => row.externalProductId));
    const keepIds =
      dto.keepExternalIds ??
      (dto.replaceAll ? dto.products.map((product) => String(product.externalProductId)) : null);

    const accountCount = await this.prisma.product.count({ where: accountWhere });
    const removable = keepIds
      ? existing.filter((row) => !keepIds.includes(row.externalProductId)).length
      : 0;
    const projectedCount = Math.max(0, accountCount - removable);

    const { accepted, skipped } = selectProductsWithinLimit({
      incoming: dto.products,
      existingExternalIds: existingIds,
      accountProductCount: projectedCount,
      maxProducts: limit,
    });

    return this.prisma.$transaction(async (tx) => {
      for (const item of accepted) {
        await this.upsertProduct(tx, site.id, item);
      }

      let deleted = 0;
      if (keepIds) {
        const del = await tx.product.deleteMany({
          where: {
            siteId: site.id,
            ...(keepIds.length > 0 ? { externalProductId: { notIn: keepIds } } : {}),
          },
        });
        deleted = del.count;
      }

      await tx.site.update({
        where: { id: site.id },
        data: { lastSyncedAt: new Date() },
      });

      const [total, accountTotal] = await Promise.all([
        tx.product.count({ where: { siteId: site.id } }),
        tx.product.count({ where: accountWhere }),
      ]);
      const limitReached = accountTotal >= limit || skipped > 0;
      const message = limitReached
        ? `${accountTotal} / ${limit} products synced. Plan limit reached. Upgrade to sync more products.`
        : `${accountTotal} / ${limit} products synced.`;

      return {
        upserted: accepted.length,
        skipped,
        deleted,
        total,
        accountTotal,
        limit,
        limitReached,
        message,
      };
    });
  }

  async listForDashboard(
    user: AuthenticatedUser,
    opts: {
      siteId?: string;
      q?: string;
      category?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<PaginatedProductsDto> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 8));
    const siteFilter = await this.ownedSiteFilter(user.id, opts.siteId);

    if (siteFilter.length === 0) {
      return { items: [], page, pageSize, total: 0, totalPages: 0 };
    }

    const category = opts.category?.trim();
    const where: Prisma.ProductWhereInput = {
      siteId: { in: siteFilter },
      ...(opts.q?.trim() ? { name: { contains: opts.q.trim(), mode: 'insensitive' } } : {}),
      ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((p) => this.toDashboardDto(p)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async listCategoriesForDashboard(
    user: AuthenticatedUser,
    opts: { siteId?: string } = {},
  ): Promise<{ categories: string[] }> {
    const siteFilter = await this.ownedSiteFilter(user.id, opts.siteId);
    if (siteFilter.length === 0) {
      return { categories: [] };
    }

    const rows = await this.prisma.product.findMany({
      where: {
        siteId: { in: siteFilter },
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
      take: 200,
    });

    return {
      categories: rows
        .map((row) => row.category)
        .filter((category): category is string => Boolean(category?.trim()))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    };
  }

  private async ownedSiteFilter(userId: string, siteId?: string): Promise<string[]> {
    const ownedSites = await this.prisma.site.findMany({
      where: { ownerUserId: userId },
      select: { id: true },
    });
    const ownedIds = ownedSites.map((site) => site.id);
    if (ownedIds.length === 0) {
      return [];
    }
    if (!siteId) {
      return ownedIds;
    }
    return ownedIds.includes(siteId) ? [siteId] : [];
  }

  private async upsertProduct(
    tx: Prisma.TransactionClient,
    siteId: string,
    item: SyncProductItemDto,
  ): Promise<void> {
    const data = {
      name: item.name,
      description: item.description ?? null,
      price:
        item.price === undefined || item.price === null ? null : new Prisma.Decimal(item.price),
      currency: item.currency ?? null,
      url: item.url ?? null,
      imageUrl: item.imageUrl ?? null,
      stockStatus: item.stockStatus ?? null,
      category: item.category ?? null,
    };

    await tx.product.upsert({
      where: {
        siteId_externalProductId: {
          siteId,
          externalProductId: String(item.externalProductId),
        },
      },
      create: {
        siteId,
        externalProductId: String(item.externalProductId),
        ...data,
      },
      update: data,
    });
  }

  private toDashboardDto(p: {
    id: string;
    siteId: string;
    name: string;
    price: Prisma.Decimal | null;
    currency: string | null;
    imageUrl: string | null;
    stockStatus: string | null;
    category: string | null;
    updatedAt: Date;
    url: string | null;
  }): DashboardProductDto {
    return {
      id: p.id,
      siteId: p.siteId,
      name: p.name,
      price: p.price != null ? Number(p.price) : null,
      currency: p.currency ?? 'USD',
      imageUrl: p.imageUrl,
      stockStatus: this.normalizeStock(p.stockStatus),
      category: p.category,
      syncStatus: 'synced',
      updatedAt: p.updatedAt.toISOString(),
      url: p.url,
    };
  }

  private normalizeStock(value: string | null): 'in_stock' | 'out_of_stock' | 'on_backorder' {
    if (value === 'out_of_stock' || value === 'on_backorder') {
      return value;
    }
    return 'in_stock';
  }
}
