export type PlanId = "free" | "pro" | "business";

export type BillingInterval = "monthly" | "annual";

export type SiteStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISCONNECTED";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export type SyncStatus = "idle" | "syncing" | "completed" | "error";

export type StockStatus = "in_stock" | "out_of_stock" | "on_backorder";

export type ProductSyncState = "synced" | "pending" | "error";

export type SubscriptionStatus =
  "active" | "trialing" | "past_due" | "canceled" | "expired" | "incomplete";

export type AssistantTone =
  "friendly" | "professional" | "concise" | "enthusiastic";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

export interface Site {
  id: string;
  domain: string;
  name: string;
  status: SiteStatus;
  productCount: number;
  lastSyncedAt: string | null;
  connectionStatus: ConnectionStatus;
  planId: PlanId;
  createdAt: string;
}

export interface Product {
  id: string;
  siteId: string;
  name: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  stockStatus: StockStatus;
  category: string | null;
  syncStatus: ProductSyncState;
  updatedAt: string;
  url?: string | null;
}

export type AssistantIndustry = "auto" | "generic" | "doors";

export interface AssistantSettings {
  siteId: string;
  name: string;
  welcomeMessage: string;
  language: string;
  tone: AssistantTone;
  primaryColor: string;
  suggestedQuestions: string[];
  /** Chat launcher offset from the right edge, in px. */
  offsetRight: number;
  /** Chat launcher offset from the bottom edge, in px. */
  offsetBottom: number;
  /** Search/AI vertical profile. */
  industry?: AssistantIndustry;
  /** Extra merchant instructions for the AI system prompt. */
  customInstructions?: string;
}

export interface UsageMetric {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  unit: string;
}

export interface UsageSummary {
  periodStart: string;
  periodEnd: string;
  planId?: PlanId;
  planName?: string;
  priceMonthly?: number;
  status?: SubscriptionStatus;
  features?: string[];
  paymentPending?: boolean;
  accessRestricted?: boolean;
  overLimit?: {
    sites: boolean;
    products: boolean;
    aiMessages: boolean;
  };
  metrics: UsageMetric[];
}

export interface BillingPlan {
  id: PlanId;
  slug?: PlanId;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  annualBillingAvailable?: boolean;
  currency: string;
  features: string[];
  featureKeys?: string[];
  limits: {
    sites: number | null;
    products: number | null;
    aiMessages: number | null;
  };
  historyRetentionDays?: number | null;
  highlighted?: boolean;
}

export interface Subscription {
  planId: PlanId;
  storedPlanId?: PlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  price: number | null;
  currency: string;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  provider?: string;
  paymentPending?: boolean;
  accessRestricted?: boolean;
  features?: string[];
  limits?: {
    sites: number;
    products: number;
    aiMessages: number;
    historyRetentionDays: number | null;
  };
  usage?: {
    sites: number;
    products: number;
    aiMessages: number;
  };
  remaining?: {
    sites: number;
    products: number;
    aiMessages: number;
  };
  overLimit?: {
    sites: boolean;
    products: boolean;
    aiMessages: boolean;
  };
  periodStart?: string;
  periodEnd?: string;
  annualBillingAvailable?: boolean;
}

export interface ActivityItem {
  id: string;
  type:
    | "site_connected"
    | "sync_completed"
    | "assistant_updated"
    | "usage_alert"
    | "chat_message";
  title: string;
  description: string;
  createdAt: string;
}

export interface OverviewStats {
  planId: PlanId;
  planName?: string;
  priceMonthly?: number;
  currency?: string;
  subscriptionStatus?: SubscriptionStatus;
  paymentPending?: boolean;
  accessRestricted?: boolean;
  features?: string[];
  connectedSites: number;
  sitesUsed?: number;
  sitesLimit?: number | null;
  aiMessagesUsed: number;
  aiMessagesLimit: number | null;
  productsSynced: number;
  productsLimit?: number | null;
  overLimit?: {
    sites: boolean;
    products: boolean;
    aiMessages: boolean;
  };
  onboardingCompleted: boolean;
  conversationsOpen?: number;
  chatMessagesToday?: number;
}

export interface SyncProgress {
  status: SyncStatus;
  productsSynced: number;
  productsTotal: number;
  message: string;
  error?: string | null;
}

export interface ConnectCodeResponse {
  code: string;
  expiresAt: string;
  instructions: string[];
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
