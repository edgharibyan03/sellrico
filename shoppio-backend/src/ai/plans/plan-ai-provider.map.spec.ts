import {
  PLAN_AI_PROVIDER,
  resolveProviderNameForPlan,
} from './plan-ai-provider.map';

describe('PLAN_AI_PROVIDER mapping', () => {
  it('maps free → deepseek and pro/business → openai', () => {
    expect(PLAN_AI_PROVIDER.free).toBe('deepseek');
    expect(PLAN_AI_PROVIDER.pro).toBe('openai');
    expect(PLAN_AI_PROVIDER.business).toBe('openai');
  });

  it('resolves known plans case-insensitively', () => {
    expect(resolveProviderNameForPlan('free')).toBe('deepseek');
    expect(resolveProviderNameForPlan('PRO')).toBe('openai');
    expect(resolveProviderNameForPlan('Business')).toBe('openai');
  });

  it('falls back to free mapping for unknown plans', () => {
    expect(resolveProviderNameForPlan('enterprise')).toBe('deepseek');
    expect(resolveProviderNameForPlan('')).toBe('deepseek');
  });
});
