import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UsageService } from './usage.service';

@ApiTags('usage')
@Controller('usage')
@UseGuards(UserAuthGuard)
@ApiBearerAuth('user-jwt')
export class UsageSummaryController {
  constructor(private readonly usage: UsageService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Account usage for the current billing period',
    description: 'Resolved from the authenticated user. Client-supplied account ids are ignored.',
  })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.usage.getSummary(user);
  }
}
