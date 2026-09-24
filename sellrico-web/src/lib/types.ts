export type PlanId = "free" | "pro" | "business"

export type BillingInterval = "monthly" | "annual"

export type SiteStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISCONNECTED"

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error"

export type SyncStatus = "idle" | "syncing" | "completed" | "error"

export type StockStatus = "in_stock" | "out_of_stock" | "on_backorder"

export type ProductSyncState = "synced" | "pending" | "error"

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"

export type AssistantTone = "friendly" | "professional" | "concise" | "enthusiastic"

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  onboardingCompleted: boolean
  onboardingStep: number
}

export interface Site {
  id: string
  domain: string
  name: string
  status: SiteStatus
  productCount: number
  lastSyncedAt: string | null
  connectionStatus: ConnectionStatus
  planId: PlanId
  createdAt: string
}

export interface Product {
  id: string
  siteId: string
  name: string
  price: number | null
  currency: string
  imageUrl: string | null
  stockStatus: StockStatus
  category: string | null
  syncStatus: ProductSyncState
  updatedAt: string
  url?: string | null
}

export interface AssistantSettings {
  siteId: string
  name: string
  welcomeMessage: string
  language: string
  tone: AssistantTone
  primaryColor: string
  suggestedQuestions: string[]
}

export interface UsageMetric {
  key: string
  label: string
  used: number
  limit: number | null
  unit: string
}

export interface UsageSummary {
  periodStart: string
  periodEnd: string
  metrics: UsageMetric[]
}

export interface BillingPlan {
  id: PlanId
  name: string
  description: string
  monthlyPrice: number | null
  annualPrice: number | null
  currency: string
  features: string[]
  limits: {
    sites: number | null
    products: number | null
    aiMessages: number | null
  }
  highlighted?: boolean
}

export interface Subscription {
  planId: PlanId
  interval: BillingInterval
  status: SubscriptionStatus
  price: number | null
  currency: string
  renewsAt: string | null
  cancelAtPeriodEnd: boolean
}

export interface ActivityItem {
  id: string
  type:
    | "site_connected"
    | "sync_completed"
    | "assistant_updated"
    | "usage_alert"
    | "chat_message"
  title: string
  description: string
  createdAt: string
}

export interface OverviewStats {
  planId: PlanId
  connectedSites: number
  aiMessagesUsed: number
  aiMessagesLimit: number | null
  productsSynced: number
  onboardingCompleted: boolean
  conversationsOpen?: number
  chatMessagesToday?: number
}

export interface SyncProgress {
  status: SyncStatus
  productsSynced: number
  productsTotal: number
  message: string
  error?: string | null
}

export interface ConnectCodeResponse {
  code: string
  expiresAt: string
  instructions: string[]
}

export interface AuthSession {
  user: User
  accessToken: string
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
