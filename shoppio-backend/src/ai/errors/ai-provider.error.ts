export type AIProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTHENTICATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'INVALID_REQUEST'
  | 'MODEL_UNAVAILABLE'
  | 'EMPTY_RESPONSE'
  | 'PROVIDER_ERROR';

export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;
  readonly provider?: string;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    code: AIProviderErrorCode,
    message: string,
    options?: { provider?: string; status?: number; cause?: unknown },
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.provider = options?.provider;
    this.status = options?.status;
    this.cause = options?.cause;
  }
}
