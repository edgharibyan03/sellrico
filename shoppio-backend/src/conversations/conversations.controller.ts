import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { EntitlementService } from '../billing/entitlement.service';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(SiteAuthGuard)
@ApiBearerAuth('site-jwt')
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List conversations for the authenticated site',
    description: 'Placeholder for future AI chat persistence.',
  })
  async list(@CurrentSite() site: AuthenticatedSite) {
    const snapshot = await this.entitlements.resolveForSite(site.id);
    const cutoff = snapshot ? this.entitlements.historyVisibleSince(snapshot) : null;
    const conversations = await this.prisma.conversation.findMany({
      where: {
        ...this.tenantScope.conversationWhere(site),
        ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    return {
      items: conversations,
      historyRetentionDays: snapshot?.limits.historyRetentionDays ?? null,
      note: cutoff
        ? 'Older conversations stay stored and become visible again if the plan allows a longer history.'
        : undefined,
    };
  }
}
