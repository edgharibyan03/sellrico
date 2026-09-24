import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { SyncProductItemDto, SyncProductsDto } from './dto/sync-products.dto';

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

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async syncFromPlugin(
    site: AuthenticatedSite,
    dto: SyncProductsDto,
  ): Promise<{ upserted: number; deleted: number; total: number }> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.products) {
        await this.upsertProduct(tx, site.id, item);
      }

      const keepIds =
        dto.keepExternalIds ??
        (dto.replaceAll ? dto.products.map((p) => String(p.externalProductId)) : null);

      let deleted = 0;
      if (keepIds) {
        const del = await tx.product.deleteMany({
          where: {
            siteId: site.id,
            ...(keepIds.length > 0
              ? { externalProductId: { notIn: keepIds } }
              : {}),
          },
        });
        deleted = del.count;
      }

      await tx.site.update({
        where: { id: site.id },
        data: { lastSyncedAt: new Date() },
      });

      const total = await tx.product.count({ where: { siteId: site.id } });
      return { upserted: dto.products.length, deleted, total };
    });
  }

  async listForDashboard(
    user: AuthenticatedUser,
    opts: { siteId?: string; q?: string; page?: number; pageSize?: number },
  ): Promise<PaginatedProductsDto> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 8));

    const ownedSites = await this.prisma.site.findMany({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    const ownedIds = ownedSites.map((s) => s.id);

    if (ownedIds.length === 0) {
      return { items: [], page, pageSize, total: 0, totalPages: 0 };
    }

    let siteFilter = ownedIds;
    if (opts.siteId) {
      if (!ownedIds.includes(opts.siteId)) {
        return { items: [], page, pageSize, total: 0, totalPages: 0 };
      }
      siteFilter = [opts.siteId];
    }

    const where: Prisma.ProductWhereInput = {
      siteId: { in: siteFilter },
      ...(opts.q?.trim()
        ? { name: { contains: opts.q.trim(), mode: 'insensitive' } }
        : {}),
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

  private async upsertProduct(
    tx: Prisma.TransactionClient,
    siteId: string,
    item: SyncProductItemDto,
  ): Promise<void> {
    const data = {
      name: item.name,
      description: item.description ?? null,
      price:
        item.price === undefined || item.price === null
          ? null
          : new Prisma.Decimal(item.price),
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

  private normalizeStock(
    value: string | null,
  ): 'in_stock' | 'out_of_stock' | 'on_backorder' {
    if (value === 'out_of_stock' || value === 'on_backorder') {
      return value;
    }
    return 'in_stock';
  }
}
