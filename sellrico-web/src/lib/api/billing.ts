import { apiRequest } from "@/lib/api/client";
import type { BillingPlan, PlanId, Subscription } from "@/lib/types";

/** Billing is live on the API — never use the local mock store. */
export async function getPlans(): Promise<BillingPlan[]> {
  return apiRequest<BillingPlan[]>("/billing/plans");
}

export async function getSubscription(): Promise<Subscription> {
  return apiRequest<Subscription>("/billing/subscription");
}

export async function createCheckout(
  planId: PlanId,
): Promise<{ url: string | null }> {
  return apiRequest<{ url: string | null }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/portal", { method: "POST" });
}
