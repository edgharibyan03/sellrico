import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { SubscriptionService } from '../billing/subscription.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, toAuthenticatedUser } from '../common/types/authenticated-user';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthSessionResponseDto, UserResponseDto } from './dto/user-auth-response.dto';
import { UserJwtPayload } from './interfaces/user-jwt-payload.interface';

@Injectable()
export class UserAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly appConfig: AppConfigService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptions: SubscriptionService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponseDto> {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await argon2.hash(dto.password);
    await this.subscriptions.prepareFreeAssignment();
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: dto.name.trim(),
          passwordHash,
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });
      await this.subscriptions.attachFreePlan(created.id, tx);
      return created;
    });

    return this.toSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSessionResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    return this.toSession(user);
  }

  async me(user: AuthenticatedUser): Promise<UserResponseDto> {
    const record = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    return this.toUserDto(record);
  }

  logout(): { loggedOut: true } {
    // JWTs are stateless; client discards the token.
    return { loggedOut: true };
  }

  forgotPassword(_dto: ForgotPasswordDto): { message: string } {
    // Do not reveal whether the email exists. Email delivery comes later.
    return {
      message:
        'If an account exists for that email, password reset instructions will be sent shortly.',
    };
  }

  async resolveUserFromJwtPayload(payload: UserJwtPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== 'user' || !payload.sub) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid user token',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'User no longer exists',
      });
    }

    return toAuthenticatedUser(user);
  }

  private async toSession(user: User): Promise<AuthSessionResponseDto> {
    const payload: UserJwtPayload = {
      sub: user.id,
      email: user.email,
      typ: 'user',
    };

    const accessToken = await this.jwt.signAsync(payload as object, {
      secret: this.appConfig.jwtSecret,
      // string durations like "7d" / "1h" are supported by jsonwebtoken
      expiresIn: this.appConfig.jwtExpiresIn as unknown as number,
    });

    return {
      user: this.toUserDto(user),
      accessToken,
    };
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
