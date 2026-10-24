import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
