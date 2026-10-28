"use client"

import { usePathname } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { Menu } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { MarketingAuthActions } from "@/components/auth/auth-cta-link"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { cn } from "@/lib/utils"

export function MarketingHeader() {
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const links = [
    { href: "/#how-it-works", label: t("howItWorks") },
    { href: "/pricing", label: t("pricing") },
    { href: "/docs", label: t("docs") },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          <MarketingAuthActions />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "md:hidden")}
            aria-label={tc("openMenu")}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>{tc("navigation")}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
              <MarketingAuthActions
                stacked
                onNavigate={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

function FooterAccountLinks() {
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const { loggedIn, dashboardHref } = useAuthGate()

  if (loggedIn) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-medium">{t("account")}</p>
        <Link
          href={dashboardHref}
          className="text-muted-foreground hover:text-foreground"
        >
          {tc("goToDashboard")}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">{t("account")}</p>
      <Link href="/login" className="text-muted-foreground hover:text-foreground">
        {tc("logIn")}
      </Link>
      <Link href="/signup" className="text-muted-foreground hover:text-foreground">
        {tc("signUp")}
      </Link>
    </div>
  )
}

export function MarketingFooter() {
  const t = useTranslations("nav")

  return (
    <footer className="border-t border-border bg-brand-mist">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("footerTagline")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="font-medium">{t("product")}</p>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              {t("pricing")}
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground">
              {t("docs")}
            </Link>
          </div>
          <FooterAccountLinks />
          <div className="flex flex-col gap-2">
            <p className="font-medium">{t("legal")}</p>
            <span className="text-muted-foreground">{t("privacySoon")}</span>
            <span className="text-muted-foreground">{t("termsSoon")}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Sellrico
        </div>
      </div>
    </footer>
  )
}
