"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { buttonVariants } from "@/components/ui/button"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { cn } from "@/lib/utils"

type AuthCtaLinkProps = {
  guestHref?: string
  guestLabel?: string
  loggedInLabel?: string
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  onNavigate?: () => void
}

export function AuthCtaLink({
  guestHref = "/signup",
  guestLabel,
  loggedInLabel,
  className,
  variant = "default",
  size = "default",
  onNavigate,
}: AuthCtaLinkProps) {
  const t = useTranslations("common")
  const { loggedIn, dashboardHref } = useAuthGate()
  const guest = guestLabel ?? t("getStarted")
  const loggedInText = loggedInLabel ?? t("goToDashboard")

  return (
    <Link
      href={loggedIn ? dashboardHref : guestHref}
      onClick={onNavigate}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {loggedIn ? loggedInText : guest}
    </Link>
  )
}

export function MarketingAuthActions({
  onNavigate,
  className,
  stacked = false,
}: {
  onNavigate?: () => void
  className?: string
  stacked?: boolean
}) {
  const t = useTranslations("common")
  const { loggedIn, dashboardHref } = useAuthGate()

  if (loggedIn) {
    return (
      <div className={cn(stacked ? "flex flex-col gap-3" : "flex items-center gap-2", className)}>
        <Link
          href={dashboardHref}
          onClick={onNavigate}
          className={buttonVariants({ className: stacked ? "mt-2" : undefined })}
        >
          {t("goToDashboard")}
        </Link>
      </div>
    )
  }

  return (
    <div className={cn(stacked ? "flex flex-col gap-3" : "flex items-center gap-2", className)}>
      {stacked ? (
        <>
          <Link
            href="/signup"
            onClick={onNavigate}
            className={buttonVariants({ className: "mt-2" })}
          >
            {t("getStarted")}
          </Link>
          <Link
            href="/login"
            onClick={onNavigate}
            className={buttonVariants({ variant: "outline" })}
          >
            {t("logIn")}
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/login"
            onClick={onNavigate}
            className={buttonVariants({ variant: "ghost" })}
          >
            {t("logIn")}
          </Link>
          <Link href="/signup" onClick={onNavigate} className={buttonVariants()}>
            {t("getStarted")}
          </Link>
        </>
      )}
    </div>
  )
}
