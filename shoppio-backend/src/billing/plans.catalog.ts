/**
 * Initial plan catalog.
 *
 * Services do not read these numbers at request time. PlanService seeds
 * them into the `plans` table, and entitlements are resolved from that table.
 * Annual prices are intentionally unset.
 */
export const PLAN_FEATURES = {
  aiProductSearch: 'ai_product_search',
  productRecommendations: 'product_recommendations',
  productCards: 'product_cards',
  addToCart: 'add_to_cart',
  basicAssistantCustomization: 'basic_assistant_customization',
  fullAssistantCustomization: 'full_assistant_customization',
  customWelcomeMessage: 'custom_welcome_message',
  productExclusions: 'product_exclusions',
  basicConversationHistory: 'basic_conversation_history',
  extendedHistory: 'extended_history',
  unlimitedHistory: 'unlimited_history',
  customBranding: 'custom_branding',
  removeBranding: 'remove_branding',
  analytics: 'analytics',
  advancedAnalytics: 'advanced_analytics',
  prioritySupport: 'priority_support',
} as const;

export type PlanFeature = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];

export type PlanSlug = 'free' | 'pro' | 'business';

export interface PlanCatalogEntry {
  slug: PlanSlug;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number | null;
  maxSites: number;
  maxProducts: number;
  maxAiMessages: number;
  /** Null means history is not time-limited. */
  historyRetentionDays: number | null;
  features: PlanFeature[];
  highlights: string[];
  highlighted: boolean;
}

const FREE_FEATURES: PlanFeature[] = [
  PLAN_FEATURES.aiProductSearch,
  PLAN_FEATURES.productRecommendations,
  PLAN_FEATURES.productCards,
  PLAN_FEATURES.addToCart,
  PLAN_FEATURES.basicAssistantCustomization,
  PLAN_FEATURES.customWelcomeMessage,
  PLAN_FEATURES.productExclusions,
  PLAN_FEATURES.basicConversationHistory,
];

const PRO_FEATURES: PlanFeature[] = [
  ...FREE_FEATURES,
  PLAN_FEATURES.fullAssistantCustomization,
  PLAN_FEATURES.customBranding,
  PLAN_FEATURES.analytics,
  PLAN_FEATURES.extendedHistory,
  PLAN_FEATURES.removeBranding,
  PLAN_FEATURES.prioritySupport,
];

const BUSINESS_FEATURES: PlanFeature[] = [
  ...PRO_FEATURES,
  PLAN_FEATURES.advancedAnalytics,
  PLAN_FEATURES.unlimitedHistory,
];

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Try Shoppio on a single WooCommerce store.',
    priceMonthly: 0,
    priceAnnual: null,
    maxSites: 1,
    maxProducts: 100,
    maxAiMessages: 100,
    historyRetentionDays: 30,
    features: FREE_FEATURES,
    highlights: [
      '1 WooCommerce site',
      '100 products',
      '100 AI messages / month',
      'AI product search',
      'Product recommendations',
      'Product cards and add to cart',
      'Basic assistant customization',
      'Custom welcome message',
      'Product exclusions',
      'Basic conversation history',
      'Shoppio branding',
    ],
    highlighted: false,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'For growing stores that need more capacity and analytics.',
    priceMonthly: 19,
    priceAnnual: null,
    maxSites: 3,
    maxProducts: 2000,
    maxAiMessages: 2000,
    historyRetentionDays: 90,
    features: PRO_FEATURES,
    highlights: [
      '3 WooCommerce sites',
      '2,000 products',
      '2,000 AI messages / month',
      'Everything in Free',
      'Full assistant customization',
      'Custom branding',
      'Analytics',
      '90-day conversation history',
      'Remove Shoppio branding',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    slug: 'business',
    name: 'Business',
    description: 'For multi-store teams with higher limits.',
    priceMonthly: 49,
    priceAnnual: null,
    maxSites: 10,
    maxProducts: 10000,
    maxAiMessages: 10000,
    historyRetentionDays: null,
    features: BUSINESS_FEATURES,
    highlights: [
      '10 WooCommerce sites',
      '10,000 products',
      '10,000 AI messages / month',
      'Everything in Pro',
      'Advanced analytics',
      'Unlimited conversation history',
      'Priority support',
      'Higher limits',
    ],
    highlighted: false,
  },
];

export function catalogEntry(slug: string): PlanCatalogEntry | undefined {
  return PLAN_CATALOG.find((plan) => plan.slug === slug);
}
