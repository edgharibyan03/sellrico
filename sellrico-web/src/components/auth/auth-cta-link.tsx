"use client"

import Link from "next/link"
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
  guestLabel = "Get Started",
  loggedInLabel = "Go to dashboard",
  className,
  variant = "default",
  size = "default",
  onNavigate,
}: AuthCtaLinkProps) {
  const { loggedIn, dashboardHref } = useAuthGate()

  return (
    <Link
      href={loggedIn ? dashboardHref : guestHref}
      onClick={onNavigate}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {loggedIn ? loggedInLabel : guestLabel}
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
  /** Mobile sheet: stack buttons vertically */
  stacked?: boolean
}) {
  const { loggedIn, dashboardHref } = useAuthGate()

  if (loggedIn) {
    return (
      <div className={cn(stacked ? "flex flex-col gap-3" : "flex items-center gap-2", className)}>
        <Link
          href={dashboardHref}
          onClick={onNavigate}
          className={buttonVariants({ className: stacked ? "mt-2" : undefined })}
        >
          Go to dashboard
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
            Get Started
          </Link>
          <Link
            href="/login"
            onClick={onNavigate}
            className={buttonVariants({ variant: "outline" })}
          >
            Log in
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/login"
            onClick={onNavigate}
            className={buttonVariants({ variant: "ghost" })}
          >
            Log in
          </Link>
          <Link href="/signup" onClick={onNavigate} className={buttonVariants()}>
            Get Started
          </Link>
        </>
      )}
    </div>
  )
}
