import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BillingModule } from '../billing/billing.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SiteAuthGuard } from './guards/site-auth.guard';
import { UserAuthGuard } from './guards/user-auth.guard';
import { UserAuthService } from './user-auth.service';

@Module({
  imports: [JwtModule.register({}), forwardRef(() => BillingModule)],
  controllers: [AuthController],
  providers: [AuthService, UserAuthService, SiteAuthGuard, UserAuthGuard],
  exports: [AuthService, UserAuthService, SiteAuthGuard, UserAuthGuard, JwtModule],
})
export class AuthModule {}
