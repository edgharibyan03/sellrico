import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { AIProviderError } from '../errors/ai-provider.error';
import { AIChatRequest, AIChatResponse, AIStreamChunk } from '../types/ai.types';
import { BaseAIProvider } from './base.provider';
import { OpenAICompatibleClient } from './openai-compatible.client';

@Injectable()
export class DeepSeekProvider extends BaseAIProvider {
  readonly name = 'deepseek' as const;
  private client: OpenAICompatibleClient | null = null;

  constructor(private readonly appConfig: AppConfigService) {
    super();
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    return this.getClient().chat(request);
  }

  async *stream(request: AIChatRequest): AsyncIterable<AIStreamChunk> {
    yield* this.getClient().stream(request);
  }

  /** Test hook — inject a prebuilt compatible client. */
  setClientForTests(client: OpenAICompatibleClient): void {
    this.client = client;
  }

  private getClient(): OpenAICompatibleClient {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.appConfig.deepSeekApiKey;
    if (!apiKey) {
      throw new AIProviderError(
        'NOT_CONFIGURED',
        'DeepSeek API key is not configured',
        { provider: this.name },
      );
    }

    this.client = new OpenAICompatibleClient({
      provider: this.name,
      apiKey,
      model: this.appConfig.deepSeekModel,
      baseURL: this.appConfig.deepSeekBaseUrl,
    });
    return this.client;
  }
}
