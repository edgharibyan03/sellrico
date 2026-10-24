import { SubscriptionStatus } from '@prisma/client';
import { resolveEffectivePlan } from './effective-plan';

const free = { slug: 'free', features: ['product_exclusions'] };
const pro = { slug: 'pro', features: ['analytics', 'remove_branding'] };

describe('resolveEffectivePlan', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  it('keeps paid features while active, trialing, or still inside a past-due or canceled period', () => {
    for (const status of [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.CANCELED,
    ]) {
      const result = resolveEffectivePlan({
        subscription: { status, currentPeriodEnd: future, plan: pro },
        freePlan: free,
      });
      expect(result.plan.slug).toBe('pro');
      expect(result.accessRestricted).toBe(false);
    }
  });

  it('falls back to Free after the period ends or the subscription expires', () => {
    for (const status of [
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.CANCELED,
      SubscriptionStatus.EXPIRED,
    ]) {
      const result = resolveEffectivePlan({
        subscription: { status, currentPeriodEnd: past, plan: pro },
        freePlan: free,
      });
      expect(result.plan).toBe(free);
      expect(result.accessRestricted).toBe(true);
    }
  });
});
