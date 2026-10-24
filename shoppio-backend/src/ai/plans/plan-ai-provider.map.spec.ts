import {
  PLAN_AI_PROVIDER,
  resolveProviderNameForPlan,
} from './plan-ai-provider.map';

describe('PLAN_AI_PROVIDER mapping', () => {
  it('maps all plans → deepseek', () => {
    expect(PLAN_AI_PROVIDER.free).toBe('deepseek');
    expect(PLAN_AI_PROVIDER.pro).toBe('deepseek');
    expect(PLAN_AI_PROVIDER.business).toBe('deepseek');
  });

  it('resolves known plans case-insensitively', () => {
    expect(resolveProviderNameForPlan('free')).toBe('deepseek');
    expect(resolveProviderNameForPlan('PRO')).toBe('deepseek');
    expect(resolveProviderNameForPlan('Business')).toBe('deepseek');
  });

  it('falls back to free mapping for unknown plans', () => {
    expect(resolveProviderNameForPlan('enterprise')).toBe('deepseek');
    expect(resolveProviderNameForPlan('')).toBe('deepseek');
  });
});
