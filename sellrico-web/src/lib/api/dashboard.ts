import { apiRequest, isMockApiEnabled } from "@/lib/api/client"
import { mockStore } from "@/lib/mock/store"
import type { ActivityItem, OverviewStats, User } from "@/lib/types"

/** Always hits the real API — overview is account-scoped JWT data. */
export async function getOverview(): Promise<OverviewStats> {
  return apiRequest<OverviewStats>("/dashboard/overview")
}

/** Always hits the real API. */
export async function getActivity(): Promise<ActivityItem[]> {
  return apiRequest<ActivityItem[]>("/dashboard/activity")
}

export async function updateProfile(
  patch: Partial<Pick<User, "name" | "email">>,
): Promise<User> {
  if (isMockApiEnabled()) return mockStore.updateMe(patch)
  return apiRequest<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

/** Always hits the real API — onboarding is tied to the authenticated user. */
export async function updateOnboarding(
  step: number,
  completed = false,
): Promise<User> {
  return apiRequest<User>("/users/me/onboarding", {
    method: "PATCH",
    body: JSON.stringify({ step, completed }),
  })
}

export async function changePassword(_input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (isMockApiEnabled()) {
    await new Promise((r) => setTimeout(r, 400))
    return
  }
  await apiRequest<void>("/users/me/password", {
    method: "POST",
    body: JSON.stringify(_input),
  })
}

export async function deleteAccount(): Promise<void> {
  if (isMockApiEnabled()) {
    mockStore.resetDemo()
    return
  }
  await apiRequest<void>("/users/me", { method: "DELETE" })
}
