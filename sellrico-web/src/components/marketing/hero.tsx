"use client"

import { useTranslations } from "next-intl"
import { AuthCtaLink } from "@/components/auth/auth-cta-link"
import { Link } from "@/i18n/navigation"
import { buttonVariants } from "@/components/ui/button"
import { brand } from "@/lib/config/brand"

export function HeroSection() {
  const t = useTranslations("marketing.hero")
  const tc = useTranslations("common")

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 shoppio-grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brand-teal)_12%,transparent),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex max-w-2xl flex-col gap-5">
          <h1 className="font-[family-name:var(--font-heading)] text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            {t("title", { name: brand.name })}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            {t("tagline")}
          </p>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {t("body", { product: brand.product })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AuthCtaLink size="lg" />
          <Link
            href="/#demo"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {tc("seeHowItWorks")}
          </Link>
        </div>
      </div>
    </section>
  )
}
