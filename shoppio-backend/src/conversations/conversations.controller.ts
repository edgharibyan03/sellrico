import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { TenantScopeService } from '../common/services/tenant-scope.service';
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
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List conversations for the authenticated site',
    description: 'Placeholder for future AI chat persistence.',
  })
  async list(@CurrentSite() site: AuthenticatedSite) {
    const conversations = await this.prisma.conversation.findMany({
      where: this.tenantScope.conversationWhere(site),
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    return {
      items: conversations,
      note: 'AI conversations are not implemented yet',
    };
  }
}
