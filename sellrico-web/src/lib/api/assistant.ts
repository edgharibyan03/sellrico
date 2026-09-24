import { apiRequest, isMockApiEnabled } from "@/lib/api/client"
import { mockStore } from "@/lib/mock/store"
import type { AssistantSettings } from "@/lib/types"

export async function getAssistant(siteId: string): Promise<AssistantSettings> {
  if (isMockApiEnabled()) return mockStore.getAssistant(siteId)
  return apiRequest<AssistantSettings>(`/sites/${siteId}/assistant`)
}

export async function updateAssistant(
  siteId: string,
  patch: Partial<AssistantSettings>,
): Promise<AssistantSettings> {
  if (isMockApiEnabled()) return mockStore.updateAssistant(siteId, patch)
  return apiRequest<AssistantSettings>(`/sites/${siteId}/assistant`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}
