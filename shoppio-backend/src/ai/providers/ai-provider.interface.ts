import {
  AIChatRequest,
  AIChatResponse,
  AIProviderName,
  AIStreamChunk,
} from '../types/ai.types';

export interface AIProvider {
  readonly name: AIProviderName;

  chat(request: AIChatRequest): Promise<AIChatResponse>;

  stream(request: AIChatRequest): AsyncIterable<AIStreamChunk>;
}
