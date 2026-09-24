import { AIProviderError } from '../errors/ai-provider.error';
import { OpenAICompatibleClient } from './openai-compatible.client';
import { OpenAIProvider } from './openai.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { AppConfigService } from '../../config/app-config.service';

describe('OpenAIProvider', () => {
  it('throws NOT_CONFIGURED when API key is missing', async () => {
    const provider = new OpenAIProvider({
      openAiApiKey: undefined,
      openAiModel: 'gpt-4o-mini',
      openAiBaseUrl: undefined,
    } as AppConfigService);

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toBeInstanceOf(AIProviderError);

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED', provider: 'openai' });
  });

  it('delegates chat to the compatible client', async () => {
    const provider = new OpenAIProvider({
      openAiApiKey: 'key',
      openAiModel: 'gpt-4o-mini',
    } as AppConfigService);

    const chat = jest.fn().mockResolvedValue({
      content: 'ok',
      toolCalls: [],
      finishReason: 'stop',
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    provider.setClientForTests({ chat } as unknown as OpenAICompatibleClient);

    const result = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.content).toBe('ok');
    expect(chat).toHaveBeenCalled();
  });
});

describe('DeepSeekProvider', () => {
  it('throws NOT_CONFIGURED when API key is missing', async () => {
    const provider = new DeepSeekProvider({
      deepSeekApiKey: undefined,
      deepSeekModel: 'deepseek-chat',
      deepSeekBaseUrl: 'https://api.deepseek.com',
    } as AppConfigService);

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED', provider: 'deepseek' });
  });

  it('delegates chat to the compatible client', async () => {
    const provider = new DeepSeekProvider({
      deepSeekApiKey: 'key',
      deepSeekModel: 'deepseek-chat',
      deepSeekBaseUrl: 'https://api.deepseek.com',
    } as AppConfigService);

    const chat = jest.fn().mockResolvedValue({
      content: 'deep',
      toolCalls: [],
      finishReason: 'stop',
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
    provider.setClientForTests({ chat } as unknown as OpenAICompatibleClient);

    const result = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.content).toBe('deep');
    expect(provider.name).toBe('deepseek');
  });
});
