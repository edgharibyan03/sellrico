import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AssistantService } from './assistant.service';
import { UpdateAssistantDto } from './dto/update-assistant.dto';

@ApiTags('assistant')
@Controller()
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('sites/me/assistant')
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({ summary: 'Storefront assistant config for the connected site (plugin)' })
  getForPlugin(@CurrentSite() site: AuthenticatedSite) {
    return this.assistant.getForSiteId(site.id);
  }

  @Get('sites/:id/assistant')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({ summary: 'Get assistant settings for an owned site' })
  getForDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistant.getForUser(user, id);
  }

  @Patch('sites/:id/assistant')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({ summary: 'Update assistant settings for an owned site' })
  updateForDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssistantDto,
  ) {
    return this.assistant.updateForUser(user, id, dto);
  }
}
