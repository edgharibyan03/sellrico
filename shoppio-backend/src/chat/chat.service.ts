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
import {
  pickProductsMentionedInReply,
  SearchIndustry,
} from '../ai/tools/catalog-search.rank';
import { CATALOG_TOOLS } from '../ai/tools/catalog.tools';
import { AIMessage } from '../ai/types/ai.types';
import { AssistantService, AssistantSettingsDto } from '../assistant/assistant.service';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
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
    private readonly usage: UsageService,
    private readonly assistant: AssistantService,
  ) {}

  async handleMessage(site: AuthenticatedSite, dto: ChatMessageDto): Promise<ChatResponseDto> {
    const reservation = await this.usage.reserveAiMessage(site);
    try {
      return await this.reply(site, dto, reservation);
    } catch (error) {
      await this.usage.releaseAiMessage(reservation);
      throw error;
    }
  }

  private async reply(
    site: AuthenticatedSite,
    dto: ChatMessageDto,
    reservation: Awaited<ReturnType<UsageService['reserveAiMessage']>>,
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
    const assistantSettings = await this.assistant.getForSiteId(site.id);

    const messages: AIMessage[] = history.map((m) => ({
      role: (m.role === MessageRole.ASSISTANT ? 'assistant' : 'user') as 'user' | 'assistant',
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
    const tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let model: string | null = null;
    const systemPrompt = this.buildSystemPrompt(site, dto.locale, assistantSettings);

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await provider.chat({
          system: systemPrompt,
          messages,
          tools: CATALOG_TOOLS,
          temperature: 0.2,
        });
        if (response.usage) {
          tokenUsage.inputTokens += response.usage.inputTokens;
          tokenUsage.outputTokens += response.usage.outputTokens;
          tokenUsage.totalTokens += response.usage.totalTokens;
        }
        model = response.model;

        if (response.toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            content: response.content ?? '',
            toolCalls: response.toolCalls,
          });

          for (const call of response.toolCalls) {
            const { result, products } = await this.catalogTools.execute(
              site.id,
              call,
              { industry: this.resolveIndustry(assistantSettings) },
            );
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
      reply = 'Sorry — I could not generate a reply right now. Please try again in a moment.';
    }

    // Guarantee product cards for catalog-style questions even if the model skipped tools.
    if (collectedProducts.size === 0 && this.looksLikeCatalogRequest(dto.message)) {
      const fallbackQuery = dto.message.trim().slice(0, 120);
      const fallback = await this.catalogTools.execute(
        site.id,
        {
          id: 'fallback_search',
          name: 'search_products',
          arguments: {
            query: fallbackQuery,
            limit: 8,
            ...(priceFilters.maxPrice != null ? { maxPrice: priceFilters.maxPrice } : {}),
            ...(priceFilters.minPrice != null ? { minPrice: priceFilters.minPrice } : {}),
          },
        },
        { industry: this.resolveIndustry(assistantSettings) },
      );
      for (const product of fallback.products) {
        collectedProducts.set(product.id, product);
      }
    }

    const products = this.selectProductsForReply(
      reply,
      Array.from(collectedProducts.values()),
    );

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

    await this.usage.recordTokenUsage(reservation, {
      ...tokenUsage,
      model,
      provider: provider.name,
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

  private async resolveConversation(siteId: string, sessionId: string, conversationId?: string) {
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

  private selectProductsForReply(
    reply: string,
    collected: ChatProductHint[],
  ): ChatProductHint[] {
    if (collected.length === 0) {
      return [];
    }

    const mentioned = pickProductsMentionedInReply(reply, collected);
    if (mentioned.length > 0) {
      return mentioned.slice(0, 8);
    }

    // If the model listed named products that are not in tool results (hallucination),
    // do not dump unrelated accessories under the reply.
    if (this.replyLooksLikeNamedProductList(reply)) {
      return [];
    }

    return collected.slice(0, 8);
  }

  private replyLooksLikeNamedProductList(reply: string): boolean {
    const lines = reply
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const pricedLines = lines.filter((line) =>
      /(\d[\d\s]{2,}\s*(₽|руб|amd|драм|\$|€))|(от\s+\d)/i.test(line),
    );
    return pricedLines.length >= 2;
  }

  private looksLikeCatalogRequest(message: string): boolean {
    const text = message.toLowerCase();
    return /(товар|каталог|продукт|product|catalog|recommend|посовет|подбер|сравн|compare|куп|есть|покаж|show me|find|looking for|список|налич|in stock|image|картин|фото|photo|цен|price|драм|amd|бюджет|дешев|дорог|скид|sale|ниже|до\s+\d|размер|size|цвет|color|бренд|brand|модел|model|sku)/i.test(
      text,
    );
  }

  private resolveIndustry(settings: AssistantSettingsDto): SearchIndustry {
    const raw = String(settings.industry ?? 'auto').toLowerCase().trim();
    if (raw === 'doors' || raw === 'generic' || raw === 'auto') {
      return raw;
    }
    return 'auto';
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

  private buildSystemPrompt(
    site: AuthenticatedSite,
    locale: string | undefined,
    settings: AssistantSettingsDto,
  ): string {
    const preferred = this.describeLocale(locale ?? settings.language);
    const toneLine = this.describeTone(settings.tone);
    const industry = this.resolveIndustry(settings);
    const custom = String(settings.customInstructions ?? '').trim();

    const lines = [
      `You are ${settings.name}, a helpful shopping assistant embedded on a WooCommerce storefront chat widget.`,
      `Store: ${site.name} (${site.domain}).`,
      preferred,
      toneLine,
      'If the customer writes in a clear language, answer in that language. Otherwise use the preferred UI language above.',
      '',
      'Turn focus (critical):',
      '- Answer ONLY the latest customer message marked as such.',
      '- Treat earlier messages as background. Do not answer an older off-topic question again.',
      '- If the latest message is about products, prices, stock, categories, or recommendations — help with the catalog. Do not bring up weather or other closed topics.',
      '',
      'Catalog tools:',
      '- For product discovery, filtering, comparison, or recommendations, call search_products with the customer keywords.',
      '- For browsing by category or price bands, use list_products / search_products with maxPrice/minPrice.',
      '- Always call a catalog tool before claiming what is or is not in stock, price range, or attributes.',
      '- Recommend ONLY products returned by tools in THIS turn.',
      '- Never invent product names, brands, SKUs, prices, stock status, sizes, colors, specs, or compatibility.',
      '- If an attribute the customer asked about is missing from tool results, say that detail is unavailable — do not guess.',
      '- When the customer asks to show cards of products you just listed, search/get those exact product names/ids again.',
      '',
      'Product reply format (critical when tools return products):',
      '- Product cards with photos/prices are rendered by the chat UI between your intro and follow-up.',
      '- Write ONLY a short intro line, then a blank line, then optionally one short follow-up question.',
      '- Do NOT list product names, model numbers, prices, or bullet product lists in the text.',
      '- Do NOT repeat what the cards already show.',
      '- Example:',
      '  Here are matching products from the catalog:',
      '',
      '  If you need a specific size, color, or budget, tell me and I will narrow it down.',
      '',
      'Formatting: no markdown (**bold**, [links](url), headings). Plain chat text only.',
    ];

    if (industry === 'doors') {
      lines.push(
        '',
        'Store vertical hints (doors):',
        '- Prefer exact model/series matches from the customer query.',
        '- If the customer asks for межкомнатные (interior) doors, do not recommend входные (entrance) doors, and vice versa.',
        '- If tools return hardware accessories (latches, hinges, seals) but the customer asked for doors, say you did not find matching doors.',
      );
    }

    if (custom) {
      lines.push('', 'Merchant instructions:', custom.slice(0, 2000));
    }

    return lines.join('\n');
  }

  private describeTone(tone: string): string {
    switch (tone) {
      case 'professional':
        return 'Tone: professional, clear, and courteous.';
      case 'concise':
        return 'Tone: concise and direct. Keep answers short.';
      case 'enthusiastic':
        return 'Tone: enthusiastic and upbeat, without being pushy.';
      case 'friendly':
      default:
        return 'Tone: friendly and helpful.';
    }
  }

  private describeLocale(locale?: string): string {
    const normalized = (locale ?? '').toLowerCase().split(/[-_]/)[0];
    if (normalized === 'ru' || normalized === 'hy') {
      return 'Preferred UI language: Russian.';
    }
    if (normalized === 'es') {
      return 'Preferred UI language: Spanish.';
    }
    if (normalized === 'fr') {
      return 'Preferred UI language: French.';
    }
    if (normalized === 'de') {
      return 'Preferred UI language: German.';
    }
    if (normalized === 'en') {
      return 'Preferred UI language: English.';
    }
    return 'Preferred UI language: match the customer message language when possible.';
  }
}
