import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Placeholder until a market-specific provider (Paddle, Stripe, or another)
 * is wired in. Plan entitlements do not depend on this class.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: {
    userId: string;
    planSlug: string;
    interval: 'monthly' | 'annual';
  }): Promise<{ url: string }>;
  createPortalSession(input: { userId: string }): Promise<{ url: string }>;
}

@Injectable()
export class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = 'none';

  createCheckoutSession(_input: {
    userId: string;
    planSlug: string;
    interval: 'monthly' | 'annual';
  }): Promise<{ url: string }> {
    throw new HttpException(
      {
        code: 'BILLING_PROVIDER_NOT_CONFIGURED',
        message:
          'A payment provider is not connected yet. Paid upgrades will be available once billing is enabled.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  createPortalSession(_input: { userId: string }): Promise<{ url: string }> {
    throw new HttpException(
      {
        code: 'BILLING_PROVIDER_NOT_CONFIGURED',
        message:
          'A payment provider is not connected yet. Subscription management will open here once billing is enabled.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}

@Injectable()
export class BillingService {
  constructor(private readonly provider: UnconfiguredPaymentProvider) {}

  createCheckoutSession(input: {
    userId: string;
    planSlug: string;
    interval: 'monthly' | 'annual';
  }): Promise<{ url: string }> {
    return this.provider.createCheckoutSession(input);
  }

  createPortalSession(userId: string): Promise<{ url: string }> {
    return this.provider.createPortalSession({ userId });
  }
}
