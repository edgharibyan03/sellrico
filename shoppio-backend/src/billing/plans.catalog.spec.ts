import { PLAN_CATALOG, PLAN_FEATURES } from './plans.catalog';

describe('plan catalog', () => {
  it('defines the three launch plans with stable slugs', () => {
    expect(PLAN_CATALOG.map((plan) => plan.slug)).toEqual(['free', 'pro', 'business']);
  });

  it('stores the initial prices and limits in one place', () => {
    expect(PLAN_CATALOG.find((plan) => plan.slug === 'free')).toMatchObject({
      priceMonthly: 0,
      priceAnnual: null,
      maxSites: 1,
      maxProducts: 100,
      maxAiMessages: 100,
    });
    expect(PLAN_CATALOG.find((plan) => plan.slug === 'pro')).toMatchObject({
      priceMonthly: 19,
      priceAnnual: null,
      maxSites: 3,
      maxProducts: 2000,
      maxAiMessages: 2000,
    });
    expect(PLAN_CATALOG.find((plan) => plan.slug === 'business')).toMatchObject({
      priceMonthly: 49,
      priceAnnual: null,
      maxSites: 10,
      maxProducts: 10000,
      maxAiMessages: 10000,
    });
  });

  it('grants paid features by entitlement key, including product exclusions on every plan', () => {
    const free = PLAN_CATALOG.find((plan) => plan.slug === 'free')!;
    const pro = PLAN_CATALOG.find((plan) => plan.slug === 'pro')!;
    const business = PLAN_CATALOG.find((plan) => plan.slug === 'business')!;

    expect(free.features).toContain(PLAN_FEATURES.productExclusions);
    expect(free.features).not.toContain(PLAN_FEATURES.analytics);
    expect(free.features).not.toContain(PLAN_FEATURES.removeBranding);

    expect(pro.features).toContain(PLAN_FEATURES.analytics);
    expect(pro.features).toContain(PLAN_FEATURES.removeBranding);
    expect(pro.features).toContain(PLAN_FEATURES.fullAssistantCustomization);
    expect(pro.features).not.toContain(PLAN_FEATURES.advancedAnalytics);

    expect(business.features).toContain(PLAN_FEATURES.advancedAnalytics);
    expect(business.features).toContain(PLAN_FEATURES.unlimitedHistory);
    expect(business.features).toContain(PLAN_FEATURES.analytics);
    expect(business.historyRetentionDays).toBeNull();
    expect(pro.historyRetentionDays).toBe(90);
  });
});
