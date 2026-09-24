import { PlanId, AIProviderName } from '../types/ai.types';

/**
 * Central mapping: subscription plan → AI provider.
 * Chat/business code must not duplicate this logic.
 */
export const PLAN_AI_PROVIDER: Record<PlanId, AIProviderName> = {
  free: 'deepseek',
  pro: 'openai',
  business: 'openai',
};

export function resolveProviderNameForPlan(planId: string): AIProviderName {
  const normalized = planId.toLowerCase() as PlanId;
  return PLAN_AI_PROVIDER[normalized] ?? PLAN_AI_PROVIDER.free;
}
