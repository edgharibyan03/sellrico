"use client"

import { useEffect, useState } from "react"
import { getSession } from "@/lib/api/auth"

export type AuthGateStatus = "loading" | "guest" | "user"

export function useAuthGate() {
  const [status, setStatus] = useState<AuthGateStatus>("loading")
  const [dashboardHref, setDashboardHref] = useState("/dashboard")

  useEffect(() => {
    let cancelled = false

    async function check() {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("shoppio_access_token")
          : null

      if (!token) {
        if (!cancelled) setStatus("guest")
        return
      }

      const session = await getSession()
      if (cancelled) return

      if (!session) {
        setStatus("guest")
        return
      }

      setDashboardHref(
        session.user.onboardingCompleted ? "/dashboard" : "/onboarding",
      )
      setStatus("user")
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    status,
    dashboardHref,
    loggedIn: status === "user",
  }
}
