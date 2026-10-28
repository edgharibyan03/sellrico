import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AIToolCall } from '../types/ai.types';
import {
  distinctiveSearchTokens,
  expandTokenStems,
  rankProducts,
  SearchIndustry,
  tokenizeQuery,
} from './catalog-search.rank';

export interface CatalogProductHint {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  url: string | null;
  imageUrl: string | null;
  category?: string | null;
  stockStatus?: string | null;
  description?: string | null;
  sku?: string | null;
  tags?: string[];
  attributes?: Record<string, string | string[]>;
}

export interface CatalogExecuteOptions {
  industry?: SearchIndustry;
}

type ProductRow = {
  id: string;
  name: string;
  price: Prisma.Decimal | null;
  currency: string | null;
  url: string | null;
  imageUrl: string | null;
  category: string | null;
  stockStatus: string | null;
  description: string | null;
  sku: string | null;
  tags: Prisma.JsonValue;
  attributes: Prisma.JsonValue;
};

@Injectable()
export class CatalogToolExecutor {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    siteId: string,
    call: AIToolCall,
    options: CatalogExecuteOptions = {},
  ): Promise<{ result: unknown; products: CatalogProductHint[] }> {
    switch (call.name) {
      case 'list_products':
        return this.listProducts(siteId, call.arguments);
      case 'search_products':
        return this.searchProducts(siteId, call.arguments, options);
      case 'get_product':
        return this.getProduct(siteId, call.arguments);
      case 'get_product_categories':
        return this.getCategories(siteId);
      default:
        return {
          result: { error: `Unknown tool: ${call.name}` },
          products: [],
        };
    }
  }

  private async listProducts(
    siteId: string,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; products: CatalogProductHint[] }> {
    const limit = Math.min(12, Math.max(1, Number(args.limit) || 8));
    const category = String(args.category ?? '').trim();
    const priceWhere = this.priceWhere(args);

    const rows = await this.prisma.product.findMany({
      where: {
        siteId,
        ...(category
          ? { category: { contains: category, mode: 'insensitive' as const } }
          : {}),
        ...priceWhere,
      },
      orderBy: [{ price: 'asc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return this.toToolPayload(rows);
  }

  private async searchProducts(
    siteId: string,
    args: Record<string, unknown>,
    options: CatalogExecuteOptions,
  ): Promise<{ result: unknown; products: CatalogProductHint[] }> {
    const query = String(args.query ?? '').trim();
    const limit = Math.min(10, Math.max(1, Number(args.limit) || 8));
    const priceWhere = this.priceWhere(args);
    const tokens = tokenizeQuery(query);
    const fetchTokens = distinctiveSearchTokens(query);
    const industry = options.industry ?? 'auto';

    let rows: ProductRow[];
    if (tokens.length === 0) {
      rows = await this.prisma.product.findMany({
        where: { siteId, ...priceWhere },
        orderBy: [{ updatedAt: 'desc' }, { price: 'asc' }],
        take: limit,
      });
    } else {
      const candidateLimit = Math.min(120, Math.max(40, limit * 12));
      const containsAny = (stems: string[]) =>
        stems.flatMap((stem) => [
          { name: { contains: stem, mode: 'insensitive' as const } },
          { description: { contains: stem, mode: 'insensitive' as const } },
          { category: { contains: stem, mode: 'insensitive' as const } },
          { sku: { contains: stem, mode: 'insensitive' as const } },
        ]);

      const andWhere =
        fetchTokens.length > 1
          ? {
              AND: fetchTokens.map((token) => ({
                OR: containsAny(expandTokenStems(token)),
              })),
            }
          : {
              OR: containsAny(expandTokenStems(fetchTokens[0]!)),
            };

      rows = await this.prisma.product.findMany({
        where: {
          siteId,
          ...priceWhere,
          ...andWhere,
        },
        take: candidateLimit,
      });

      if (rows.length === 0 && fetchTokens.length > 1) {
        rows = await this.prisma.product.findMany({
          where: {
            siteId,
            ...priceWhere,
            OR: fetchTokens.flatMap((token) =>
              containsAny(expandTokenStems(token)),
            ),
          },
          take: candidateLimit,
        });
      }

      if (rows.length === 0) {
        rows = await this.prisma.product.findMany({
          where: {
            siteId,
            ...priceWhere,
            OR: tokens.flatMap((token) => containsAny(expandTokenStems(token))),
          },
          take: candidateLimit,
        });
      }

      // Tags/attributes are JSON — pull a wider set and rank in-app when text fields miss.
      if (rows.length < limit) {
        const extra = await this.prisma.product.findMany({
          where: { siteId, ...priceWhere },
          orderBy: [{ updatedAt: 'desc' }],
          take: Math.min(200, candidateLimit),
        });
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const row of extra) {
          byId.set(row.id, row);
        }
        rows = [...byId.values()];
      }

      const ranked = rankProducts(
        query,
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          price: row.price != null ? Number(row.price) : null,
          sku: row.sku,
          tags: this.asStringArray(row.tags),
          attributes: this.asAttributeMap(row.attributes),
        })),
        limit,
        { industry },
      );
      const byId = new Map(rows.map((row) => [row.id, row]));
      rows = ranked.map((item) => byId.get(item.id)!).filter(Boolean);

      if (rows.length === 0 && !priceWhere.price) {
        rows = await this.prisma.product.findMany({
          where: { siteId, ...priceWhere },
          orderBy: [{ updatedAt: 'desc' }, { price: 'asc' }],
          take: Math.min(5, limit),
        });
      }
    }

    return this.toToolPayload(rows);
  }

  private priceWhere(args: Record<string, unknown>): {
    price?: { gte?: number; lte?: number };
  } {
    const maxPrice = this.parsePriceArg(args.maxPrice);
    const minPrice = this.parsePriceArg(args.minPrice);
    if (maxPrice == null && minPrice == null) {
      return {};
    }
    return {
      price: {
        ...(minPrice != null ? { gte: minPrice } : {}),
        ...(maxPrice != null ? { lte: maxPrice } : {}),
      },
    };
  }

  private parsePriceArg(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  private async getProduct(
    siteId: string,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; products: CatalogProductHint[] }> {
    const productId = String(args.productId ?? '').trim();
    if (!productId) {
      return { result: { error: 'productId is required' }, products: [] };
    }

    const row = await this.prisma.product.findFirst({
      where: { id: productId, siteId },
    });
    if (!row) {
      return { result: { error: 'Product not found' }, products: [] };
    }

    const product = this.toHint(row, true);
    return {
      result: {
        product: this.serializeForModel(product),
      },
      products: [product],
    };
  }

  private async getCategories(
    siteId: string,
  ): Promise<{ result: unknown; products: CatalogProductHint[] }> {
    const rows = await this.prisma.product.findMany({
      where: { siteId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      take: 50,
    });
    const categories = rows
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));

    return { result: { categories }, products: [] };
  }

  private toToolPayload(
    rows: ProductRow[],
  ): { result: unknown; products: CatalogProductHint[] } {
    const products = rows.map((p) => this.toHint(p));
    return {
      result: {
        count: products.length,
        note:
          'Product cards with photos/prices are shown automatically between your intro and follow-up. Do not list product names or prices in the text. Write a short intro, blank line, optional follow-up question. Only mention attributes that appear on the product objects. If size/color/spec is missing, say it is unavailable.',
        products: products.map((p) => this.serializeForModel(p)),
      },
      products,
    };
  }

  private serializeForModel(p: CatalogProductHint) {
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      url: p.url,
      imageUrl: p.imageUrl,
      hasImage: Boolean(p.imageUrl),
      category: p.category,
      stockStatus: p.stockStatus,
      ...(p.sku ? { sku: p.sku } : {}),
      ...(p.tags && p.tags.length ? { tags: p.tags } : {}),
      ...(p.attributes && Object.keys(p.attributes).length
        ? { attributes: p.attributes }
        : {}),
      ...(p.description != null ? { description: p.description } : {}),
    };
  }

  private toHint(p: ProductRow, withDescription = false): CatalogProductHint {
    return {
      id: p.id,
      name: p.name,
      price: p.price != null ? Number(p.price) : null,
      currency: p.currency,
      url: p.url,
      imageUrl: p.imageUrl,
      category: p.category ?? null,
      stockStatus: p.stockStatus ?? null,
      sku: p.sku ?? null,
      tags: this.asStringArray(p.tags),
      attributes: this.asAttributeMap(p.attributes),
      ...(withDescription ? { description: p.description ?? null } : {}),
    };
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 40);
  }

  private asAttributeMap(
    value: Prisma.JsonValue,
  ): Record<string, string | string[]> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    const out: Record<string, string | string[]> = {};
    for (const [key, raw] of Object.entries(value)) {
      const label = String(key).trim().slice(0, 80);
      if (!label) continue;
      if (typeof raw === 'string' && raw.trim()) {
        out[label] = raw.trim().slice(0, 120);
      } else if (Array.isArray(raw)) {
        const values = raw
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 20);
        if (values.length) out[label] = values;
      }
    }
    return out;
  }
}
