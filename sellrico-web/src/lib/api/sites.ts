import { apiRequest } from "@/lib/api/client"
import type { ConnectCodeResponse, Site, SyncProgress } from "@/lib/types"

/** Site management always uses the real Shoppio API. */
export async function listSites(): Promise<Site[]> {
  return apiRequest<Site[]>("/sites")
}

export async function getSite(id: string): Promise<Site> {
  return apiRequest<Site>(`/sites/${id}`)
}

export async function createSite(input: {
  domain: string
  name?: string
}): Promise<Site> {
  return apiRequest<Site>("/sites", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function disconnectSite(id: string): Promise<void> {
  await apiRequest<{ disconnected: boolean }>(`/sites/${id}/disconnect`, {
    method: "POST",
  })
}

export async function createConnectCode(siteId: string): Promise<ConnectCodeResponse> {
  return apiRequest<ConnectCodeResponse>(`/sites/${siteId}/connect-code`, {
    method: "POST",
  })
}

export async function pollConnection(siteId: string): Promise<Site> {
  // Retry a few times while the merchant finishes the WordPress plugin step.
  const attempts = 8
  let lastError: unknown
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await apiRequest<Site>(`/sites/${siteId}/connection-status`)
    } catch (err) {
      lastError = err
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Store is not connected yet")
}

export async function getSyncProgress(siteId: string): Promise<SyncProgress> {
  return apiRequest<SyncProgress>(`/sites/${siteId}/sync-status`)
}
