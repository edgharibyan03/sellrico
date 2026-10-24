import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingController } from './billing.controller';
import { BillingService, UnconfiguredPaymentProvider } from './billing.service';
import { EntitlementService } from './entitlement.service';
import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [BillingController],
  providers: [
    PlanService,
    SubscriptionService,
    EntitlementService,
    UnconfiguredPaymentProvider,
    BillingService,
  ],
  exports: [PlanService, SubscriptionService, EntitlementService, BillingService],
})
export class BillingModule {}
