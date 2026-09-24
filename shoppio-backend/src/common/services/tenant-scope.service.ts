import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedSite } from '../types/authenticated-site';

/**
 * Helpers that make tenant-scoped queries explicit.
 * Always pass the authenticated site — never a client-supplied siteId.
 */
@Injectable()
export class TenantScopeService {
  forSite(site: AuthenticatedSite): { siteId: string } {
    return { siteId: site.id };
  }

  productWhere(
    site: AuthenticatedSite,
    externalProductId?: string,
  ): Prisma.ProductWhereInput {
    return {
      siteId: site.id,
      ...(externalProductId ? { externalProductId } : {}),
    };
  }

  conversationWhere(site: AuthenticatedSite): Prisma.ConversationWhereInput {
    return { siteId: site.id };
  }

  usageWhere(site: AuthenticatedSite): Prisma.UsageEventWhereInput {
    return { siteId: site.id };
  }
}
