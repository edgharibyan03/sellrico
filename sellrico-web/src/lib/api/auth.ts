import { apiRequest, setStoredToken } from "@/lib/api/client"
import type { AuthSession, User } from "@/lib/types"

/**
 * Dashboard auth always talks to the real Shoppio API.
 * Other dashboard domains may still use mocks until those endpoints exist.
 */
export async function signup(input: {
  name: string
  email: string
  password: string
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  })
  setStoredToken(session.accessToken)
  return session
}

export async function login(input: {
  email: string
  password: string
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
  setStoredToken(session.accessToken)
  return session
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<{ loggedOut: boolean }>("/auth/logout", { method: "POST" })
  } catch {
    // Still clear local session if the token is already invalid.
  } finally {
    setStoredToken(null)
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function getMe(): Promise<User> {
  return apiRequest<User>("/auth/me")
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const user = await apiRequest<User>("/auth/me")
    return {
      user,
      accessToken:
        typeof window !== "undefined"
          ? (window.localStorage.getItem("shoppio_access_token") ?? "")
          : "",
    }
  } catch {
    return null
  }
}
