import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  GatewayTimeoutException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MessageRole, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AIProviderFactory } from '../ai/factory/ai-provider.factory';
import { AIProviderError } from '../ai/errors/ai-provider.error';
import { CatalogToolExecutor, CatalogProductHint } from '../ai/tools/catalog-tool.executor';
import { CATALOG_TOOLS } from '../ai/tools/catalog.tools';
import { AIMessage } from '../ai/types/ai.types';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessageDto } from './dto/chat-message.dto';

export type ChatProductHint = CatalogProductHint;

export interface ChatResponseDto {
  reply: string;
  conversationId: string;
  sessionId: string;
  products: ChatProductHint[];
}

const MAX_TOOL_ROUNDS = 5;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderFactory: AIProviderFactory,
    private readonly catalogTools: CatalogToolExecutor,
  ) {}

  async handleMessage(
    site: AuthenticatedSite,
    dto: ChatMessageDto,
  ): Promise<ChatResponseDto> {
    const sessionId = dto.sessionId?.trim() || randomUUID();
    const conversation = await this.resolveConversation(site.id, sessionId, dto.conversationId);

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: dto.message,
      },
    });

    const history = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    history.reverse();

    const provider = await this.aiProviderFactory.getProviderForUser({ siteId: site.id });

    const messages: AIMessage[] = history.map((m) => ({
      role: (m.role === MessageRole.ASSISTANT ? 'assistant' : 'user') as
        | 'user'
        | 'assistant',
      content: m.content,
    }));

    // Anchor the model on the active turn (avoids resurfacing closed off-topic threads).
    const last = messages[messages.length - 1];
    if (last?.role === 'user') {
      last.content = [
        'Answer ONLY this latest customer message. Earlier chat is background context only — do not reopen closed off-topic requests (weather, news, jokes, etc.) unless the customer asks again now.',
        '',
        dto.message,
      ].join('\n');
    }

    const collectedProducts = new Map<string, ChatProductHint>();
    let reply = '';
    const priceFilters = this.extractPriceFilters(dto.message);

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await provider.chat({
          system: this.buildSystemPrompt(site, dto.locale),
          messages,
          tools: CATALOG_TOOLS,
          temperature: 0.2,
        });

        if (response.toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            content: response.content ?? '',
            toolCalls: response.toolCalls,
          });

          for (const call of response.toolCalls) {
            const { result, products } = await this.catalogTools.execute(site.id, call);
            for (const product of products) {
              collectedProducts.set(product.id, product);
            }

            const toolContent = JSON.stringify(result);
            messages.push({
              role: 'tool',
              toolCallId: call.id,
              name: call.name,
              content: toolContent,
            });

            await this.prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: MessageRole.TOOL,
                content: toolContent,
                metadata: {
                  toolCallId: call.id,
                  toolName: call.name,
                  arguments: call.arguments,
                } as Prisma.InputJsonValue,
              },
            });
          }
          continue;
        }

        reply = response.content?.trim() ?? '';
        break;
      }
    } catch (error) {
      this.rethrowAsHttp(error);
    }

    if (!reply) {
      reply =
        'Sorry — I could not generate a reply right now. Please try again in a moment.';
    }

    // Guarantee product cards (with images) for catalog-style questions even if the model skipped tools.
    if (collectedProducts.size === 0 && this.looksLikeCatalogRequest(dto.message)) {
      const fallback = await this.catalogTools.execute(site.id, {
        id: 'fallback_list',
        name: 'list_products',
        arguments: {
          limit: 8,
          ...(priceFilters.maxPrice != null ? { maxPrice: priceFilters.maxPrice } : {}),
          ...(priceFilters.minPrice != null ? { minPrice: priceFilters.minPrice } : {}),
        },
      });
      for (const product of fallback.products) {
        collectedProducts.set(product.id, product);
      }
    }

    const products = Array.from(collectedProducts.values()).slice(0, 8);

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
        metadata: {
          productIds: products.map((p) => p.id),
          provider: provider.name,
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.usageEvent.create({
      data: {
        siteId: site.id,
        type: 'chat_message',
        quantity: 1,
        metadata: {
          conversationId: conversation.id,
          productHits: products.length,
          provider: provider.name,
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      reply,
      conversationId: conversation.id,
      sessionId,
      products,
    };
  }

  private rethrowAsHttp(error: unknown): never {
    if (error instanceof AIProviderError) {
      switch (error.code) {
        case 'NOT_CONFIGURED':
          throw new ServiceUnavailableException({
            code: 'AI_NOT_CONFIGURED',
            message: error.message,
          });
        case 'AUTHENTICATION':
          throw new UnauthorizedException({
            code: 'AI_AUTHENTICATION',
            message: 'AI provider authentication failed',
          });
        case 'RATE_LIMIT':
          throw new HttpException(
            {
              code: 'AI_RATE_LIMIT',
              message: 'AI provider rate limit exceeded',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        case 'TIMEOUT':
          throw new GatewayTimeoutException({
            code: 'AI_TIMEOUT',
            message: 'AI provider request timed out',
          });
        case 'INVALID_REQUEST':
          throw new BadRequestException({
            code: 'AI_INVALID_REQUEST',
            message: 'Invalid AI request',
          });
        default:
          throw new ServiceUnavailableException({
            code: `AI_${error.code}`,
            message: 'AI provider is temporarily unavailable',
          });
      }
    }
    throw error;
  }

  private async resolveConversation(
    siteId: string,
    sessionId: string,
    conversationId?: string,
  ) {
    if (conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: { id: conversationId, siteId },
      });
      if (existing) {
        return existing;
      }
    }

    const bySession = await this.prisma.conversation.findFirst({
      where: { siteId, externalSessionId: sessionId },
      orderBy: { updatedAt: 'desc' },
    });
    if (bySession) {
      return bySession;
    }

    return this.prisma.conversation.create({
      data: {
        siteId,
        externalSessionId: sessionId,
      },
    });
  }

  private looksLikeCatalogRequest(message: string): boolean {
    const text = message.toLowerCase();
    return /(товар|каталог|продукт|product|catalog|куп|есть|покаж|список|налич|image|картин|фото|photo|цен|price|драм|amd|бюджет|дешев|дорог|ниже|до\s+\d)/i.test(
      text,
    );
  }

  private extractPriceFilters(message: string): {
    maxPrice?: number;
    minPrice?: number;
  } {
    const text = message.replace(/\s+/g, ' ').trim();
    const maxMatch = text.match(
      /(?:ниже|до|under|less than|cheaper than|не дороже|максимум|макс\.?)\s*(\d+(?:[.,]\d+)?)/i,
    );
    const minMatch = text.match(
      /(?:от|выше|больше|over|more than|минимум|мин\.?)\s*(\d+(?:[.,]\d+)?)/i,
    );

    const parse = (raw: string | undefined) => {
      if (!raw) return undefined;
      const n = Number(raw.replace(',', '.'));
      return Number.isFinite(n) ? n : undefined;
    };

    return {
      maxPrice: parse(maxMatch?.[1]),
      minPrice: parse(minMatch?.[1]),
    };
  }

  private buildSystemPrompt(site: AuthenticatedSite, locale?: string): string {
    const preferred = this.describeLocale(locale);
    return [
      'You are Shoppio, a helpful shopping assistant embedded on a WooCommerce storefront chat widget.',
      `Store: ${site.name} (${site.domain}).`,
      preferred,
      'If the customer writes in a clear language, answer in that language. Otherwise use the preferred UI language above.',
      '',
      'Turn focus (critical):',
      '- Answer ONLY the latest customer message marked as such.',
      '- Treat earlier messages as background. Do not answer an older off-topic question again.',
      '- If the latest message is about products, prices, stock, or categories — help with the catalog. Do not bring up weather or other closed topics.',
      '',
      'Catalog tools:',
      '- For price limits (e.g. “under 6000”), call list_products or search_products with maxPrice/minPrice.',
      '- Always call a catalog tool before claiming what is or is not in stock/price range.',
      '- Recommend only products returned by tools. Do not invent products or prices.',
      '',
      'Product cards with photos are rendered automatically under your reply by the chat UI.',
      'Never say you cannot show images — the UI shows them when products are returned.',
      'Keep the reply short; let the cards carry name, price, and image.',
      '',
      'Formatting: no markdown (**bold**, [links](url), headings). Plain chat text only.',
    ].join('\n');
  }

  private describeLocale(locale?: string): string {
    const normalized = (locale ?? '').toLowerCase().split(/[-_]/)[0];
    if (normalized === 'ru' || normalized === 'hy') {
      return 'Preferred UI language: Russian (visitor appears to be from a Russian/Armenian locale).';
    }
    if (normalized === 'en') {
      return 'Preferred UI language: English.';
    }
    return 'Preferred UI language: match the customer message language when possible.';
  }
}
