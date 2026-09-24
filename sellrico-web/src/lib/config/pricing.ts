import type { BillingPlan, PlanId } from "@/lib/types"

/**
 * Centralized pricing configuration.
 * Prices and limits are placeholders — change values here only.
 * Do not hardcode prices in UI components.
 */
export const pricingConfig = {
  currency: "USD",
  currencySymbol: "$",
  /** When true, show "Coming soon" instead of numeric prices */
  pricesUndecided: true,
  annualDiscountLabel: "Save ~20%",
  placeholderNote:
    "Pricing is not finalized. Limits and prices below are illustrative placeholders.",
  plans: [
    {
      id: "free" as PlanId,
      name: "Free",
      description: "Try Shoppio on a single WooCommerce store via Sellrico.",
      monthlyPrice: null,
      annualPrice: null,
      currency: "USD",
      highlighted: false,
      features: [
        "1 WooCommerce site",
        "Basic AI product discovery",
        "Limited AI messages / month",
        "Product sync",
        "Community support",
      ],
      limits: {
        sites: 1,
        products: 100,
        aiMessages: 500,
      },
    },
    {
      id: "pro" as PlanId,
      name: "Pro",
      description: "For growing stores that need more AI capacity.",
      monthlyPrice: null,
      annualPrice: null,
      currency: "USD",
      highlighted: true,
      features: [
        "Up to 3 WooCommerce sites",
        "Advanced recommendations",
        "Higher AI message limits",
        "Product comparison",
        "Priority email support",
      ],
      limits: {
        sites: 3,
        products: 5000,
        aiMessages: 5000,
      },
    },
    {
      id: "business" as PlanId,
      name: "Business",
      description: "For multi-store teams and higher volume.",
      monthlyPrice: null,
      annualPrice: null,
      currency: "USD",
      highlighted: false,
      features: [
        "Unlimited sites*",
        "Highest AI usage limits",
        "Custom assistant branding",
        "Future shopping actions",
        "Dedicated support",
      ],
      limits: {
        sites: null,
        products: null,
        aiMessages: 25000,
      },
    },
  ] satisfies BillingPlan[],
  comparisonRows: [
    { key: "sites", label: "Connected sites", free: "1", pro: "3", business: "Unlimited*" },
    {
      key: "products",
      label: "Synced products",
      free: "100",
      pro: "5,000",
      business: "Unlimited*",
    },
    {
      key: "ai",
      label: "AI messages / month",
      free: "500",
      pro: "5,000",
      business: "25,000",
    },
    {
      key: "discovery",
      label: "AI product discovery",
      free: true,
      pro: true,
      business: true,
    },
    {
      key: "recommendations",
      label: "Recommendations",
      free: "Basic",
      pro: "Advanced",
      business: "Advanced",
    },
    {
      key: "comparison",
      label: "Product comparison",
      free: false,
      pro: true,
      business: true,
    },
    {
      key: "branding",
      label: "Custom branding",
      free: false,
      pro: "Color & name",
      business: "Full",
    },
    {
      key: "support",
      label: "Support",
      free: "Community",
      pro: "Email",
      business: "Dedicated",
    },
  ],
} as const

export function getPlan(id: PlanId): BillingPlan {
  const plan = pricingConfig.plans.find((p) => p.id === id)
  if (!plan) {
    throw new Error(`Unknown plan: ${id}`)
  }
  return plan
}

export function formatPlanPrice(
  plan: BillingPlan,
  interval: "monthly" | "annual",
): string {
  if (pricingConfig.pricesUndecided) {
    return "TBD"
  }
  const value = interval === "monthly" ? plan.monthlyPrice : plan.annualPrice
  if (value === null) {
    return "Custom"
  }
  return `${pricingConfig.currencySymbol}${value}`
}
