import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { UserResponseDto } from '../auth/dto/user-auth-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UsersService } from './users.service';

@ApiTags('dashboard-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/onboarding')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({
    summary: 'Update onboarding progress',
    description: 'Dashboard endpoint. Persists onboarding step and optional completion flag.',
  })
  updateOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateOnboarding(user, dto);
  }
}
