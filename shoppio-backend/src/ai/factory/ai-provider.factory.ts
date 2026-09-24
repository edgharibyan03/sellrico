import { Injectable } from '@nestjs/common';
import { AIProviderError } from '../errors/ai-provider.error';
import { resolveProviderNameForPlan } from '../plans/plan-ai-provider.map';
import { PlanResolverService } from '../plans/plan-resolver.service';
import { AIProviderName } from '../types/ai.types';
import { AIProvider } from '../providers/ai-provider.interface';
import { DeepSeekProvider } from '../providers/deepseek.provider';
import { OpenAIProvider } from '../providers/openai.provider';

export interface AIUserContext {
  /** Explicit plan override (tests / admin). */
  planId?: string;
  /** Site whose subscription plan selects the provider. */
  siteId?: string;
}

@Injectable()
export class AIProviderFactory {
  constructor(
    private readonly planResolver: PlanResolverService,
    private readonly openAIProvider: OpenAIProvider,
    private readonly deepSeekProvider: DeepSeekProvider,
  ) {}

  getProvider(name: AIProviderName): AIProvider {
    switch (name) {
      case 'openai':
        return this.openAIProvider;
      case 'deepseek':
        return this.deepSeekProvider;
      default: {
        const exhaustive: never = name;
        throw new AIProviderError(
          'PROVIDER_ERROR',
          `Unknown AI provider: ${String(exhaustive)}`,
        );
      }
    }
  }

  getProviderForPlan(planId: string): AIProvider {
    const name = resolveProviderNameForPlan(planId);
    return this.getProvider(name);
  }

  /**
   * Resolve provider from user/site subscription context.
   * Prefer siteId (chat is site-scoped); fall back to planId or free.
   */
  async getProviderForUser(context: AIUserContext): Promise<AIProvider> {
    if (context.planId) {
      return this.getProviderForPlan(context.planId);
    }
    if (context.siteId) {
      const planId = await this.planResolver.resolvePlanForSite(context.siteId);
      return this.getProviderForPlan(planId);
    }
    return this.getProviderForPlan('free');
  }
}
