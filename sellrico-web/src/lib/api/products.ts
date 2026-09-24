import { apiRequest } from "@/lib/api/client"
import type { Paginated, Product } from "@/lib/types"

/** Products always come from the Shoppio backend (synced from WooCommerce). */
export async function listProducts(params: {
  siteId?: string
  q?: string
  page?: number
  pageSize?: number
} = {}): Promise<Paginated<Product>> {
  const search = new URLSearchParams()
  if (params.siteId) search.set("siteId", params.siteId)
  if (params.q) search.set("q", params.q)
  if (params.page) search.set("page", String(params.page))
  if (params.pageSize) search.set("pageSize", String(params.pageSize))
  const qs = search.toString()
  return apiRequest<Paginated<Product>>(`/products${qs ? `?${qs}` : ""}`)
}
