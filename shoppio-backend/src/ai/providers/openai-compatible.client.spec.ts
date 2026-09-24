import { AIProviderError } from '../errors/ai-provider.error';
import { OpenAICompatibleClient } from '../providers/openai-compatible.client';
import { AIChatRequest } from '../types/ai.types';

function mockOpenAI(createImpl: jest.Mock) {
  return {
    chat: {
      completions: {
        create: createImpl,
      },
    },
  } as never;
}

describe('OpenAICompatibleClient', () => {
  const request: AIChatRequest = {
    system: 'You are helpful',
    messages: [{ role: 'user', content: 'Hello' }],
  };

  it('returns chat content from OpenAI-compatible API', async () => {
    const create = jest.fn().mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: '  Hi there  ' },
        },
      ],
    });
    const client = new OpenAICompatibleClient(
      { provider: 'openai', apiKey: 'test-key', model: 'gpt-4o-mini' },
      mockOpenAI(create),
    );

    const result = await client.chat(request);

    expect(result.content).toBe('Hi there');
    expect(result.provider).toBe('openai');
    expect(result.toolCalls).toEqual([]);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ]),
      }),
    );
  });

  it('formats application tools into function tools', async () => {
    const create = jest.fn().mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'search_products',
                  arguments: '{"query":"doors"}',
                },
              },
            ],
          },
        },
      ],
    });
    const client = new OpenAICompatibleClient(
      { provider: 'openai', apiKey: 'test-key', model: 'gpt-4o-mini' },
      mockOpenAI(create),
    );

    const result = await client.chat({
      ...request,
      tools: [
        {
          name: 'search_products',
          description: 'Search catalog',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
        },
      ],
    });

    expect(result.finishReason).toBe('tool_calls');
    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'search_products', arguments: { query: 'doors' } },
    ]);
    expect(create.mock.calls[0][0].tools[0]).toEqual({
      type: 'function',
      function: {
        name: 'search_products',
        description: 'Search catalog',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    });
  });

  it('normalizes 401 into AIProviderError AUTHENTICATION without leaking keys', () => {
    const client = new OpenAICompatibleClient({
      provider: 'deepseek',
      apiKey: 'sk-secret-key-value',
      model: 'deepseek-chat',
    });

    const err = client.normalizeError({
      status: 401,
      message: 'Invalid key sk-secret-key-value',
    });

    expect(err).toBeInstanceOf(AIProviderError);
    expect(err.code).toBe('AUTHENTICATION');
    expect(err.provider).toBe('deepseek');
    expect(err.message).not.toContain('sk-secret');
  });

  it('normalizes rate limit, timeout, and network errors', () => {
    const client = new OpenAICompatibleClient({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
    });

    expect(client.normalizeError({ status: 429, message: 'slow down' }).code).toBe(
      'RATE_LIMIT',
    );
    expect(client.normalizeError(new Error('request timed out')).code).toBe('TIMEOUT');
    expect(client.normalizeError(new Error('fetch failed')).code).toBe('NETWORK');
    expect(client.normalizeError({ status: 404, message: 'model' }).code).toBe(
      'MODEL_UNAVAILABLE',
    );
    expect(client.normalizeError({ status: 400, message: 'bad' }).code).toBe(
      'INVALID_REQUEST',
    );
  });

  it('throws EMPTY_RESPONSE when choices are missing', async () => {
    const create = jest.fn().mockResolvedValue({ choices: [] });
    const client = new OpenAICompatibleClient(
      { provider: 'openai', apiKey: 'k', model: 'm' },
      mockOpenAI(create),
    );

    await expect(client.chat(request)).rejects.toMatchObject({
      code: 'EMPTY_RESPONSE',
    });
  });
});
