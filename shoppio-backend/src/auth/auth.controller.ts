import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import {
  ConnectResponseDto,
  RevokeResponseDto,
  RotateResponseDto,
  TokenResponseDto,
} from './dto/auth-response.dto';
import { ConnectSiteDto } from './dto/connect-site.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenRequestDto } from './dto/token-request.dto';
import {
  AuthSessionResponseDto,
  UserResponseDto,
} from './dto/user-auth-response.dto';
import { SiteAuthGuard } from './guards/site-auth.guard';
import { UserAuthGuard } from './guards/user-auth.guard';
import { UserAuthService } from './user-auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userAuthService: UserAuthService,
  ) {}

  // --- Dashboard user auth (sellrico-web) ---

  @Post('register')
  @ApiTags('dashboard-auth')
  @ApiOperation({
    summary: 'Register a merchant account',
    description: 'Public. Creates a dashboard user and returns a user-scoped JWT.',
  })
  register(@Body() dto: RegisterDto): Promise<AuthSessionResponseDto> {
    return this.userAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiTags('dashboard-auth')
  @ApiOperation({
    summary: 'Log in to the merchant dashboard',
    description: 'Public. Returns a user-scoped JWT.',
  })
  login(@Body() dto: LoginDto): Promise<AuthSessionResponseDto> {
    return this.userAuthService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-auth')
  @ApiOperation({
    summary: 'Log out',
    description: 'Authenticated dashboard endpoint. Client should discard the JWT.',
  })
  logout(): { loggedOut: true } {
    return this.userAuthService.logout();
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiTags('dashboard-auth')
  @ApiOperation({
    summary: 'Request a password reset',
    description:
      'Public. Always returns the same message. Email delivery is not implemented yet.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto): { message: string } {
    return this.userAuthService.forgotPassword(dto);
  }

  @Get('me')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiTags('dashboard-auth')
  @ApiOperation({
    summary: 'Get the authenticated merchant user',
    description: 'Dashboard endpoint. Identity comes from the user JWT.',
  })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.userAuthService.me(user);
  }

  // --- WordPress plugin site auth ---

  @Post('connect')
  @ApiOperation({
    summary: 'Connect a WordPress site',
    description:
      'Public endpoint. Creates a Site and SiteCredential. Returns keyId + secret once. Plugin auth — not for browser JS.',
  })
  connect(@Body() dto: ConnectSiteDto): Promise<ConnectResponseDto> {
    return this.authService.connect(dto);
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange site credentials for a JWT',
    description: 'Public with credentials. Returns a short-lived site-scoped access token.',
  })
  token(@Body() dto: TokenRequestDto): Promise<TokenResponseDto> {
    return this.authService.issueToken(dto);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({
    summary: 'Revoke the current site credential',
    description:
      'Authenticated plugin endpoint. Invalidates the credential used to obtain the JWT.',
  })
  revoke(@CurrentSite() site: AuthenticatedSite): Promise<RevokeResponseDto> {
    return this.authService.revoke(site);
  }

  @Post('rotate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({
    summary: 'Rotate site credentials',
    description:
      'Authenticated plugin endpoint. Revokes the current credential and issues a new keyId/secret pair.',
  })
  rotate(@CurrentSite() site: AuthenticatedSite): Promise<RotateResponseDto> {
    return this.authService.rotate(site);
  }
}
