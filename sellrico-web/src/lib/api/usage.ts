import { apiRequest, isMockApiEnabled } from "@/lib/api/client"
import { mockStore } from "@/lib/mock/store"
import type { UsageSummary } from "@/lib/types"

export async function getUsageSummary(): Promise<UsageSummary> {
  if (isMockApiEnabled()) return mockStore.getUsage()
  return apiRequest<UsageSummary>("/usage/summary")
}
