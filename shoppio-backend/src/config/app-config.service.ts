import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get<number>('PORT', 3000);
  }

  get appUrl(): string {
    return this.config.getOrThrow<string>('APP_URL');
  }

  get apiUrl(): string {
    return this.config.getOrThrow<string>('API_URL');
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.config.get<string>('JWT_EXPIRES_IN', '7d');
  }

  /** @deprecated Prefer openAiApiKey — kept for backward compatible env. */
  get aiProviderApiKey(): string | undefined {
    return this.openAiApiKey;
  }

  get openAiApiKey(): string | undefined {
    const primary = this.config.get<string>('OPENAI_API_KEY');
    if (primary && primary.length > 0) {
      return primary;
    }
    const legacy = this.config.get<string>('AI_PROVIDER_API_KEY');
    return legacy && legacy.length > 0 ? legacy : undefined;
  }

  get openAiModel(): string {
    return this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  get openAiBaseUrl(): string | undefined {
    const value = this.config.get<string>('OPENAI_BASE_URL');
    return value && value.length > 0 ? value : undefined;
  }

  get deepSeekApiKey(): string | undefined {
    const value = this.config.get<string>('DEEPSEEK_API_KEY');
    return value && value.length > 0 ? value : undefined;
  }

  get deepSeekModel(): string {
    return this.config.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  get deepSeekBaseUrl(): string {
    return this.config.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
  }

  /** Allowed browser origins for the merchant dashboard (sellrico-web). */

  get corsOrigins(): string[] {
    const raw = this.config.get<string>('CORS_ORIGINS', '');
    if (raw.trim()) {
      return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    }
    return ['http://localhost:3001', 'http://localhost:3003'];
  }
}
