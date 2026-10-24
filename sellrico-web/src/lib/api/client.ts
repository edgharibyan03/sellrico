export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly upgradeRequired: boolean;
  readonly limit?: number;
  readonly used?: number;
  readonly plan?: string;

  constructor(
    message: string,
    code = "UNKNOWN",
    status = 500,
    extras?: {
      upgradeRequired?: boolean;
      limit?: number;
      used?: number;
      plan?: string;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.upgradeRequired = extras?.upgradeRequired ?? false;
    this.limit = extras?.limit;
    this.used = extras?.used;
    this.plan = extras?.plan;
  }
}

export function getUserFacingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "EMAIL_TAKEN" || error.status === 409) {
      if (error.code === "NOT_CONNECTED") {
        return "Store is not connected yet. Finish the plugin connection, then try again.";
      }
      if (error.code === "EMAIL_TAKEN") {
        return "An account with this email already exists.";
      }
      return error.message || "Conflict — please try again.";
    }
    if (error.code === "INVALID_CREDENTIALS") {
      return "Invalid email or password.";
    }
    if (
      error.code === "AI_MESSAGE_LIMIT_REACHED" ||
      error.code === "SITE_LIMIT_REACHED" ||
      error.code === "PRODUCT_LIMIT_REACHED" ||
      error.code === "BILLING_PROVIDER_NOT_CONFIGURED" ||
      error.code === "ANNUAL_BILLING_UNAVAILABLE" ||
      error.upgradeRequired
    ) {
      return error.message;
    }
    if (error.status === 401) {
      return "Please sign in to continue.";
    }
    if (error.status === 403) {
      return "You do not have permission to do that.";
    }
    if (error.status === 404) {
      return "We could not find what you were looking for.";
    }
    if (error.status >= 500) {
      return "Something went wrong on our side. Please try again.";
    }
    return error.message || "Something went wrong. Please try again.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

type Envelope<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        upgradeRequired?: boolean;
        limit?: number;
        used?: number;
        plan?: string;
      };
    };

/** Opt-in mocks for unfinished domains (billing/assistant/usage). Default: real API. */
function isMockApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "https://api.sellrico.com/api/v1";
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("shoppio_access_token");
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("shoppio_access_token", token);
  } else {
    window.localStorage.removeItem("shoppio_access_token");
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(
      "Invalid response from server",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!response.ok || !payload.success) {
    const code =
      payload && !payload.success
        ? payload.error.code
        : `HTTP_${response.status}`;
    const message =
      payload && !payload.success ? payload.error.message : "Request failed";
    const errorBody = payload && !payload.success ? payload.error : undefined;
    if (response.status === 401) {
      setStoredToken(null);
    }
    throw new ApiError(message, code, response.status, {
      upgradeRequired: errorBody?.upgradeRequired,
      limit: errorBody?.limit,
      used: errorBody?.used,
      plan: errorBody?.plan,
    });
  }

  return payload.data;
}

export { isMockApiEnabled, getApiBaseUrl };
