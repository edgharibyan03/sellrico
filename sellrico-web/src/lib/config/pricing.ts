import type { BillingPlan, PlanId } from "@/lib/types";

/** Display helpers. Plan prices and limits come from the billing API. */
export const BILLING_CURRENCY = "USD";

export function formatMoney(
  amount: number | null,
  currency = BILLING_CURRENCY,
): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPlanPrice(
  plan: BillingPlan,
  interval: "monthly" | "annual",
): string {
  if (interval === "annual") {
    if (!plan.annualBillingAvailable || plan.annualPrice == null) {
      return "Not available yet";
    }
    return formatMoney(plan.annualPrice, plan.currency);
  }
  if (plan.monthlyPrice == null) return "—";
  return formatMoney(plan.monthlyPrice, plan.currency);
}

export function planById(
  plans: BillingPlan[],
  id: PlanId,
): BillingPlan | undefined {
  return plans.find((plan) => plan.id === id);
}

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: "ai_product_search", label: "AI product search" },
  { key: "product_recommendations", label: "Product recommendations" },
  { key: "product_cards", label: "Product cards" },
  { key: "add_to_cart", label: "Add to cart" },
  {
    key: "basic_assistant_customization",
    label: "Basic assistant customization",
  },
  { key: "custom_welcome_message", label: "Custom welcome message" },
  { key: "product_exclusions", label: "Product exclusions" },
  {
    key: "full_assistant_customization",
    label: "Full assistant customization",
  },
  { key: "custom_branding", label: "Custom branding" },
  { key: "analytics", label: "Analytics" },
  { key: "advanced_analytics", label: "Advanced analytics" },
  { key: "remove_branding", label: "Remove Shoppio branding" },
  { key: "priority_support", label: "Priority support" },
];

function historyLabel(days: number | null | undefined): string {
  if (days == null) return "Unlimited";
  if (days === 90) return "90 days";
  return `${days} days`;
}

function limitLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}

export interface ComparisonRow {
  key: string;
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
}

export function buildComparison(plans: BillingPlan[]): ComparisonRow[] {
  const free = planById(plans, "free");
  const pro = planById(plans, "pro");
  const business = planById(plans, "business");
  if (!free || !pro || !business) return [];

  const included = (plan: BillingPlan, key: string) =>
    (plan.featureKeys ?? []).includes(key);

  return [
    {
      key: "sites",
      label: "WooCommerce sites",
      free: limitLabel(free.limits.sites),
      pro: limitLabel(pro.limits.sites),
      business: limitLabel(business.limits.sites),
    },
    {
      key: "products",
      label: "Products",
      free: limitLabel(free.limits.products),
      pro: limitLabel(pro.limits.products),
      business: limitLabel(business.limits.products),
    },
    {
      key: "ai",
      label: "AI messages / month",
      free: limitLabel(free.limits.aiMessages),
      pro: limitLabel(pro.limits.aiMessages),
      business: limitLabel(business.limits.aiMessages),
    },
    {
      key: "history",
      label: "Conversation history",
      free: historyLabel(free.historyRetentionDays),
      pro: historyLabel(pro.historyRetentionDays),
      business: historyLabel(business.historyRetentionDays),
    },
    ...FEATURE_LABELS.map((row) => ({
      key: row.key,
      label: row.label,
      free: included(free, row.key),
      pro: included(pro, row.key),
      business: included(business, row.key),
    })),
  ];
}
