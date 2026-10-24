/** Internal per-1K token rates (USD). Empty until provider pricing is configured. */
const AI_TOKEN_RATES_PER_1K: Record<string, { input: number; output: number }> = {};

export function estimateAiCostUsd(input: {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const rate =
    AI_TOKEN_RATES_PER_1K[`${input.provider}:${input.model}`] ??
    AI_TOKEN_RATES_PER_1K[input.provider];
  if (!rate) {
    return 0;
  }
  return (input.inputTokens / 1000) * rate.input + (input.outputTokens / 1000) * rate.output;
}
