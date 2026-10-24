import { apiRequest } from "@/lib/api/client"
import type { AssistantSettings } from "@/lib/types"

export async function getAssistant(siteId: string): Promise<AssistantSettings> {
  return apiRequest<AssistantSettings>(`/sites/${siteId}/assistant`)
}

export async function updateAssistant(
  siteId: string,
  patch: Partial<AssistantSettings>,
): Promise<AssistantSettings> {
  const {
    siteId: _ignored,
    ...body
  } = patch

  return apiRequest<AssistantSettings>(`/sites/${siteId}/assistant`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}
