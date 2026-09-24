import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('usage')
@Controller('usage')
@UseGuards(SiteAuthGuard)
@ApiBearerAuth('site-jwt')
export class UsageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List usage events for the authenticated site',
    description: 'Placeholder for future AI/API usage metering.',
  })
  async list(@CurrentSite() site: AuthenticatedSite) {
    const events = await this.prisma.usageEvent.findMany({
      where: this.tenantScope.usageWhere(site),
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: events,
      note: 'Usage metering is not implemented yet',
    };
  }
}
