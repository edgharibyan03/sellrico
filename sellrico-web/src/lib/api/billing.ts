import { apiRequest, isMockApiEnabled } from "@/lib/api/client"
import { pricingConfig } from "@/lib/config/pricing"
import { mockStore } from "@/lib/mock/store"
import type { BillingPlan, PlanId, Subscription } from "@/lib/types"

export async function getPlans(): Promise<BillingPlan[]> {
  if (isMockApiEnabled()) return [...pricingConfig.plans]
  return apiRequest<BillingPlan[]>("/billing/plans")
}

export async function getSubscription(): Promise<Subscription> {
  if (isMockApiEnabled()) return mockStore.getSubscription()
  return apiRequest<Subscription>("/billing/subscription")
}

export async function createCheckout(planId: PlanId): Promise<{ url: string }> {
  if (isMockApiEnabled()) return mockStore.checkout(planId)
  return apiRequest<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planId }),
  })
}

export async function createPortalSession(): Promise<{ url: string }> {
  if (isMockApiEnabled()) return mockStore.portal()
  return apiRequest<{ url: string }>("/billing/portal", { method: "POST" })
}
