import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UserResponseDto } from '../auth/dto/user-auth-response.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateOnboarding(
    authUser: AuthenticatedUser,
    dto: UpdateOnboardingDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        onboardingStep: dto.step,
        ...(dto.completed ? { onboardingCompleted: true } : {}),
      },
    });

    return this.toUserDto(updated);
  }

  private toUserDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
    };
  }
}
