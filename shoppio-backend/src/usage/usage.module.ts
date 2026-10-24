import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { UsageSummaryController } from './usage-summary.controller';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [UsageController, UsageSummaryController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
