import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssistantSettings, Prisma } from '@prisma/client';
import { EntitlementService } from '../billing/entitlement.service';
import { PLAN_FEATURES } from '../billing/plans.catalog';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAssistantDto } from './dto/update-assistant.dto';

export interface AssistantSettingsDto {
  siteId: string;
  name: string;
  welcomeMessage: string;
  language: string;
  tone: string;
  primaryColor: string;
  suggestedQuestions: string[];
  offsetRight: number;
  offsetBottom: number;
}

const DEFAULT_WELCOME =
  'Hi! Looking for something specific? I can help you find products.';

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  async getForUser(user: AuthenticatedUser, siteId: string): Promise<AssistantSettingsDto> {
    await this.assertOwnedSite(user.id, siteId);
    const row = await this.ensureDefaults(siteId);
    return this.toDto(row);
  }

  async updateForUser(
    user: AuthenticatedUser,
    siteId: string,
    dto: UpdateAssistantDto,
  ): Promise<AssistantSettingsDto> {
    await this.assertOwnedSite(user.id, siteId);
    await this.ensureDefaults(siteId);

    const snapshot = await this.entitlements.resolveForUser(user.id);
    const full = snapshot.plan.features.includes(PLAN_FEATURES.fullAssistantCustomization);

    if (!full) {
      const locked = [
        dto.name,
        dto.language,
        dto.tone,
        dto.primaryColor,
        dto.suggestedQuestions,
        dto.offsetRight,
        dto.offsetBottom,
      ].some((value) => value !== undefined);
      if (locked) {
        throw new ForbiddenException({
          code: 'ASSISTANT_FEATURE_LOCKED',
          message: 'Full assistant customization requires Pro or Business.',
        });
      }
    }

    const data: Prisma.AssistantSettingsUpdateInput = {};
    if (dto.welcomeMessage !== undefined) {
      data.welcomeMessage = dto.welcomeMessage.trim();
    }
    if (full) {
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.language !== undefined) data.language = dto.language;
      if (dto.tone !== undefined) data.tone = dto.tone;
      if (dto.primaryColor !== undefined) data.primaryColor = dto.primaryColor.toUpperCase();
      if (dto.suggestedQuestions !== undefined) {
        data.suggestedQuestions = dto.suggestedQuestions
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 8);
      }
      if (dto.offsetRight !== undefined) data.offsetRight = dto.offsetRight;
      if (dto.offsetBottom !== undefined) data.offsetBottom = dto.offsetBottom;
    }

    const updated = await this.prisma.assistantSettings.update({
      where: { siteId },
      data,
    });
    return this.toDto(updated);
  }

  async getForSiteId(siteId: string): Promise<AssistantSettingsDto> {
    const row = await this.ensureDefaults(siteId);
    return this.toDto(row);
  }

  private async assertOwnedSite(userId: string, siteId: string): Promise<void> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, ownerUserId: userId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException({
        code: 'SITE_NOT_FOUND',
        message: 'Site not found',
      });
    }
  }

  private async ensureDefaults(siteId: string): Promise<AssistantSettings> {
    const existing = await this.prisma.assistantSettings.findUnique({ where: { siteId } });
    if (existing) {
      return existing;
    }
    return this.prisma.assistantSettings.create({
      data: {
        siteId,
        welcomeMessage: DEFAULT_WELCOME,
        suggestedQuestions: [
          'What do you recommend?',
          'Show me popular products',
          'Do you have anything on sale?',
        ],
      },
    });
  }

  private toDto(row: AssistantSettings): AssistantSettingsDto {
    return {
      siteId: row.siteId,
      name: row.name,
      welcomeMessage: row.welcomeMessage,
      language: row.language,
      tone: row.tone,
      primaryColor: row.primaryColor,
      suggestedQuestions: this.asStringArray(row.suggestedQuestions),
      offsetRight: row.offsetRight,
      offsetBottom: row.offsetBottom,
    };
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }
}
