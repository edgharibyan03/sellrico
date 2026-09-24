import { ServiceUnavailableException } from '@nestjs/common';
import { MessageRole, SiteStatus } from '@prisma/client';
import { ChatService } from './chat.service';
import { AIProviderFactory } from '../ai/factory/ai-provider.factory';
import { CatalogToolExecutor } from '../ai/tools/catalog-tool.executor';
import { AIProviderError } from '../ai/errors/ai-provider.error';
import { PrismaService } from '../prisma/prisma.service';
import { AIProvider } from '../ai/providers/ai-provider.interface';

describe('ChatService (provider-independent)', () => {
  const site = {
    id: 'site-1',
    domain: 'shop.test',
    name: 'Shop',
    status: SiteStatus.ACTIVE,
    credentialId: 'cred-1',
    keyId: 'key-1',
  };

  const conversation = { id: 'conv-1', siteId: 'site-1' };

  let prisma: {
    message: { create: jest.Mock; findMany: jest.Mock };
    conversation: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    usageEvent: { create: jest.Mock };
  };
  let provider: jest.Mocked<AIProvider>;
  let factory: { getProviderForUser: jest.Mock };
  let catalogTools: { execute: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    prisma = {
      message: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([
          { role: MessageRole.USER, content: 'Looking for doors' },
        ]),
      },
      conversation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(conversation),
        update: jest.fn().mockResolvedValue(conversation),
      },
      usageEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    provider = {
      name: 'deepseek',
      chat: jest.fn(),
      stream: jest.fn(),
    };

    factory = {
      getProviderForUser: jest.fn().mockResolvedValue(provider),
    };

    catalogTools = {
      execute: jest.fn(),
    };

    service = new ChatService(
      prisma as unknown as PrismaService,
      factory as unknown as AIProviderFactory,
      catalogTools as unknown as CatalogToolExecutor,
    );
  });

  it('uses factory-selected provider without provider branching', async () => {
    provider.chat.mockResolvedValue({
      content: 'We have oak doors.',
      toolCalls: [],
      finishReason: 'stop',
      provider: 'deepseek',
      model: 'deepseek-chat',
    });

    const result = await service.handleMessage(site, { message: 'Looking for doors' });

    expect(factory.getProviderForUser).toHaveBeenCalledWith({ siteId: 'site-1' });
    expect(provider.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.any(Array),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Looking for doors'),
          }),
        ]),
      }),
    );
    expect(result.reply).toBe('We have oak doors.');
    expect(result.conversationId).toBe('conv-1');
  });

  it('executes application tools and continues the chat loop', async () => {
    provider.chat
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [
          {
            id: 'call_1',
            name: 'search_products',
            arguments: { query: 'doors' },
          },
        ],
        finishReason: 'tool_calls',
        provider: 'deepseek',
        model: 'deepseek-chat',
      })
      .mockResolvedValueOnce({
        content: 'Try the Oak Door.',
        toolCalls: [],
        finishReason: 'stop',
        provider: 'deepseek',
        model: 'deepseek-chat',
      });

    catalogTools.execute.mockResolvedValue({
      result: { count: 1, products: [{ id: 'p1', name: 'Oak Door' }] },
      products: [
        {
          id: 'p1',
          name: 'Oak Door',
          price: 100,
          currency: 'USD',
          url: null,
          imageUrl: null,
        },
      ],
    });

    const result = await service.handleMessage(site, { message: 'doors' });

    expect(catalogTools.execute).toHaveBeenCalledWith(
      'site-1',
      expect.objectContaining({ name: 'search_products' }),
    );
    expect(provider.chat).toHaveBeenCalledTimes(2);
    expect(result.reply).toBe('Try the Oak Door.');
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('Oak Door');
  });

  it('falls back to list_products for catalog questions without tool calls', async () => {
    provider.chat.mockResolvedValue({
      content: 'Вот доступные товары:',
      toolCalls: [],
      finishReason: 'stop',
      provider: 'deepseek',
      model: 'deepseek-chat',
    });

    catalogTools.execute.mockResolvedValue({
      result: { count: 1 },
      products: [
        {
          id: 'p1',
          name: 'Тестовый продукт 1',
          price: 4000,
          currency: 'AMD',
          url: 'http://example.test/p1',
          imageUrl: 'http://example.test/p1.jpg',
        },
      ],
    });

    const result = await service.handleMessage(site, {
      message: 'дай доступный список товаров',
    });

    expect(catalogTools.execute).toHaveBeenCalledWith(
      'site-1',
      expect.objectContaining({ name: 'list_products' }),
    );
    expect(result.products).toHaveLength(1);
    expect(result.products[0].imageUrl).toBe('http://example.test/p1.jpg');
  });

  it('parses max price into fallback list_products args', async () => {
    provider.chat.mockResolvedValue({
      content: 'Есть варианты дешевле 6000.',
      toolCalls: [],
      finishReason: 'stop',
      provider: 'deepseek',
      model: 'deepseek-chat',
    });

    catalogTools.execute.mockResolvedValue({
      result: { count: 1 },
      products: [
        {
          id: 'p1',
          name: 'Тестовый продукт 1',
          price: 4000,
          currency: 'AMD',
          url: null,
          imageUrl: null,
        },
      ],
    });

    await service.handleMessage(site, {
      message: 'есть что нибудь ниже 6000 драм?',
    });

    expect(catalogTools.execute).toHaveBeenCalledWith(
      'site-1',
      expect.objectContaining({
        name: 'list_products',
        arguments: expect.objectContaining({ maxPrice: 6000 }),
      }),
    );
  });

  it('maps AIProviderError to HTTP exceptions', async () => {
    provider.chat.mockRejectedValue(
      new AIProviderError('NOT_CONFIGURED', 'missing key', { provider: 'deepseek' }),
    );

    await expect(
      service.handleMessage(site, { message: 'hi' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
