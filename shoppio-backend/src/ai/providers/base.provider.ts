import { AIProvider } from '../providers/ai-provider.interface';
import {
  AIChatRequest,
  AIChatResponse,
  AIStreamChunk,
} from '../types/ai.types';

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: AIChatResponse['provider'];

  abstract chat(request: AIChatRequest): Promise<AIChatResponse>;

  async *stream(_request: AIChatRequest): AsyncIterable<AIStreamChunk> {
    // Default: non-streaming fallback — emit full response as one delta.
    const response = await this.chat(_request);
    if (response.content) {
      yield { type: 'delta', text: response.content };
    }
    for (const toolCall of response.toolCalls) {
      yield { type: 'tool_call', toolCall };
    }
    yield { type: 'done' };
  }
}
