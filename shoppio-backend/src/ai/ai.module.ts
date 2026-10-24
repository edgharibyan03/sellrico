import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AIProviderFactory } from './factory/ai-provider.factory';
import { PlanResolverService } from './plans/plan-resolver.service';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { CatalogToolExecutor } from './tools/catalog-tool.executor';

@Module({
  imports: [AppConfigModule, PrismaModule, BillingModule],
  providers: [
    PlanResolverService,
    OpenAIProvider,
    DeepSeekProvider,
    AIProviderFactory,
    CatalogToolExecutor,
  ],
  exports: [AIProviderFactory, PlanResolverService, CatalogToolExecutor],
})
export class AiModule {}
