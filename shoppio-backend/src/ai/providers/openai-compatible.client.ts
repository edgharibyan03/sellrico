import OpenAI from 'openai';
import { AIProviderError } from '../errors/ai-provider.error';
import {
  AIChatRequest,
  AIChatResponse,
  AIMessage,
  AIProviderName,
  AIStreamChunk,
  AIToolCall,
  AIToolDefinition,
} from '../types/ai.types';

export interface OpenAICompatibleConfig {
  provider: AIProviderName;
  apiKey: string;
  model: string;
  baseURL?: string;
}

/**
 * Shared OpenAI-compatible Chat Completions adapter.
 * Used by OpenAI and DeepSeek (OpenAI-compatible API). Isolated from ChatService.
 */
export class OpenAICompatibleClient {
  private readonly client: OpenAI;
  private readonly provider: AIProviderName;
  private readonly model: string;

  constructor(config: OpenAICompatibleConfig, client?: OpenAI) {
    this.provider = config.provider;
    this.model = config.model;
    this.client =
      client ??
      new OpenAI({
        apiKey: config.apiKey,
        ...(config.baseURL ? { baseURL: config.baseURL } : {}),
      });
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: request.temperature ?? 0.4,
        ...(request.maxTokens != null ? { max_tokens: request.maxTokens } : {}),
        messages: this.formatMessages(request),
        ...(request.tools?.length
          ? { tools: this.formatTools(request.tools), tool_choice: 'auto' as const }
          : {}),
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new AIProviderError('EMPTY_RESPONSE', 'AI provider returned no choices', {
          provider: this.provider,
        });
      }

      const message = choice.message;
      const toolCalls = this.parseToolCalls(message.tool_calls);
      const content = message.content?.trim() ?? null;

      if (!content && toolCalls.length === 0) {
        throw new AIProviderError('EMPTY_RESPONSE', 'AI provider returned an empty response', {
          provider: this.provider,
        });
      }

      return {
        content,
        toolCalls,
        finishReason: this.mapFinishReason(choice.finish_reason, toolCalls.length > 0),
        provider: this.provider,
        model: completion.model ?? this.model,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async *stream(request: AIChatRequest): AsyncIterable<AIStreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        temperature: request.temperature ?? 0.4,
        ...(request.maxTokens != null ? { max_tokens: request.maxTokens } : {}),
        messages: this.formatMessages(request),
        ...(request.tools?.length
          ? { tools: this.formatTools(request.tools), tool_choice: 'auto' as const }
          : {}),
        stream: true,
      });

      const toolBuffers = new Map<number, { id: string; name: string; arguments: string }>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) {
          continue;
        }

        if (delta.content) {
          yield { type: 'delta', text: delta.content };
        }

        if (delta.tool_calls) {
          for (const part of delta.tool_calls) {
            const index = part.index ?? 0;
            const existing = toolBuffers.get(index) ?? {
              id: '',
              name: '',
              arguments: '',
            };
            if (part.id) {
              existing.id = part.id;
            }
            if (part.function?.name) {
              existing.name = part.function.name;
            }
            if (part.function?.arguments) {
              existing.arguments += part.function.arguments;
            }
            toolBuffers.set(index, existing);
            yield {
              type: 'tool_call',
              toolCall: {
                index,
                id: existing.id || undefined,
                name: existing.name || undefined,
                arguments: undefined,
              },
            };
          }
        }
      }

      for (const [index, buf] of toolBuffers) {
        yield {
          type: 'tool_call',
          toolCall: {
            index,
            id: buf.id,
            name: buf.name,
            arguments: this.safeParseArgs(buf.arguments),
          },
        };
      }

      yield { type: 'done' };
    } catch (error) {
      const normalized = this.normalizeError(error);
      yield { type: 'error', errorMessage: normalized.message };
      throw normalized;
    }
  }

  private formatMessages(
    request: AIChatRequest,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }

    for (const message of request.messages) {
      messages.push(this.formatMessage(message));
    }

    return messages;
  }

  private formatMessage(
    message: AIMessage,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: message.toolCallId ?? '',
        content: message.content,
      };
    }

    if (message.role === 'assistant') {
      if (message.toolCalls?.length) {
        return {
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments ?? {}),
            },
          })),
        };
      }
      return { role: 'assistant', content: message.content };
    }

    if (message.role === 'system') {
      return { role: 'system', content: message.content };
    }

    return { role: 'user', content: message.content };
  }

  private formatTools(
    tools: AIToolDefinition[],
  ): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private parseToolCalls(
    raw: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined,
  ): AIToolCall[] {
    if (!raw?.length) {
      return [];
    }

    return raw
      .filter((call): call is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
        call.type === 'function',
      )
      .map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: this.safeParseArgs(call.function.arguments ?? '{}'),
      }));
  }

  private safeParseArgs(raw: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(raw || '{}') as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private mapFinishReason(
    reason: string | null | undefined,
    hasToolCalls: boolean,
  ): AIChatResponse['finishReason'] {
    if (hasToolCalls || reason === 'tool_calls') {
      return 'tool_calls';
    }
    if (reason === 'length') {
      return 'length';
    }
    if (reason === 'content_filter') {
      return 'content_filter';
    }
    return 'stop';
  }

  normalizeError(error: unknown): AIProviderError {
    if (error instanceof AIProviderError) {
      return error;
    }

    const provider = this.provider;
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : undefined;

    const message =
      error instanceof Error
        ? this.sanitizeMessage(error.message)
        : 'Unknown AI provider error';

    if (status === 401 || status === 403) {
      return new AIProviderError('AUTHENTICATION', 'AI provider authentication failed', {
        provider,
        status,
        cause: error,
      });
    }
    if (status === 429) {
      return new AIProviderError('RATE_LIMIT', 'AI provider rate limit exceeded', {
        provider,
        status,
        cause: error,
      });
    }
    if (status === 400) {
      return new AIProviderError('INVALID_REQUEST', 'Invalid request to AI provider', {
        provider,
        status,
        cause: error,
      });
    }
    if (status === 404) {
      return new AIProviderError('MODEL_UNAVAILABLE', 'AI model is unavailable', {
        provider,
        status,
        cause: error,
      });
    }

    const lower = message.toLowerCase();
    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
      return new AIProviderError('TIMEOUT', 'AI provider request timed out', {
        provider,
        status,
        cause: error,
      });
    }
    if (
      lower.includes('network') ||
      lower.includes('fetch failed') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound')
    ) {
      return new AIProviderError('NETWORK', 'AI provider network error', {
        provider,
        status,
        cause: error,
      });
    }

    return new AIProviderError('PROVIDER_ERROR', message || 'AI provider error', {
      provider,
      status,
      cause: error,
    });
  }

  private sanitizeMessage(message: string): string {
    return message
      .replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  }
}
