import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(UserAuthGuard)
@ApiBearerAuth('user-jwt')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Account overview stats for the merchant dashboard',
  })
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getOverview(user);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Recent account activity feed',
  })
  getActivity(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getActivity(user);
  }
}
