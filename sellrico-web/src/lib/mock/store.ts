import type {
  ActivityItem,
  AssistantSettings,
  AuthSession,
  OverviewStats,
  Product,
  Site,
  Subscription,
  SyncProgress,
  UsageSummary,
  User,
} from "@/lib/types";
import type { BillingPlan } from "@/lib/types";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  user: "shoppio_mock_user",
  sites: "shoppio_mock_sites",
  assistant: "shoppio_mock_assistant",
  onboarding: "shoppio_mock_onboarding",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const defaultUser: User = {
  id: "user_demo",
  email: "alex@example.com",
  name: "Alex Merchant",
  createdAt: new Date().toISOString(),
  onboardingCompleted: false,
  onboardingStep: 0,
};

const demoProducts: Product[] = [
  {
    id: "prod_1",
    siteId: "site_1",
    name: "Nordic White Door 80cm",
    price: 349,
    currency: "USD",
    imageUrl: null,
    stockStatus: "in_stock",
    category: "Doors",
    syncStatus: "synced",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod_2",
    siteId: "site_1",
    name: "Compact Studio Door — Matte White",
    price: 429,
    currency: "USD",
    imageUrl: null,
    stockStatus: "in_stock",
    category: "Doors",
    syncStatus: "synced",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod_3",
    siteId: "site_1",
    name: "Space-Saver Sliding Door Kit",
    price: 489,
    currency: "USD",
    imageUrl: null,
    stockStatus: "on_backorder",
    category: "Doors",
    syncStatus: "synced",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod_4",
    siteId: "site_1",
    name: "Oak Handle Set — Satin Nickel",
    price: 59,
    currency: "USD",
    imageUrl: null,
    stockStatus: "in_stock",
    category: "Hardware",
    syncStatus: "pending",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod_5",
    siteId: "site_1",
    name: "Acoustic Interior Door Panel",
    price: 520,
    currency: "USD",
    imageUrl: null,
    stockStatus: "out_of_stock",
    category: "Doors",
    syncStatus: "error",
    updatedAt: new Date().toISOString(),
  },
];

function defaultSites(): Site[] {
  return [];
}

function defaultAssistant(siteId: string): AssistantSettings {
  return {
    siteId,
    name: "Shoppio Assistant",
    welcomeMessage:
      "Hi! Looking for something specific? I can help you find products.",
    language: "en",
    tone: "friendly",
    primaryColor: "#0F766E",
    suggestedQuestions: [
      "What do you recommend for a small apartment?",
      "Show me products under $100",
      "Do you have anything in white?",
    ],
    offsetRight: 20,
    offsetBottom: 20,
  };
}

export const mockStore = {
  async getSession(): Promise<AuthSession | null> {
    await delay(200);
    const user = readJson<User | null>(STORAGE_KEYS.user, null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("shoppio_access_token")
        : null;
    if (!user || !token) return null;
    return { user, accessToken: token };
  },

  async signup(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthSession> {
    await delay();
    void input.password;
    const user: User = {
      ...defaultUser,
      id: `user_${Date.now()}`,
      name: input.name,
      email: input.email,
      onboardingCompleted: false,
      onboardingStep: 1,
      createdAt: new Date().toISOString(),
    };
    const token = `mock_token_${Date.now()}`;
    writeJson(STORAGE_KEYS.user, user);
    writeJson(STORAGE_KEYS.sites, defaultSites());
    if (typeof window !== "undefined") {
      window.localStorage.setItem("shoppio_access_token", token);
    }
    return { user, accessToken: token };
  },

  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthSession> {
    await delay();
    void input.password;
    const existing = readJson<User | null>(STORAGE_KEYS.user, null);
    const user: User = existing ?? {
      ...defaultUser,
      email: input.email,
      name: input.email.split("@")[0] ?? "Merchant",
      onboardingCompleted: true,
      onboardingStep: 7,
    };
    if (!existing) {
      writeJson(STORAGE_KEYS.user, user);
      writeJson(STORAGE_KEYS.sites, [
        {
          id: "site_1",
          domain: "demo-store.example",
          name: "Demo WooCommerce Store",
          status: "ACTIVE",
          productCount: demoProducts.length,
          lastSyncedAt: new Date().toISOString(),
          connectionStatus: "connected",
          planId: "pro",
          createdAt: new Date().toISOString(),
        },
      ] satisfies Site[]);
      writeJson(STORAGE_KEYS.assistant, defaultAssistant("site_1"));
    }
    const token = `mock_token_${Date.now()}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("shoppio_access_token", token);
    }
    writeJson(STORAGE_KEYS.user, user);
    return { user, accessToken: token };
  },

  async logout(): Promise<void> {
    await delay(150);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("shoppio_access_token");
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    await delay();
    return {
      message: `If an account exists for ${email}, you will receive reset instructions shortly.`,
    };
  },

  async getMe(): Promise<User> {
    await delay(200);
    const user = readJson<User | null>(STORAGE_KEYS.user, null);
    if (!user) throw new Error("Unauthorized");
    return user;
  },

  async updateMe(patch: Partial<Pick<User, "name" | "email">>): Promise<User> {
    await delay();
    const user = await this.getMe();
    const next = { ...user, ...patch };
    writeJson(STORAGE_KEYS.user, next);
    return next;
  },

  async updateOnboarding(step: number, completed = false): Promise<User> {
    await delay(150);
    const user = await this.getMe();
    const next = {
      ...user,
      onboardingStep: step,
      onboardingCompleted: completed || user.onboardingCompleted,
    };
    writeJson(STORAGE_KEYS.user, next);
    return next;
  },

  async listSites(): Promise<Site[]> {
    await delay();
    return readJson<Site[]>(STORAGE_KEYS.sites, []);
  },

  async getSite(id: string): Promise<Site> {
    await delay();
    const sites = await this.listSites();
    const site = sites.find((s) => s.id === id);
    if (!site) throw new Error("Site not found");
    return site;
  },

  async createSite(input: { domain: string; name?: string }): Promise<Site> {
    await delay();
    const sites = await this.listSites();
    const domain = input.domain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();
    const site: Site = {
      id: `site_${Date.now()}`,
      domain,
      name: input.name?.trim() || domain,
      status: "PENDING",
      productCount: 0,
      lastSyncedAt: null,
      connectionStatus: "idle",
      planId: "free",
      createdAt: new Date().toISOString(),
    };
    writeJson(STORAGE_KEYS.sites, [...sites, site]);
    writeJson(STORAGE_KEYS.assistant, defaultAssistant(site.id));
    return site;
  },

  async disconnectSite(id: string): Promise<void> {
    await delay();
    const sites = await this.listSites();
    writeJson(
      STORAGE_KEYS.sites,
      sites.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "DISCONNECTED" as const,
              connectionStatus: "idle" as const,
            }
          : s,
      ),
    );
  },

  async createConnectCode(siteId: string) {
    await delay();
    await this.getSite(siteId);
    const code = `SP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return {
      code,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      instructions: [
        "Install the Shoppio plugin in WordPress.",
        "Open Settings → Shoppio in wp-admin.",
        "Paste https://api.sellrico.com as the API URL and connect using the code shown here.",
        "Return to this page — we will confirm when the store is connected.",
      ],
    };
  },

  async pollConnection(siteId: string): Promise<Site> {
    await delay(800);
    const sites = await this.listSites();
    const idx = sites.findIndex((s) => s.id === siteId);
    if (idx < 0) throw new Error("Site not found");
    const current = sites[idx]!;
    if (current.connectionStatus === "connected") return current;

    const next: Site = {
      ...current,
      status: "ACTIVE",
      connectionStatus: "connected",
    };
    const updated = [...sites];
    updated[idx] = next;
    writeJson(STORAGE_KEYS.sites, updated);
    return next;
  },

  async getSyncProgress(siteId: string): Promise<SyncProgress> {
    await delay(500);
    const site = await this.getSite(siteId);
    if (site.productCount > 0) {
      return {
        status: "completed",
        productsSynced: site.productCount,
        productsTotal: site.productCount,
        message: "Products are up to date.",
      };
    }
    const total = demoProducts.length;
    const synced = Math.min(total, Math.floor(total * 0.7) + 1);
    const sites = await this.listSites();
    writeJson(
      STORAGE_KEYS.sites,
      sites.map((s) =>
        s.id === siteId
          ? {
              ...s,
              productCount: total,
              lastSyncedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
    return {
      status: synced >= total ? "completed" : "syncing",
      productsSynced: synced >= total ? total : synced,
      productsTotal: total,
      message: "Syncing your WooCommerce products...",
    };
  },

  async listProducts(params: {
    siteId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    await delay();
    const sites = await this.listSites();
    const siteId = params.siteId ?? sites[0]?.id;
    let items = siteId ? demoProducts.map((p) => ({ ...p, siteId })) : [];
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category?.toLowerCase().includes(q) ?? false),
      );
    }
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async getAssistant(siteId: string): Promise<AssistantSettings> {
    await delay();
    const stored = readJson<AssistantSettings | null>(
      STORAGE_KEYS.assistant,
      null,
    );
    if (stored && stored.siteId === siteId) return stored;
    return defaultAssistant(siteId);
  },

  async updateAssistant(
    siteId: string,
    patch: Partial<AssistantSettings>,
  ): Promise<AssistantSettings> {
    await delay();
    const current = await this.getAssistant(siteId);
    const next = { ...current, ...patch, siteId };
    writeJson(STORAGE_KEYS.assistant, next);
    return next;
  },

  async getPlans(): Promise<BillingPlan[]> {
    await delay();
    return [
      {
        id: "free",
        name: "Free",
        description: "Try Shoppio on a single WooCommerce store.",
        monthlyPrice: 0,
        annualPrice: null,
        annualBillingAvailable: false,
        currency: "USD",
        highlighted: false,
        features: [
          "1 WooCommerce site",
          "100 products",
          "100 AI messages / month",
        ],
        featureKeys: [
          "ai_product_search",
          "product_exclusions",
          "basic_conversation_history",
        ],
        limits: { sites: 1, products: 100, aiMessages: 100 },
        historyRetentionDays: 30,
      },
      {
        id: "pro",
        name: "Pro",
        description:
          "For growing stores that need more capacity and analytics.",
        monthlyPrice: 19,
        annualPrice: null,
        annualBillingAvailable: false,
        currency: "USD",
        highlighted: true,
        features: [
          "3 WooCommerce sites",
          "2,000 products",
          "2,000 AI messages / month",
        ],
        featureKeys: [
          "analytics",
          "remove_branding",
          "full_assistant_customization",
        ],
        limits: { sites: 3, products: 2000, aiMessages: 2000 },
        historyRetentionDays: 90,
      },
      {
        id: "business",
        name: "Business",
        description: "For multi-store teams with higher limits.",
        monthlyPrice: 49,
        annualPrice: null,
        annualBillingAvailable: false,
        currency: "USD",
        highlighted: false,
        features: [
          "10 WooCommerce sites",
          "10,000 products",
          "10,000 AI messages / month",
        ],
        featureKeys: [
          "analytics",
          "advanced_analytics",
          "remove_branding",
          "unlimited_history",
          "full_assistant_customization",
          "custom_branding",
        ],
        limits: { sites: 10, products: 10000, aiMessages: 10000 },
        historyRetentionDays: null,
      },
    ];
  },

  async getUsage(): Promise<UsageSummary> {
    await delay();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const sites = await this.listSites();
    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      metrics: [
        {
          key: "ai_messages",
          label: "AI messages",
          used: 1240,
          limit: 2000,
          unit: "messages",
        },
        {
          key: "products",
          label: "Synced products",
          used:
            sites.reduce((sum, s) => sum + s.productCount, 0) ||
            demoProducts.length,
          limit: 2000,
          unit: "products",
        },
        {
          key: "sites",
          label: "Connected sites",
          used: sites.filter((s) => s.connectionStatus === "connected").length,
          limit: 3,
          unit: "sites",
        },
      ],
    };
  },

  async getSubscription(): Promise<Subscription> {
    await delay();
    return {
      planId: "business",
      interval: "monthly",
      status: "active",
      price: 49,
      currency: "USD",
      renewsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      features: [
        "ai_product_search",
        "product_cards",
        "add_to_cart",
        "basic_assistant_customization",
        "custom_welcome_message",
        "product_exclusions",
        "basic_conversation_history",
        "full_assistant_customization",
        "custom_branding",
        "analytics",
        "extended_history",
        "remove_branding",
        "priority_support",
        "advanced_analytics",
        "unlimited_history",
      ],
      limits: {
        sites: 10,
        products: 10000,
        aiMessages: 10000,
        historyRetentionDays: null,
      },
      paymentPending: false,
      accessRestricted: false,
    };
  },

  async getOverview(): Promise<OverviewStats> {
    await delay();
    const user = await this.getMe();
    const sites = await this.listSites();
    const usage = await this.getUsage();
    const ai = usage.metrics.find((m) => m.key === "ai_messages");
    return {
      planId: "business",
      planName: "Business",
      priceMonthly: 49,
      currency: "USD",
      subscriptionStatus: "active",
      features: [
        "full_assistant_customization",
        "analytics",
        "advanced_analytics",
        "remove_branding",
      ],
      connectedSites: sites.filter((s) => s.connectionStatus === "connected")
        .length,
      sitesUsed: sites.length,
      sitesLimit: 10,
      productsLimit: 10000,
      aiMessagesUsed: ai?.used ?? 0,
      aiMessagesLimit: ai?.limit ?? null,
      productsSynced: sites.reduce((sum, s) => sum + s.productCount, 0),
      onboardingCompleted: user.onboardingCompleted,
    };
  },

  async getActivity(): Promise<ActivityItem[]> {
    await delay();
    const sites = await this.listSites();
    if (sites.length === 0) return [];
    return [
      {
        id: "act_1",
        type: "sync_completed",
        title: "Product sync completed",
        description: `${sites[0]?.domain ?? "Store"} synced successfully.`,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "act_2",
        type: "assistant_updated",
        title: "Assistant settings updated",
        description: "Welcome message and tone were saved.",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "act_3",
        type: "site_connected",
        title: "Store connected",
        description: `${sites[0]?.domain ?? "Store"} is connected to Shoppio.`,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },

  async checkout(planId: string): Promise<{ url: string }> {
    await delay();
    void planId;
    return { url: "/dashboard/billing?checkout=mock" };
  },

  async portal(): Promise<{ url: string }> {
    await delay();
    return { url: "/dashboard/billing?portal=mock" };
  },

  resetDemo() {
    if (typeof window === "undefined") return;
    Object.values(STORAGE_KEYS).forEach((key) =>
      window.localStorage.removeItem(key),
    );
    window.localStorage.removeItem("shoppio_access_token");
  },
};
