import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SiteAuthGuard } from './guards/site-auth.guard';
import { UserAuthGuard } from './guards/user-auth.guard';
import { UserAuthService } from './user-auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, UserAuthService, SiteAuthGuard, UserAuthGuard],
  exports: [AuthService, UserAuthService, SiteAuthGuard, UserAuthGuard, JwtModule],
})
export class AuthModule {}
