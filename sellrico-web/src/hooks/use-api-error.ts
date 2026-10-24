"use client"

import { useTranslations } from "next-intl"
import { ApiError, getUserFacingError } from "@/lib/api/client"

export function useApiError() {
  const t = useTranslations("errors")

  return function mapApiError(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === "NOT_CONNECTED") {
        return t("notConnected")
      }
      if (error.code === "EMAIL_TAKEN") {
        return t("emailTaken")
      }
      if (error.code === "INVALID_CREDENTIALS") {
        return t("invalidCredentials")
      }
      if (
        error.code === "AI_MESSAGE_LIMIT_REACHED" ||
        error.code === "SITE_LIMIT_REACHED" ||
        error.code === "PRODUCT_LIMIT_REACHED" ||
        error.code === "BILLING_PROVIDER_NOT_CONFIGURED" ||
        error.code === "ANNUAL_BILLING_UNAVAILABLE" ||
        error.upgradeRequired
      ) {
        return error.message
      }
      if (error.status === 401) {
        return t("signInRequired")
      }
      if (error.status === 403) {
        return t("permissionDenied")
      }
      if (error.status === 404) {
        return t("notFound")
      }
      if (error.status >= 500) {
        return t("serverError")
      }
      if (error.status === 409) {
        return error.message || t("conflict")
      }
      return error.message || t("generic")
    }

    const fallback = getUserFacingError(error)
    const known: Record<string, Parameters<typeof t>[0]> = {
      "Invalid email or password.": "invalidCredentials",
      "An account with this email already exists.": "emailTaken",
      "Please sign in to continue.": "signInRequired",
      "You do not have permission to do that.": "permissionDenied",
      "We could not find what you were looking for.": "notFound",
      "Something went wrong on our side. Please try again.": "serverError",
      "Something went wrong. Please try again.": "generic",
      "Store is not connected yet. Finish the plugin connection, then try again.":
        "notConnected",
      "Conflict — please try again.": "conflict",
    }
    const key = known[fallback]
    if (key) return t(key)
    if (fallback === "Something went wrong. Please try again.") {
      return t("somethingWentWrong")
    }
    return fallback || t("generic")
  }
}
