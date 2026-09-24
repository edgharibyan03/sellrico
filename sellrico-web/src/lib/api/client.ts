export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code = "UNKNOWN", status = 500) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

export function getUserFacingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "EMAIL_TAKEN" || error.status === 409) {
      if (error.code === "NOT_CONNECTED") {
        return "Store is not connected yet. Finish the plugin connection, then try again."
      }
      if (error.code === "EMAIL_TAKEN") {
        return "An account with this email already exists."
      }
      return error.message || "Conflict — please try again."
    }
    if (error.code === "INVALID_CREDENTIALS") {
      return "Invalid email or password."
    }
    if (error.status === 401) {
      return "Please sign in to continue."
    }
    if (error.status === 403) {
      return "You do not have permission to do that."
    }
    if (error.status === 404) {
      return "We could not find what you were looking for."
    }
    if (error.status >= 500) {
      return "Something went wrong on our side. Please try again."
    }
    return error.message || "Something went wrong. Please try again."
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return "Something went wrong. Please try again."
}

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

/** Opt-in mocks for unfinished domains (billing/assistant/usage). Default: real API. */
function isMockApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("shoppio_access_token")
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) {
    window.localStorage.setItem("shoppio_access_token", token)
  } else {
    window.localStorage.removeItem("shoppio_access_token")
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }

  const token = getStoredToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  })

  let payload: Envelope<T> | null = null
  try {
    payload = (await response.json()) as Envelope<T>
  } catch {
    throw new ApiError("Invalid response from server", "INVALID_RESPONSE", response.status)
  }

  if (!response.ok || !payload.success) {
    const code =
      payload && !payload.success ? payload.error.code : `HTTP_${response.status}`
    const message =
      payload && !payload.success
        ? payload.error.message
        : "Request failed"
    if (response.status === 401) {
      setStoredToken(null)
    }
    throw new ApiError(message, code, response.status)
  }

  return payload.data
}

export { isMockApiEnabled, getApiBaseUrl }
