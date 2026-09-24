import { AIProviderFactory } from './ai-provider.factory';
import { PlanResolverService } from '../plans/plan-resolver.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { DeepSeekProvider } from '../providers/deepseek.provider';

describe('AIProviderFactory', () => {
  const openAI = { name: 'openai' } as OpenAIProvider;
  const deepSeek = { name: 'deepseek' } as DeepSeekProvider;
  const planResolver = {
    resolvePlanForSite: jest.fn(),
  } as unknown as PlanResolverService;

  let factory: AIProviderFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new AIProviderFactory(planResolver, openAI, deepSeek);
  });

  it('returns DeepSeek for free plan and OpenAI for pro', () => {
    expect(factory.getProviderForPlan('free')).toBe(deepSeek);
    expect(factory.getProviderForPlan('pro')).toBe(openAI);
    expect(factory.getProviderForPlan('business')).toBe(openAI);
  });

  it('getProviderForUser uses explicit planId', async () => {
    const provider = await factory.getProviderForUser({ planId: 'pro' });
    expect(provider).toBe(openAI);
    expect(planResolver.resolvePlanForSite).not.toHaveBeenCalled();
  });

  it('getProviderForUser resolves plan from siteId', async () => {
    (planResolver.resolvePlanForSite as jest.Mock).mockResolvedValue('free');
    const provider = await factory.getProviderForUser({ siteId: 'site-1' });
    expect(planResolver.resolvePlanForSite).toHaveBeenCalledWith('site-1');
    expect(provider).toBe(deepSeek);
  });

  it('defaults to free provider when no context is given', async () => {
    const provider = await factory.getProviderForUser({});
    expect(provider).toBe(deepSeek);
  });
});
