import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateSiteDto } from './dto/create-site.dto';
import {
  ConnectCodeResponseDto,
  DashboardSiteDto,
  SyncProgressDto,
} from './dto/site-response.dto';
import { SitesService } from './sites.service';

@ApiTags('sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  // --- Plugin (site JWT) ---

  @Get('me')
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({
    summary: 'Get the authenticated site profile (plugin)',
    description: 'Site identity comes from the site JWT — never from a client-supplied siteId.',
  })
  me(@CurrentSite() site: AuthenticatedSite) {
    return this.sitesService.getAuthenticatedSite(site);
  }

  // --- Dashboard (user JWT) ---

  @Get()
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({ summary: 'List sites owned by the authenticated merchant' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<DashboardSiteDto[]> {
    return this.sitesService.listForUser(user);
  }

  @Post()
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({ summary: 'Create a pending site for the merchant' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSiteDto,
  ): Promise<DashboardSiteDto> {
    return this.sitesService.createForUser(user, dto);
  }

  @Get(':id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({ summary: 'Get one owned site' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DashboardSiteDto> {
    return this.sitesService.getForUser(user, id);
  }

  @Post(':id/connect-code')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({ summary: 'Issue a one-time connect code for the WordPress plugin' })
  createConnectCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConnectCodeResponseDto> {
    return this.sitesService.createConnectCode(user, id);
  }

  @Get(':id/connection-status')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({
    summary: 'Poll whether the WordPress plugin has connected',
    description: 'Returns 409 NOT_CONNECTED until the plugin completes connect with the code.',
  })
  connectionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DashboardSiteDto> {
    return this.sitesService.getConnectionStatus(user, id);
  }

  @Get(':id/sync-status')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({ summary: 'Product sync progress (stub until sync is implemented)' })
  syncStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncProgressDto> {
    return this.sitesService.getSyncProgress(user, id);
  }

  @Post(':id/disconnect')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-sites')
  @ApiOperation({ summary: 'Disconnect a site and revoke credentials' })
  async disconnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ disconnected: true }> {
    await this.sitesService.disconnectForUser(user, id);
    return { disconnected: true };
  }
}
