import { SubscriptionStatus } from '@prisma/client';

export interface EffectivePlanInput<T> {
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  plan: T;
}

/**
 * Paid entitlements stay available while a subscription is active, trialing,
 * past due before the period ends, or canceled with time left in the period.
 * After that, the account falls back to Free without deleting data.
 */
export function resolveEffectivePlan<T>(input: {
  subscription: EffectivePlanInput<T> | null;
  freePlan: T;
  now?: Date;
}): { plan: T; accessRestricted: boolean } {
  const now = input.now ?? new Date();
  const subscription = input.subscription;
  if (!subscription) {
    return { plan: input.freePlan, accessRestricted: false };
  }

  const withinPeriod = subscription.currentPeriodEnd.getTime() > now.getTime();

  switch (subscription.status) {
    case SubscriptionStatus.ACTIVE:
    case SubscriptionStatus.TRIALING:
      return { plan: subscription.plan, accessRestricted: false };
    case SubscriptionStatus.PAST_DUE:
    case SubscriptionStatus.CANCELED:
      if (withinPeriod) {
        return { plan: subscription.plan, accessRestricted: false };
      }
      return {
        plan: input.freePlan,
        accessRestricted: subscription.plan !== input.freePlan,
      };
    case SubscriptionStatus.EXPIRED:
      return {
        plan: input.freePlan,
        accessRestricted: subscription.plan !== input.freePlan,
      };
    default:
      return { plan: input.freePlan, accessRestricted: true };
  }
}
